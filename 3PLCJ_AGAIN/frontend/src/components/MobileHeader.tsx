import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Menu } from 'lucide-react';
import logo from '@/images/3pl4.png';

export const MobileHeader: React.FC<{ onMenuToggle?: () => void }> = ({ onMenuToggle }) => {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-md border-b border-gray-700">
      {/* Left – menu toggle */}
      {onMenuToggle && (
        <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
          <Menu size={20} className="text-white" />
        </button>
      )}
      {/* Center – logo */}
      <img src={logo} alt="3PL Logo" className="h-8 object-contain" />
      {/* Right – notifications & avatar */}
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
          <Bell size={20} className="text-white" />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#8B0000] flex items-center justify-center text-white font-bold">
          {user?.username?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
};
