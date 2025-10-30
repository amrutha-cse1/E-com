import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';

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

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API}/products`);
        setProducts(response.data);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="products-page-title">
            BEST SELLERS
          </h1>
          <p className="text-lg text-gray-600" data-testid="products-page-subtitle">Premium products, exceptional quality</p>
          <div className="w-16 h-1 bg-red-600 mx-auto mt-4"></div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-600">Loading products...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" data-testid="products-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductsPage;
