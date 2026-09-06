import React, { useState } from 'react';
import { motion } from 'motion/react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Shield, Sparkles, Database, Lock, AlertCircle, ArrowRight } from 'lucide-react';

interface LandingViewProps {
  onOpenSecurityModal: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onOpenSecurityModal }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in was cancelled. Please try again.');
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        setAuthError(err?.message || 'Authentication failed. Please verify your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-61px)] bg-stone-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-stone-200 bg-white p-8 sm:p-12 shadow-sm"
        >
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1 text-xs font-medium text-stone-700 mb-5">
              <Sparkles className="h-3.5 w-3.5 text-stone-900" />
              <span>Powered by Gemini 3.6 Flash & Cloud Firestore</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Private Journal & Reflections
            </h1>
            <p className="mt-4 text-base text-stone-600 leading-relaxed">
              Capture your deepest thoughts, converse through multi-turn reflections, and receive AI-synthesized summaries. Isolated strictly to your private account.
            </p>
          </div>

          {/* Auth Action Area */}
          <div className="max-w-md mx-auto mb-12">
            {authError && (
              <div
                id="auth-error-banner"
                className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1">{authError}</div>
              </div>
            )}

            <button
              id="google-signin-btn"
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-stone-800 disabled:opacity-60 transition-all cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-400 border-t-white" />
                  <span>Authenticating via Google...</span>
                </div>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google Sign-In</span>
                  <ArrowRight className="h-4 w-4 text-stone-400" />
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs text-stone-500">
              No password required. Authentication is securely managed by Firebase Auth.
            </p>
          </div>

          {/* Security & Architectural Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-stone-200">
            <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-4">
              <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm mb-1.5">
                <Database className="h-4 w-4 text-stone-700" />
                <span>Isolated Firestore</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Rules enforce strict tenant isolation (<code className="bg-stone-200/60 px-1 py-0.5 rounded text-[11px]">request.auth.uid == userId</code>). No cross-user reads.
              </p>
            </div>

            <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-4">
              <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm mb-1.5">
                <Sparkles className="h-4 w-4 text-stone-700" />
                <span>Gemini 3.6 Flash</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Server-side resilient fallback ladder guarantees high availability with zero client-side key leakage.
              </p>
            </div>

            <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-4">
              <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm mb-1.5">
                <Lock className="h-4 w-4 text-stone-700" />
                <span>Federated Identity</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Direct Google OAuth integration eliminates raw password entry and session vulnerability vectors.
              </p>
            </div>
          </div>

          {/* View Threat Model Link */}
          <div className="mt-8 text-center">
            <button
              id="view-threat-model-btn"
              type="button"
              onClick={onOpenSecurityModal}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:underline cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              <span>Review Agentic Threat Model & Compliance Specs</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
