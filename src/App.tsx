import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useGameStore } from "./store/useGameStore";
import {
  subscribeDevices,
  subscribeProducts,
  subscribeSessions,
  subscribeTransactions,
} from "./services/storeService";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Inventory from "./pages/Inventory";
import History from "./pages/History";

// --- AUTH PROTECTED WRAPPER ---
function ProtectedRoutes() {
  const user = useGameStore((state) => state.user);
  const loading = useGameStore((state) => state.loading);
  const { storeId } = useParams<{ storeId: string }>();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-xl border-4 border-blue-500/20 border-t-blue-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm font-medium animate-pulse">Initializing connection...</p>
      </div>
    );
  }

  // Guard: Not logged in or storeId mismatch
  if (!user || user.storeId !== storeId) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  const setUser = useGameStore((state) => state.setUser);
  const setStoreInfo = useGameStore((state) => state.setStoreInfo);
  const setDevices = useGameStore((state) => state.setDevices);
  const setProducts = useGameStore((state) => state.setProducts);
  const setActiveSessions = useGameStore((state) => state.setActiveSessions);
  const setTransactions = useGameStore((state) => state.setTransactions);
  
  const user = useGameStore((state) => state.user);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          // Fetch user metadata from Firestore
          const userDocSnap = await getDoc(doc(db, "users", authUser.uid));
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const storeId = userData.storeId;

            // Fetch Store Name
            const storeDocSnap = await getDoc(doc(db, "stores", storeId));
            const storeName = storeDocSnap.exists() ? storeDocSnap.data().name : "Game Zone";

            setUser({
              uid: authUser.uid,
              email: authUser.email || "",
              storeId,
              role: userData.role || "staff",
            });
            setStoreInfo(storeId, storeName);
          } else {
            console.error("User profile document not found in Firestore");
            setUser(null);
            setStoreInfo(null, null);
          }
        } catch (err) {
          console.error("Error setting up user session:", err);
          setUser(null);
          setStoreInfo(null, null);
        }
      } else {
        setUser(null);
        setStoreInfo(null, null);
      }
      setInitLoading(false);
    });

    return () => unsubscribeAuth();
  }, [setUser, setStoreInfo]);

  // Firestore Subscriptions sync
  useEffect(() => {
    if (!user || !user.storeId) return;

    const storeId = user.storeId;

    // Realtime listeners
    const unsubDevices = subscribeDevices(storeId, setDevices);
    const unsubProducts = subscribeProducts(storeId, setProducts);
    const unsubSessions = subscribeSessions(storeId, setActiveSessions);
    const unsubTransactions = subscribeTransactions(storeId, setTransactions);

    return () => {
      unsubDevices();
      unsubProducts();
      unsubSessions();
      unsubTransactions();
    };
  }, [user, setDevices, setProducts, setActiveSessions, setTransactions]);

  if (initLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-xl border-4 border-blue-500/20 border-t-blue-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm font-medium animate-pulse">Starting Game Manager...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROOT ROUTE */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={`/store/${user.storeId}/dashboard`} replace />
            ) : (
              <Login />
            )
          }
        />

        {/* PROTECTED STORE PAGES */}
        <Route path="/store/:storeId" element={<ProtectedRoutes />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="devices" element={<Devices />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="history" element={<History />} />
          
          {/* FALLBACK REDIRECTS */}
          <Route path="" element={<Navigate to="dashboard" replace />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* GENERAL FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}