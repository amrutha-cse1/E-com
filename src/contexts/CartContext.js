import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const CartContext = createContext();

// Resolve backend URL with a safe development fallback.
const getBackendUrl = () => {
  const env = process.env.REACT_APP_BACKEND_URL;
  const defaultLocal = 'http://localhost:8000';
  if (!env) return defaultLocal;
  try {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
        if ((host === 'localhost' || host === '127.0.0.1') && env.includes('preview')) {
        return defaultLocal;
      }
    }
  } catch (e) {}
  return env;
};

const BACKEND_URL = getBackendUrl();
const API = `${BACKEND_URL}/api`;

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [cartCount, setCartCount] = useState(0);
  const { user, getAuthHeader } = useAuth();

  const fetchCart = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API}/cart`, {
        headers: getAuthHeader()
      });
      setCart(response.data);
      setCartCount(response.data.items.reduce((sum, item) => sum + item.quantity, 0));
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCart({ items: [], total: 0 });
      setCartCount(0);
    }
  }, [user]);

  const addToCart = async (productId, quantity = 1) => {
    try {
      await axios.post(`${API}/cart`, 
        { product_id: productId, quantity },
        { headers: getAuthHeader() }
      );
      await fetchCart();
      toast.success('Added to cart!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add to cart');
    }
  };

  const updateCartItem = async (cartItemId, quantity) => {
    try {
      await axios.patch(`${API}/cart/${cartItemId}`,
        { quantity },
        { headers: getAuthHeader() }
      );
      await fetchCart();
    } catch (error) {
      console.error('Failed to update cart item:', error);
      toast.error('Failed to update cart');
    }
  };

  const removeFromCart = async (cartItemId) => {
    try {
      await axios.delete(`${API}/cart/${cartItemId}`, {
        headers: getAuthHeader()
      });
      await fetchCart();
      toast.success('Removed from cart');
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      toast.error('Failed to remove from cart');
    }
  };

  return (
    <CartContext.Provider value={{ cart, cartCount, addToCart, updateCartItem, removeFromCart, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
