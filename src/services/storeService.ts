import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  limit,
  Timestamp,
  runTransaction
} from "firebase/firestore";
import { db, storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface Device {
  id: string;
  storeId: string;
  name: string;
  type: "ps5" | "xbox" | "pc" | "vr" | "other";
  rateSingle: number;
  rateMulti: number;
  status: "available" | "occupied" | "maintenance";
  currentSessionId: string | null;
}

export interface SessionItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

export interface PlaySession {
  id: string;
  storeId: string;
  deviceId: string;
  deviceName: string;
  customerName: string;
  phoneNumber?: string;
  type: "open" | "preset";
  players: 1 | 2;
  presetDuration: number;
  startTime: Timestamp;
  endTime: Timestamp | null;
  status: "active" | "paused" | "completed";
  pausedTime: Timestamp | null;
  totalPausedDuration: number;
  items: SessionItem[];
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  imageUrl?: string;
}

export interface Transaction {
  id: string;
  storeId: string;
  type: "session" | "pos";
  deviceId: string;
  deviceName: string;
  customerName: string;
  phoneNumber?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  elapsedMinutes: number;
  timeCost: number;
  itemsCost: number;
  totalCost: number;
  discount: number;
  finalAmount: number;
  paymentMethod: "cash" | "card" | "wallet";
  timestamp: Timestamp;
  items: SessionItem[];
}

// ─────────────────────────────────────────────
// REAL-TIME SUBSCRIPTIONS
// ─────────────────────────────────────────────

export function subscribeDevices(
  storeId: string,
  callback: (devices: Device[]) => void
) {
  const q = query(
    collection(db, "devices"),
    where("storeId", "==", storeId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Device[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Device));
      callback(list);
    },
    (err) => console.error("subscribeDevices error:", err)
  );
}

export function subscribeProducts(
  storeId: string,
  callback: (products: Product[]) => void
) {
  const q = query(
    collection(db, "products"),
    where("storeId", "==", storeId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Product));
      callback(list);
    },
    (err) => console.error("subscribeProducts error:", err)
  );
}

export function subscribeSessions(
  storeId: string,
  callback: (sessions: PlaySession[]) => void
) {
  const q = query(
    collection(db, "sessions"),
    where("storeId", "==", storeId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: PlaySession[] = [];
      snapshot.forEach((d) => {
        const s = { id: d.id, ...d.data() } as PlaySession;
        if (s.status === "active" || s.status === "paused") list.push(s);
      });
      callback(list);
    },
    (err) => console.error("subscribeSessions error:", err)
  );
}

export function subscribeTransactions(
  storeId: string,
  callback: (transactions: Transaction[]) => void
) {
  const q = query(
    collection(db, "transactions"),
    where("storeId", "==", storeId),
    limit(300)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((d) =>
        list.push({ id: d.id, ...d.data() } as Transaction)
      );
      list.sort((a, b) => {
        const aMs = a.timestamp?.toMillis?.() ?? 0;
        const bMs = b.timestamp?.toMillis?.() ?? 0;
        return bMs - aMs;
      });
      callback(list);
    },
    (err) => console.error("subscribeTransactions error:", err)
  );
}

// ─────────────────────────────────────────────
// DEVICES
// ─────────────────────────────────────────────

export async function addDevice(
  storeId: string,
  data: Omit<Device, "id" | "storeId" | "currentSessionId" | "status">
) {
  console.log("[addDevice] Starting addDevice to Firestore...", { storeId, data });
  return addDoc(collection(db, "devices"), {
    ...data,
    storeId,
    status: "available",
    currentSessionId: null,
  });
}

export async function updateDevice(
  deviceId: string,
  data: Partial<Omit<Device, "id" | "storeId">>
) {
  console.log("[updateDevice] Starting updateDevice in Firestore...", { deviceId, data });
  return updateDoc(doc(db, "devices", deviceId), data);
}

export async function deleteDevice(deviceId: string) {
  console.log("[deleteDevice] Deleting device...", { deviceId });
  return deleteDoc(doc(db, "devices", deviceId));
}

// ─────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────

export async function addProduct(
  storeId: string,
  data: Omit<Product, "id" | "storeId">
) {
  console.log("[addProduct] Starting addProduct to Firestore...", { storeId, data });
  try {
    const sanitizedData = {
      name: data.name || "",
      price: Number(data.price) || 0,
      cost: Number(data.cost) || 0,
      stock: Number(data.stock) || 0,
      minStock: Number(data.minStock) || 0,
      imageUrl: data.imageUrl || "", // Prevent undefined
      storeId
    };
    console.log("[addProduct] Sanitized product payload:", sanitizedData);
    const docRef = await addDoc(collection(db, "products"), sanitizedData);
    console.log("[addProduct] Product added successfully with ID:", docRef.id);
    return docRef;
  } catch (error) {
    console.error("[addProduct] Error in addProduct Firestore query:", error);
    throw error;
  }
}

export async function updateProduct(
  productId: string,
  data: Partial<Omit<Product, "id" | "storeId">>
) {
  console.log("[updateProduct] Starting updateProduct in Firestore...", { productId, data });
  try {
    const sanitizedData: any = {};
    if (data.name !== undefined) sanitizedData.name = data.name;
    if (data.price !== undefined) sanitizedData.price = Number(data.price) || 0;
    if (data.cost !== undefined) sanitizedData.cost = Number(data.cost) || 0;
    if (data.stock !== undefined) sanitizedData.stock = Number(data.stock) || 0;
    if (data.minStock !== undefined) sanitizedData.minStock = Number(data.minStock) || 0;
    sanitizedData.imageUrl = data.imageUrl || ""; // Prevent undefined completely
    
    console.log("[updateProduct] Sanitized product payload:", sanitizedData);
    await updateDoc(doc(db, "products", productId), sanitizedData);
    console.log("[updateProduct] Product updated successfully.");
  } catch (error) {
    console.error("[updateProduct] Error in updateProduct Firestore query:", error);
    throw error;
  }
}

export async function deleteProduct(productId: string) {
  console.log("[deleteProduct] Deleting product...", { productId });
  return deleteDoc(doc(db, "products", productId));
}

// Upload a product image to Firebase Storage
export async function uploadProductImage(
  file: File,
  storeId: string
): Promise<string> {
  console.log("[uploadProductImage] Starting image upload flow...", {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    storeId
  });

  try {
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const storagePath = `product-images/${storeId}/${fileName}`;
    console.log("[uploadProductImage] Storage destination ref path:", storagePath);
    
    const storageRef = ref(storage, storagePath);
    console.log("[uploadProductImage] Reference created. Calling uploadBytes...");
    
    const snap = await uploadBytes(storageRef, file);
    console.log("[uploadProductImage] uploadBytes call successfully resolved. snap:", snap);
    
    console.log("[uploadProductImage] Calling getDownloadURL...");
    const url = await getDownloadURL(snap.ref);
    console.log("[uploadProductImage] getDownloadURL resolved. URL:", url);
    
    if (!url) {
      throw new Error("getDownloadURL returned an empty or invalid URL");
    }
    return url;
  } catch (error: any) {
    console.error("[uploadProductImage] Error caught during image upload process:", error);
    throw new Error(error?.message || "Failed to upload image. Check storage rules or network.");
  }
}

// Upload a profile photo to Firebase Storage
export async function uploadProfilePhoto(
  file: File,
  uid: string
): Promise<string> {
  console.log("[uploadProfilePhoto] Starting profile photo upload...", { fileName: file.name, uid });
  try {
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const storageRef = ref(storage, `profile-photos/${uid}/${fileName}`);
    const snap = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snap.ref);
    return url;
  } catch (error) {
    console.error("[uploadProfilePhoto] Error during upload:", error);
    throw error;
  }
}

// Update Firestore user document
export async function updateUserProfileData(
  uid: string,
  data: { displayName?: string; photoURL?: string }
) {
  console.log("[updateUserProfileData] Updating profile data...", { uid, data });
  return updateDoc(doc(db, "users", uid), data);
}

// ─────────────────────────────────────────────
// SESSION ACTIONS
// ─────────────────────────────────────────────

export async function startSession(
  storeId: string,
  deviceId: string,
  deviceName: string,
  data: {
    customerName: string;
    phoneNumber?: string;
    type: "open" | "preset";
    players: 1 | 2;
    presetDuration: number;
  }
) {
  console.log("[startSession] Initiating startSession transaction...", { deviceId, deviceName, data });
  await runTransaction(db, async (tx) => {
    const deviceRef = doc(db, "devices", deviceId);
    const deviceSnap = await tx.get(deviceRef);
    if (!deviceSnap.exists()) throw new Error("الجهاز غير موجود");
    const deviceData = deviceSnap.data() as Device;
    if (deviceData.status !== "available")
      throw new Error("الجهاز غير متاح حالياً");

    const sessionRef = doc(collection(db, "sessions"));
    const newSession: Omit<PlaySession, "id"> = {
      storeId: storeId || "",
      deviceId: deviceId || "",
      deviceName: deviceName || "",
      customerName: data.customerName || "زبون",
      phoneNumber: data.phoneNumber || "",
      type: data.type || "open",
      players: data.players || 1,
      presetDuration: Number(data.presetDuration) || 0,
      startTime: Timestamp.now(),
      endTime: null,
      status: "active",
      pausedTime: null,
      totalPausedDuration: 0,
      items: [],
    };
    tx.set(sessionRef, newSession);
    tx.update(deviceRef, { status: "occupied", currentSessionId: sessionRef.id });
  });
}

export async function addItemsToSession(
  sessionId: string,
  items: SessionItem[]
) {
  console.log("[addItemsToSession] Initiating addItemsToSession transaction...", { sessionId, items });
  await runTransaction(db, async (tx) => {
    const sessionRef = doc(db, "sessions", sessionId);
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists()) throw new Error("الجلسة غير موجودة");
    const sessionData = sessionSnap.data() as PlaySession;
    const currentItems = [...(sessionData.items || [])];

    for (const newItem of items) {
      const productRef = doc(db, "products", newItem.productId);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists())
        throw new Error(`المنتج "${newItem.name}" غير موجود`);
      const productData = productSnap.data() as Product;
      if (productData.stock < newItem.quantity)
        throw new Error(
          `المخزون غير كافٍ لـ "${newItem.name}". المتوفر: ${productData.stock}`
        );

      const idx = currentItems.findIndex(
        (i) => i.productId === newItem.productId
      );
      
      const sanitizedItem = {
        productId: newItem.productId || "",
        name: newItem.name || "",
        quantity: Number(newItem.quantity) || 0,
        price: Number(newItem.price) || 0,
        imageUrl: newItem.imageUrl || "" // Avoid undefined
      };

      if (idx > -1) {
        currentItems[idx].quantity += newItem.quantity;
        currentItems[idx].imageUrl = currentItems[idx].imageUrl || "";
      } else {
        currentItems.push(sanitizedItem);
      }
      tx.update(productRef, { stock: productData.stock - newItem.quantity });
    }
    console.log("[addItemsToSession] Updating items list to Firestore:", currentItems);
    tx.update(sessionRef, { items: currentItems });
  });
}

export async function pauseSession(sessionId: string) {
  console.log("[pauseSession] Pausing session...", { sessionId });
  return updateDoc(doc(db, "sessions", sessionId), {
    status: "paused",
    pausedTime: Timestamp.now(),
  });
}

export async function resumeSession(sessionId: string) {
  console.log("[resumeSession] Resuming session...", { sessionId });
  await runTransaction(db, async (tx) => {
    const sessionRef = doc(db, "sessions", sessionId);
    const snap = await tx.get(sessionRef);
    if (!snap.exists()) throw new Error("الجلسة غير موجودة");
    const sessionData = snap.data() as PlaySession;
    if (sessionData.status !== "paused" || !sessionData.pausedTime)
      throw new Error("الجلسة ليست في وضع الإيقاف");
    const now = Timestamp.now();
    const diffMs = now.toMillis() - sessionData.pausedTime.toMillis();
    tx.update(sessionRef, {
      status: "active",
      pausedTime: null,
      totalPausedDuration: (sessionData.totalPausedDuration || 0) + diffMs,
    });
  });
}

export async function switchDevice(
  sessionId: string,
  oldDeviceId: string,
  newDeviceId: string
) {
  console.log("[switchDevice] Switching devices in active session...", { sessionId, oldDeviceId, newDeviceId });
  await runTransaction(db, async (tx) => {
    const oldDevRef = doc(db, "devices", oldDeviceId);
    const newDevRef = doc(db, "devices", newDeviceId);
    const sessionRef = doc(db, "sessions", sessionId);

    const newDevSnap = await tx.get(newDevRef);
    if (!newDevSnap.exists()) throw new Error("الجهاز المستهدف غير موجود");
    const newDevData = newDevSnap.data() as Device;
    if (newDevData.status !== "available")
      throw new Error("الجهاز المستهدف غير متاح");

    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists()) throw new Error("الجلسة غير موجودة");

    tx.update(oldDevRef, { status: "available", currentSessionId: null });
    tx.update(newDevRef, {
      status: "occupied",
      currentSessionId: sessionId,
    });
    tx.update(sessionRef, {
      deviceId: newDeviceId,
      deviceName: newDevData.name || "",
    });
  });
}

export async function checkoutSession(
  storeId: string,
  sessionId: string,
  data: {
    deviceId: string;
    deviceName: string;
    customerName: string;
    phoneNumber?: string;
    startTime: Timestamp;
    endTime: Timestamp;
    elapsedMinutes: number;
    timeCost: number;
    itemsCost: number;
    totalCost: number;
    discount: number;
    finalAmount: number;
    paymentMethod: "cash" | "card" | "wallet";
  }
) {
  console.log("[checkoutSession] Starting checkout session transaction...", { storeId, sessionId, data });
  await runTransaction(db, async (tx) => {
    const devRef = doc(db, "devices", data.deviceId);
    const sessionRef = doc(db, "sessions", sessionId);
    const txRef = doc(collection(db, "transactions"));

    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists()) throw new Error("الجلسة غير موجودة");
    const sessionData = sessionSnap.data() as PlaySession;

    tx.update(devRef, { status: "available", currentSessionId: null });
    tx.update(sessionRef, { status: "completed", endTime: data.endTime });

    // Defensive Sanitization: Ensure no fields are undefined or invalid
    const receipt: Omit<Transaction, "id"> = {
      storeId: storeId || "",
      type: "session",
      deviceId: data.deviceId || "",
      deviceName: data.deviceName || "",
      customerName: data.customerName || "زبون",
      phoneNumber: data.phoneNumber || sessionData.phoneNumber || "",
      startTime: data.startTime || sessionData.startTime || Timestamp.now(),
      endTime: data.endTime || Timestamp.now(),
      elapsedMinutes: Number(data.elapsedMinutes) || 0,
      timeCost: Number(data.timeCost) || 0,
      itemsCost: Number(data.itemsCost) || 0,
      totalCost: Number(data.totalCost) || 0,
      discount: Number(data.discount) || 0,
      finalAmount: Number(data.finalAmount) || 0,
      paymentMethod: data.paymentMethod || "cash",
      timestamp: Timestamp.now(),
      items: (sessionData.items || []).map(item => ({
        productId: item.productId || "",
        name: item.name || "",
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        imageUrl: item.imageUrl || "" // Prevent undefined
      })),
    };

    console.log("[checkoutSession] Final transaction receipt layout for Firestore tx.set:", receipt);
    tx.set(txRef, receipt);
  });
}

// ─────────────────────────────────────────────
// POS — PRODUCT-ONLY INVOICE (no gaming session)
// ─────────────────────────────────────────────

export async function createProductInvoice(
  storeId: string,
  data: {
    customerName: string;
    items: SessionItem[];
    discount: number;
    paymentMethod: "cash" | "card" | "wallet";
  }
) {
  console.log("[createProductInvoice] Creating product invoice transaction...", { storeId, data });
  await runTransaction(db, async (tx) => {
    // Validate stock and deduct
    for (const item of data.items) {
      const productRef = doc(db, "products", item.productId);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists())
        throw new Error(`المنتج "${item.name}" غير موجود`);
      const productData = productSnap.data() as Product;
      if (productData.stock < item.quantity)
        throw new Error(
          `المخزون غير كافٍ لـ "${item.name}". المتوفر: ${productData.stock}`
        );
      tx.update(productRef, { stock: productData.stock - item.quantity });
    }

    const itemsCost = data.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );
    const totalCost = itemsCost;
    const finalAmount = Math.max(0, totalCost - data.discount);
    const now = Timestamp.now();

    const txRef = doc(collection(db, "transactions"));
    
    // Defensive Sanitization: Ensure no fields are undefined or invalid
    const receipt: Omit<Transaction, "id"> = {
      storeId: storeId || "",
      type: "pos",
      deviceId: "pos",
      deviceName: "نقطة البيع",
      customerName: data.customerName || "زبون",
      startTime: now,
      endTime: now,
      elapsedMinutes: 0,
      timeCost: 0,
      itemsCost: Number(itemsCost) || 0,
      totalCost: Number(totalCost) || 0,
      discount: Number(data.discount) || 0,
      finalAmount: Number(finalAmount) || 0,
      paymentMethod: data.paymentMethod || "cash",
      timestamp: now,
      items: data.items.map(item => ({
        productId: item.productId || "",
        name: item.name || "",
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        imageUrl: item.imageUrl || "" // Prevent undefined
      })),
    };

    console.log("[createProductInvoice] Final POS transaction receipt layout for Firestore tx.set:", receipt);
    tx.set(txRef, receipt);
  });
}
