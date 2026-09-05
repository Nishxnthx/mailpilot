'use client';

import React, { useEffect } from 'react';
import {
  Mail,
  Search,
  Sparkles,
  PanelRightClose,
  PanelRight,
  ShieldCheck,
  LogOut,
  Loader2,
  Plug,
  Menu,
} from 'lucide-react';
import { useMailStore } from '@/stores/useMailStore';
import { useCopilotStore } from '@/stores/useCopilotStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FilterPopover } from './FilterPopover';

export const Header: React.FC = () => {
  const searchQuery = useMailStore((state) => state.searchQuery);
  const setSearchQuery = useMailStore((state) => state.setSearchQuery);
  const isGmailConnected = useMailStore((state) => state.isGmailConnected);
  const userProfile = useMailStore((state) => state.userProfile);
  const checkAuthStatus = useMailStore((state) => state.checkAuthStatus);
  const disconnectGmail = useMailStore((state) => state.disconnectGmail);

  const isCopilotOpen = useCopilotStore((state) => state.isCopilotOpen);
  const toggleCopilot = useCopilotStore((state) => state.toggleCopilot);

  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const avatarButtonRef = React.useRef<HTMLButtonElement>(null);

  const initials = userProfile?.displayName
    ? userProfile.displayName.charAt(0).toUpperCase()
    : userProfile?.emailAddress
    ? userProfile.emailAddress.charAt(0).toUpperCase()
    : 'MP';

  useEffect(() => {
    checkAuthStatus();

    // Clean up ?auth=success query string from address bar if present
    if (typeof window !== 'undefined' && window.location.search.includes('auth=success')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkAuthStatus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleConnectGmail = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <header className="h-14 border-b border-[#1b2230] bg-[#0a0d14] px-4 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Left: Hamburger + Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          aria-label="Toggle menu"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#151b26] transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
            <Mail className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 tracking-tight text-sm">MailPilot</span>
              <Badge variant="default" className="py-0 px-1 text-[9px] uppercase font-bold tracking-wider bg-blue-950 text-blue-400 border-blue-800/60">
                AI
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Your AI Email Copilot</p>
          </div>
        </div>
      </div>

      {/* Middle: Global Search Bar & Filter Popover */}
      <div className="flex-1 max-w-2xl hidden md:flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search mail"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 bg-[#0e121c] border-[#1b2230] focus:border-blue-500/60 text-slate-100 placeholder:text-slate-500 text-sm h-9 rounded-xl"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <FilterPopover />
          </div>
        </div>
      </div>

      {/* Right: Gmail OAuth Status & Copilot Toggle */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Real Gmail Connection Indicator */}
        {isGmailConnected === null ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0e121c] border border-[#1b2230] text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
            <span>Checking...</span>
          </div>
        ) : isGmailConnected ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Connected</span>
            </div>
          </div>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={handleConnectGmail}
            className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1.5 shadow-sm rounded-lg"
          >
            <Plug className="h-3.5 w-3.5" />
            <span>Connect Gmail</span>
          </Button>
        )}

        {/* User Avatar Circle & Popover Menu */}
        <div className="relative">
          <button
            ref={avatarButtonRef}
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 hover:border-slate-500 transition-colors flex items-center justify-center text-xs font-semibold text-slate-200 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            title="MailPilot Account Profile"
            aria-label="User Account Menu"
          >
            {initials}
          </button>

          {isProfileOpen && (
            <div
              ref={popoverRef}
              className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-4 select-none space-y-3"
            >
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                MailPilot Account
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="h-10 w-10 rounded-full bg-blue-600 border border-blue-500 flex items-center justify-center text-sm font-bold text-white shadow-md">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-100 truncate">
                    {userProfile?.displayName || 'Authenticated User'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {userProfile?.emailAddress || 'Connected to Gmail'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                {isGmailConnected ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Gmail Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Not Connected</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800">
                {isGmailConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsProfileOpen(false);
                      await disconnectGmail();
                    }}
                    className="w-full text-xs text-red-400 hover:text-red-300 border-red-900/50 hover:bg-red-950/40 gap-2 rounded-xl h-8"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Disconnect</span>
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleConnectGmail();
                    }}
                    className="w-full text-xs bg-blue-600 hover:bg-blue-500 text-white gap-2 rounded-xl h-8"
                  >
                    <Plug className="h-3.5 w-3.5" />
                    <span>Connect Gmail</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Copilot Toggle */}
        <Button
          variant={isCopilotOpen ? 'default' : 'outline'}
          size="sm"
          onClick={toggleCopilot}
          className="h-8 gap-1.5 text-xs font-medium rounded-lg"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span className="hidden lg:inline">AI Copilot</span>
          {isCopilotOpen ? (
            <PanelRightClose className="h-3.5 w-3.5 opacity-70" />
          ) : (
            <PanelRight className="h-3.5 w-3.5 opacity-70" />
          )}
        </Button>
      </div>
    </header>
  );
};
