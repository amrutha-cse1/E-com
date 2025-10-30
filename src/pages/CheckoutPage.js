import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';

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

const CheckoutPage = () => {
  const { cart, fetchCart } = useCart();
  const { user, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/checkout`,
        { name, email },
        { headers: getAuthHeader() }
      );
      
      // Set receipt first, then show modal
      const receiptData = response.data;
      setReceipt(receiptData);
      setLoading(false);
      
      // Small delay to ensure state is set before opening modal
      setTimeout(() => {
        setShowReceipt(true);
        toast.success('Order placed successfully!');
      }, 150);
      
      // Fetch cart in background after showing receipt
      fetchCart();
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error(error.response?.data?.detail || 'Checkout failed');
      setLoading(false);
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    navigate('/');
  };

  if (cart.items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="checkout-page-title">
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Checkout Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Customer Information</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="checkout-form">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1"
                  data-testid="checkout-name-input"
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                  data-testid="checkout-email-input"
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white rounded-full py-6 text-lg font-semibold"
                data-testid="place-order-button"
              >
                {loading ? 'Processing...' : 'Place Order'}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-md p-6" data-testid="checkout-summary">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b" data-testid={`checkout-item-${item.id}`}>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900" data-testid={`checkout-item-name-${item.id}`}>{item.product.name}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-900" data-testid={`checkout-item-price-${item.id}`}>
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between text-2xl font-bold text-gray-900 pt-2">
                <span>Total</span>
                <span data-testid="checkout-total">${cart.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Receipt Modal */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-md" data-testid="receipt-modal">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle size={64} className="text-green-500" />
              </div>
              <span className="text-2xl font-bold">Order Successful!</span>
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Your order has been placed successfully
            </DialogDescription>
          </DialogHeader>
          
          {receipt && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg" data-testid="receipt-details">
                <p className="text-sm text-gray-600">Order ID</p>
                <p className="font-mono text-sm" data-testid="receipt-order-id">{receipt.order_id}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-semibold" data-testid="receipt-customer-name">{receipt.customer_name}</p>
                <p className="text-sm text-gray-600" data-testid="receipt-customer-email">{receipt.customer_email}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Items</p>
                {receipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm py-1" data-testid={`receipt-item-${index}`}>
                    <span>{item.product_name} x{item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 flex justify-between text-xl font-bold">
                <span>Total</span>
                <span data-testid="receipt-total">${receipt.total.toFixed(2)}</span>
              </div>

              <p className="text-xs text-gray-500 text-center" data-testid="receipt-timestamp">
                {new Date(receipt.timestamp).toLocaleString()}
              </p>

              <Button 
                onClick={handleCloseReceipt}
                className="w-full bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white rounded-full"
                data-testid="continue-shopping-receipt-button"
              >
                Continue Shopping
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckoutPage;
