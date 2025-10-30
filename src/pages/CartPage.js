import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

const CartPage = () => {
  const { cart, updateCartItem, removeFromCart } = useCart();
  const navigate = useNavigate();

  const handleQuantityChange = (cartItemId, newQuantity) => {
    if (newQuantity > 0) {
      updateCartItem(cartItemId, newQuantity);
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="cart-page-title">
          Shopping Cart
        </h1>

        {cart.items.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-cart">
            <ShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Start adding some products!</p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white rounded-full px-8"
              data-testid="continue-shopping-button"
            >
              Continue Shopping
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4" data-testid="cart-items-list">
              {cart.items.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4" data-testid={`cart-item-${item.id}`}>
                  <img 
                    src={item.product.image} 
                    alt={item.product.name}
                    className="w-24 h-24 object-cover rounded-lg"
                    data-testid={`cart-item-image-${item.id}`}
                  />
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900" data-testid={`cart-item-name-${item.id}`}>
                      {item.product.name}
                    </h3>
                    <p className="text-gray-600" data-testid={`cart-item-price-${item.id}`}>
                      ${item.product.price.toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      className="h-8 w-8 rounded-full"
                      data-testid={`decrease-quantity-${item.id}`}
                    >
                      <Minus size={16} />
                    </Button>
                    <span className="text-lg font-semibold w-8 text-center" data-testid={`cart-item-quantity-${item.id}`}>
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="h-8 w-8 rounded-full"
                      data-testid={`increase-quantity-${item.id}`}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>

                  {/* Item Total */}
                  <div className="text-lg font-bold text-gray-900" data-testid={`cart-item-total-${item.id}`}>
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    data-testid={`remove-item-${item.id}`}
                  >
                    <Trash2 size={20} />
                  </Button>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-24" data-testid="order-summary">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span data-testid="cart-subtotal">${cart.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span data-testid="cart-total">${cart.total.toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleCheckout}
                  className="w-full bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white rounded-full py-6 text-lg font-semibold"
                  data-testid="checkout-button"
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CartPage;
