import { create } from "zustand";
import type { Device, PlaySession, Product, Transaction } from "../services/storeService";

export interface UserProfile {
  uid: string;
  email: string;
  storeId: string;
  role: "admin" | "staff";
  displayName?: string;
  photoURL?: string;
}

interface GameStoreState {
  user: UserProfile | null;
  storeId: string | null;
  storeName: string | null;
  devices: Device[];
  products: Product[];
  activeSessions: PlaySession[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;

  setUser: (user: UserProfile | null) => void;
  updateUser: (data: Partial<UserProfile>) => void;
  setStoreInfo: (storeId: string | null, storeName: string | null) => void;
  setDevices: (devices: Device[]) => void;
  setProducts: (products: Product[]) => void;
  setActiveSessions: (sessions: PlaySession[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearStore: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  user: null,
  storeId: null,
  storeName: null,
  devices: [],
  products: [],
  activeSessions: [],
  transactions: [],
  loading: false,
  error: null,

  setUser: (user) => set({ user }),
  updateUser: (data) =>
    set((state) =>
      state.user ? { user: { ...state.user, ...data } } : {}
    ),
  setStoreInfo: (storeId, storeName) => set({ storeId, storeName }),
  setDevices: (devices) => set({ devices }),
  setProducts: (products) => set({ products }),
  setActiveSessions: (activeSessions) => set({ activeSessions }),
  setTransactions: (transactions) => set({ transactions }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearStore: () =>
    set({
      user: null,
      storeId: null,
      storeName: null,
      devices: [],
      products: [],
      activeSessions: [],
      transactions: [],
      loading: false,
      error: null,
    }),
}));
