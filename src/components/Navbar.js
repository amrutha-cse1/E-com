import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { ShoppingCart, LogOut, Menu } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-[#2d2d2d] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-wider" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>VIBE COMMERCE</h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className={`hover:text-gray-300 transition-colors ${
                location.pathname === '/' ? 'border-b-2 border-white pb-1' : ''
              }`}
              data-testid="nav-products-link"
            >
              Products
            </Link>
            
            <Link 
              to="/cart" 
              className="relative hover:text-gray-300 transition-colors flex items-center space-x-1"
              data-testid="nav-cart-link"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center" data-testid="cart-count-badge">
                  {cartCount}
                </span>
              )}
            </Link>

            <div className="flex items-center space-x-3 border-l border-gray-600 pl-6">
              <span className="text-sm text-gray-300" data-testid="user-name">Hello, {user?.name}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="hover:bg-gray-700 text-white"
                data-testid="logout-button"
              >
                <LogOut size={18} className="mr-1" />
                Logout
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-3">
            <Link to="/cart" className="relative" data-testid="mobile-cart-link">
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <button className="p-2" data-testid="mobile-menu-button">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
