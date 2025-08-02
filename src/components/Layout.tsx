import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MenuIcon, 
  XIcon, 
  UsersIcon, 
  PaletteIcon, 
  ShoppingCartIcon, 
  BarChart3Icon, 
  LogOutIcon,
  UserIcon,
  TruckIcon
} from './icons/Icons';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: BarChart3Icon, label: 'Dashboard', path: '/dashboard' },
    { icon: ShoppingCartIcon, label: 'Order Entry', path: '/dashboard/orders' },
    { icon: PaletteIcon, label: 'Design Entry', path: '/dashboard/design-entry' },
    { icon: UsersIcon, label: 'Party Entry', path: '/dashboard/party-entry' },
    { icon: TruckIcon, label: 'Transport Entry', path: '/dashboard/transport-entry' },
    { icon: BarChart3Icon, label: 'Reports', path: '/dashboard/reports' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 bg-blue-600 text-white">
          <h1 className="text-xl font-bold">Dashboard</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-blue-700"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                    isActivePath(item.path)
                      ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center mb-3 p-3 bg-gray-50 rounded-lg">
            <UserIcon className="w-8 h-8 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            <LogOutIcon className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top Bar */}
        <header className="flex items-center justify-between h-16 px-6 bg-white shadow-sm border-b">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Welcome, {user?.name}
            </h2>
            {user?.role === 'admin' && (
              <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Admin
              </span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;