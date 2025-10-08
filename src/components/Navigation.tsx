import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, LogOut, ChevronDown, Settings, MapPin } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useIntl } from 'react-intl';;

export function Navigation() {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const intl = useIntl();
  const [showCadastrosDropdown, setShowCadastrosDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCadastrosDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/admin" className="flex items-center">
              <img 
                src="https://wanrdteafvqtcivcrtfy.supabase.co/storage/v1/object/public/logos//logo.png"
                alt="Acquasalles Logo"
                className="h-10 w-auto"
                onError={(e) => e.currentTarget.style.display = 'none'}
              />
            </Link>
            
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/admin')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {intl.formatMessage({ id: 'nav.reports' })}
              </Link>
              
              {isAdmin && (
                <>
                  {/* Cadastros Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowCadastrosDropdown(!showCadastrosDropdown)}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                        location.pathname.startsWith('/cadastros')
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Cadastros
                      <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${
                        showCadastrosDropdown ? 'rotate-180' : ''
                      }`} />
                    </button>

                    {/* Dropdown Menu */}
                    {showCadastrosDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                        <div className="py-1">
                          <Link
                            to="/cadastros/areas-de-trabalho"
                            onClick={() => setShowCadastrosDropdown(false)}
                            className={`block px-4 py-2 text-sm hover:bg-gray-50 ${
                              isActive('/cadastros/areas-de-trabalho')
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-700'
                            }`}
                          >
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              Áreas de trabalho
                            </span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    to="/client-users"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/client-users')
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {intl.formatMessage({ id: 'nav.clientUsers' })}
                    </span>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={() => signOut()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5" />
              <span className="ml-2">{intl.formatMessage({ id: 'nav.logout' })}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}