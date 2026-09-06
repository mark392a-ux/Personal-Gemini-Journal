import React from 'react';
import { X, ShieldCheck, Database, Key, Terminal, Lock, CheckCircle2 } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl rounded-2xl border border-stone-200 bg-white p-6 shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Application Threat Model & Security Specifications
              </h3>
              <p className="text-xs text-stone-500">
                Production-grade compliance across all 5 Agentic Threat Zones
              </p>
            </div>
          </div>
          <button
            id="close-security-modal-btn"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 text-xs text-stone-700 leading-relaxed">
          {/* Threat Model Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2.5">
              1. The 5 Threat Zones & Implemented Mitigations
            </h4>
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-[11px] font-semibold text-stone-700 border-b border-stone-200">
                    <th className="p-2.5">Threat Zone</th>
                    <th className="p-2.5">Threat Scenario</th>
                    <th className="p-2.5">Production Countermeasure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-[11px]">
                  <tr>
                    <td className="p-2.5 font-medium text-stone-900">Input Surfaces</td>
                    <td className="p-2.5">Oversized payloads, script injection in journal notes</td>
                    <td className="p-2.5">Character limits (8k max), strict null-safe destructuring, and markdown sanitization.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-900">Planning & Reasoning</td>
                    <td className="p-2.5">Prompt injection attempting to hijack system instructions</td>
                    <td className="p-2.5">Isolated role encapsulation (`user` vs `system`), strict plain data framing.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-900">Tool Execution</td>
                    <td className="p-2.5">SSRF or unauthenticated AI execution attacks</td>
                    <td className="p-2.5">Server-side Express proxy; no direct client-side Gemini execution.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-900">Memory & State</td>
                    <td className="p-2.5">Cross-user data leakage in Firestore</td>
                    <td className="p-2.5">Zero-insecure default rules: `request.auth.uid == userId` strictly owner-bound.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-900">Inter-System Comm.</td>
                    <td className="p-2.5">API key leakage to client or bundle inspection</td>
                    <td className="p-2.5">Zero hardcoded secrets. `GEMINI_API_KEY` stored exclusively in server environment.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Firestore Security Rules Block */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-stone-600" />
              <span>2. Deployed Firestore Security Rules (Owner Isolation)</span>
            </h4>
            <div className="rounded-xl border border-stone-200 bg-stone-900 p-3 font-mono text-[11px] text-stone-200 overflow-x-auto">
              <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`}</pre>
            </div>
          </div>

          {/* Resilient Fallback Ladder */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-stone-600" />
              <span>3. Gemini Resilient Fallback Ladder</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-stone-200 p-2.5 bg-stone-50">
                <span className="font-semibold text-stone-900 block">Primary Model</span>
                <code className="text-blue-700">gemini-3.6-flash</code>
              </div>
              <div className="rounded-lg border border-stone-200 p-2.5 bg-stone-50">
                <span className="font-semibold text-stone-900 block">High-Availability Fallback</span>
                <code className="text-amber-700">gemini-3.1-flash-lite</code>
              </div>
              <div className="rounded-lg border border-stone-200 p-2.5 bg-stone-50">
                <span className="font-semibold text-stone-900 block">Dynamic Alias</span>
                <code className="text-purple-700">gemini-flash-latest</code>
              </div>
              <div className="rounded-lg border border-stone-200 p-2.5 bg-stone-50">
                <span className="font-semibold text-stone-900 block">Deep Reasoning Fallback</span>
                <code className="text-emerald-700">gemini-3.7-flash</code>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
          >
            Close Specifications
          </button>
        </div>
      </div>
    </div>
  );
};
