import React from 'react';
import { User } from 'firebase/auth';
import { ShieldCheck, Sparkles, LogOut, BookOpen, Database } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onSignOut: () => void;
  onOpenSecurityModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onOpenSecurityModal,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-stone-50/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-stone-100 shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-stone-900 sm:text-lg">
              Gemini Reflections
            </span>
            <span className="hidden text-xs text-stone-500 sm:inline-block sm:ml-2">
              Private AI Journal
            </span>
          </div>
        </div>

        {/* Action Controls & User Identity */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            id="security-specs-btn"
            type="button"
            onClick={onOpenSecurityModal}
            className="hidden items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-100 transition-colors md:inline-flex"
            title="Inspect Application Threat Model & Security Architecture"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Security Architecture</span>
          </button>

          {user && (
            <div className="flex items-center gap-3 border-l border-stone-200 pl-3 sm:pl-4">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="h-8 w-8 rounded-full border border-stone-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-800 text-xs font-semibold text-white">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden flex-col sm:flex">
                  <span className="text-xs font-semibold text-stone-900 truncate max-w-[140px]">
                    {user.displayName || 'Authenticated User'}
                  </span>
                  <span className="text-[10px] text-stone-500 truncate max-w-[140px]">
                    {user.email}
                  </span>
                </div>
              </div>

              <button
                id="sign-out-btn"
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 hover:text-stone-900 transition-colors"
                title="Sign out of Firebase Auth"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
