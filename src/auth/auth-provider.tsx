/**
 * PROTOTYPE AUTHENTICATION
 *
 * WARNING: This is a prototype auth implementation for hackathon demonstration.
 * - Uses localStorage to store user records (email, name, SHA-256 password hash)
 * - SHA-256 via Web Crypto API — no salt, no KDF — NOT production-grade
 * - Session persistence via a localStorage session token (random UUID)
 * - Designed to be replaced by a real backend auth provider
 *
 * What this file exports:
 *   AuthProvider      — wrap your app with this
 *   useAuth()         — { user, isLoading, error, login, signup, logout, completeOnboarding, clearError, loginWithGoogle }
 *   ProtectedRoute    — redirects unauthenticated users to /login?next=<path>
 *   PublicOnlyRoute   — redirects authenticated users to /home
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';

// ─── Public user type (no sensitive fields) ───────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  onboardingComplete: boolean;
  subjectHint?: string;
  createdAt: string;
}

// ─── Internal stored record ───────────────────────────────────────────────────

interface _ProtoUser {
  id: string;
  name: string;
  email: string;
  /** SHA-256 hex — PROTOTYPE ONLY, no salt, not production-grade */
  passwordHash: string;
  onboardingComplete: boolean;
  subjectHint?: string;
  createdAt: string;
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  completeOnboarding: (subjectHint?: string) => void;
  clearError: () => void;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const USERS_KEY = 'conceptiq-proto-users';
const SESSION_KEY = 'conceptiq-proto-session';

// ─── SHA-256 hashing ──────────────────────────────────────────────────────────
// PROTOTYPE ONLY — no salt, no key-derivation function.
// Replace with bcrypt / Argon2 on a real backend.

async function hashPassword(pw: string): Promise<string> {
  const data = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadUsers(): _ProtoUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]'); }
  catch { return []; }
}

function saveUsers(users: _ProtoUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadSessionUserId(): string | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    return typeof s?.userId === 'string' ? s.userId : null;
  } catch { return null; }
}

function persistSession(userId: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, token: crypto.randomUUID() }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function toPublic(u: _ProtoUser): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    onboardingComplete: u.onboardingComplete,
    subjectHint: u.subjectHint,
    createdAt: u.createdAt,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthCtx = createContext<AuthContextValue | null>(null);

// ─── AuthProvider ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Start in loading state — never redirect before we know auth status
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount (synchronous localStorage read)
  useEffect(() => {
    const userId = loadSessionUserId();
    if (userId) {
      const found = loadUsers().find(u => u.id === userId);
      if (found) setUser(toPublic(found));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const hash = await hashPassword(password);
    const found = loadUsers().find(
      u => u.email.toLowerCase() === email.toLowerCase().trim() && u.passwordHash === hash
    );
    if (!found) {
      const msg = "That email or password doesn't match an account.";
      setError(msg);
      throw new Error(msg);
    }
    persistSession(found.id);
    setUser(toPublic(found));
  };

  const signup = async (name: string, email: string, password: string) => {
    setError(null);
    const users = loadUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
      const msg = 'An account with that email already exists.';
      setError(msg);
      throw new Error(msg);
    }
    const hash = await hashPassword(password);
    const newUser: _ProtoUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      onboardingComplete: false,
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, newUser]);
    persistSession(newUser.id);
    setUser(toPublic(newUser));
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const completeOnboarding = (subjectHint?: string) => {
    if (!user) return;
    const updated = loadUsers().map(u =>
      u.id === user.id ? { ...u, onboardingComplete: true, subjectHint } : u
    );
    saveUsers(updated);
    setUser(prev => prev ? { ...prev, onboardingComplete: true, subjectHint } : null);
  };

  const clearError = () => setError(null);

  return (
    <AuthCtx.Provider value={{ user, isLoading, error, login, signup, logout, completeOnboarding, clearError }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ─── useAuth ──────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center" aria-live="polite" aria-label="Loading">
      <p className="font-display text-2xl font-bold uppercase tracking-widest text-fg animate-pulse">
        CONCEPTIQ
      </p>
    </div>
  );
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Waits for auth init before deciding. Preserves intended destination via ?next=

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthLoadingScreen />;

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <>{children}</>;
}

// ─── PublicOnlyRoute ──────────────────────────────────────────────────────────
// Redirects authenticated users away from login/signup pages.

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <AuthLoadingScreen />;
  if (user) return <Navigate to="/home" replace />;

  return <>{children}</>;
}
