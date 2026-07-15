import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../services/firebase";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const res = await signInWithEmailAndPassword(auth, email, password);
        const user = res.user;
        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {
          setErrorMsg("Account profile not found in database. Contact administrator.");
          return;
        }

        const data = snap.data();
        navigate(`/store/${data.storeId}/dashboard`);
      } else {
        // --- SIGNUP FLOW ---
        if (!storeName.trim()) {
          setErrorMsg("Please enter your Store Name");
          setLoading(false);
          return;
        }

        // Create user auth credentials
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const user = res.user;

        // Create the store document first
        const storeRef = await addDoc(collection(db, "stores"), {
          name: storeName.trim(),
          createdAt: serverTimestamp(),
        });

        // Link the user to the newly created store
        await setDoc(doc(db, "users", user.uid), {
          email: email.trim(),
          storeId: storeRef.id,
          role: "admin",
        });

        navigate(`/store/${storeRef.id}/dashboard`);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setErrorMsg("Email is already registered.");
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("Password should be at least 6 characters.");
      } else if (err.code === "auth/invalid-credential") {
        setErrorMsg("Incorrect email or password.");
      } else {
        setErrorMsg(err.message || "An error occurred during authentication.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] relative overflow-hidden px-4">
      {/* Background decoration elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Auth Card */}
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20 mb-4 animate-bounce-slow">
            <span className="text-3xl">🎮</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Game Manager
          </h1>
          <p className="text-gray-400 mt-2">Manage your gaming zone in real-time</p>
        </div>

        <div className="glass-panel rounded-2xl p-8 border border-white/5 shadow-2xl relative">
          {/* Tab Selector */}
          <div className="flex bg-[#0b0f19] p-1 rounded-xl mb-6 border border-white/5">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                isLogin
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                !isLogin
                  ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Register Store
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-xs font-medium flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                  Gaming Lounge Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nexus Gaming Arena"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0b0f19] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 bg-[#0b0f19] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm ${
                  isLogin ? "focus:ring-blue-500/50" : "focus:ring-purple-500/50"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 bg-[#0b0f19] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm ${
                  isLogin ? "focus:ring-blue-500/50" : "focus:ring-purple-500/50"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 mt-2 rounded-xl text-white font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                isLogin
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-600/10 hover:shadow-blue-500/20"
                  : "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-purple-600/10 hover:shadow-purple-500/20"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isLogin ? "Sign In" : "Register Store & Start"}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}