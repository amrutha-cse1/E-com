import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(product.id);
  };

  return (
    <div className="product-card bg-white rounded-lg overflow-hidden shadow-md" data-testid={`product-card-${product.id}`}>
      <div className="relative h-64 overflow-hidden bg-gray-100">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover"
          data-testid={`product-image-${product.id}`}
        />
        <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700" data-testid={`product-category-${product.id}`}>
          {product.category}
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid={`product-name-${product.id}`}>
          {product.name}
        </h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2" data-testid={`product-description-${product.id}`}>
          {product.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Price</span>
            <p className="text-2xl font-bold text-gray-900" data-testid={`product-price-${product.id}`}>
              ${product.price.toFixed(2)}
            </p>
          </div>
          
          <Button 
            onClick={handleAddToCart}
            className="bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white rounded-full px-6"
            data-testid={`add-to-cart-button-${product.id}`}
          >
            <ShoppingCart size={18} className="mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
