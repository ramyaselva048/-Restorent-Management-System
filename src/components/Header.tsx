import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useNotifications } from '../context/NotificationContext.tsx';
import {
  Bell,
  LogOut,
  Shield,
  CheckCheck
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Title / Current View */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-zinc-100 capitalize tracking-tight flex items-center gap-2">
          {currentTab.replace('-', ' ')}
        </h1>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono hidden sm:inline-block">
          v2.4 Production
        </span>
      </div>

      {/* Right Controls: Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-84 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-2">
                <span className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono">
                      {unreadCount} new
                    </span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-xs text-zinc-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">No notifications yet</p>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        n.isRead
                          ? 'bg-zinc-950/40 border-zinc-800/40 text-zinc-400'
                          : 'bg-zinc-800/60 border-amber-500/30 text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-zinc-100 capitalize">{n.title}</span>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-snug">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 transition-all"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-zinc-200 leading-none">{user?.name || 'Staff Member'}</p>
              <p className="text-[10px] font-mono text-amber-400 uppercase mt-0.5 tracking-wider font-bold">
                {user?.role}
              </p>
            </div>
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
              alt={user?.name}
              className="w-8 h-8 rounded-lg object-cover ring-1 ring-zinc-700"
            />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="p-2 border-b border-zinc-800 mb-1">
                <p className="text-xs font-semibold text-zinc-200">{user?.name}</p>
                <p className="text-[11px] text-zinc-500">{user?.email}</p>
                <span className="mt-1.5 inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Role: {user?.role}
                </span>
              </div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onNavigate('users');
                }}
                className="w-full text-left text-xs px-3 py-2 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-zinc-400" />
                Staff & Roles
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="w-full text-left text-xs px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 mt-1"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
