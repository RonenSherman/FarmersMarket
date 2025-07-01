import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { VendorCart, CartItem, Vendor, Product, MarketStatus } from '@/types';

interface MarketStore {
  // Market status
  marketStatus: MarketStatus;
  setMarketStatus: (status: MarketStatus) => void;
  
  // Vendors and products
  vendors: Vendor[];
  products: Product[];
  setVendors: (vendors: Vendor[]) => void;
  setProducts: (products: Product[]) => void;
  updateProductStock: (productId: string, newStock: number) => void;
  refreshProducts: () => Promise<void>;
  getAvailableStock: (productId: string) => number;
  
  // Cart management
  carts: VendorCart[];
  addToCart: (vendorId: string, vendorName: string, product: Product, quantity: number) => void;
  removeFromCart: (vendorId: string, productId: string) => void;
  updateCartQuantity: (vendorId: string, productId: string, quantity: number) => void;
  clearCart: (vendorId: string) => void;
  clearAllCarts: () => void;
  
  // Loading states
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useMarketStore = create<MarketStore>()(
  persist(
    (set, get) => ({
      marketStatus: {
        isOpen: false,
        nextMarketDate: null,
        currentMarketEndTime: null,
        activeVendors: []
      },
      setMarketStatus: (status) => set({ marketStatus: status }),
      
      vendors: [],
      products: [],
      setVendors: (vendors) => set({ vendors }),
      setProducts: (products) => set({ products }),
      updateProductStock: (productId, newStock) => {
        const { products } = get();
        const updatedProducts = products.map(product => 
          product.id === productId 
            ? { ...product, stock_quantity: newStock }
            : product
        );
        set({ products: updatedProducts });
      },

      refreshProducts: async () => {
        try {
          console.log('🔄 Refreshing product data from database...');
          const { productService } = await import('@/lib/database');
          const freshProducts = await productService.getAll();
          console.log('✅ Products refreshed from database');
          set({ products: freshProducts });
        } catch (error) {
          console.error('❌ Failed to refresh products:', error);
        }
      },
      
      carts: [],
      
      addToCart: (vendorId, vendorName, product, quantity) => {
        const { carts, products } = get();
        
        console.log('addToCart called:', { vendorId, vendorName, productId: product.id, productName: product.name, quantity });
        console.log('Current carts before adding:', carts);
        
        // Get the most up-to-date product info from the store
        const currentProduct = products.find(p => p.id === product.id) || product;
        
        // Check if product is available
        if (!currentProduct.available) {
          throw new Error('This product is no longer available');
        }
        
        // Check stock quantity if defined
        if (currentProduct.stock_quantity !== undefined) {
          // Get current quantity in cart for this product from ALL carts (not just this vendor)
          let totalInCart = 0;
          carts.forEach(cart => {
            const item = cart.items.find(item => item.product.id === currentProduct.id);
            if (item) totalInCart += item.quantity;
          });
          
          const availableStock = currentProduct.stock_quantity;
          const remainingStock = availableStock - totalInCart;
          
          if (availableStock <= 0) {
            throw new Error('This product is out of stock');
          }
          
          if (remainingStock <= 0) {
            throw new Error('This product is out of stock (all remaining items are in your cart)');
          }
          
          if (quantity > remainingStock) {
            throw new Error(`Only ${remainingStock} more items available`);
          }
        }
        
        const existingCartIndex = carts.findIndex(cart => cart.vendor_id === vendorId);
        
        if (existingCartIndex >= 0) {
          const existingCart = carts[existingCartIndex];
          const existingItemIndex = existingCart.items.findIndex(item => item.product.id === product.id);
          
          if (existingItemIndex >= 0) {
            // Update quantity of existing item
            existingCart.items[existingItemIndex].quantity += quantity;
            console.log('Updated existing item quantity:', existingCart.items[existingItemIndex]);
          } else {
            // Add new item to existing cart
            existingCart.items.push({ product, quantity });
            console.log('Added new item to existing cart:', { product: product.name, quantity });
          }
          
          // Recalculate total
          existingCart.total = existingCart.items.reduce((total, item) => 
            total + (item.product.price * item.quantity), 0
          );
          
          console.log('Updated cart:', existingCart);
          set({ carts: [...carts] });
        } else {
          // Create new cart
          const newCart: VendorCart = {
            vendor_id: vendorId,
            vendor_name: vendorName,
            items: [{ product, quantity }],
            total: product.price * quantity
          };
          
          console.log('Created new cart:', newCart);
          set({ carts: [...carts, newCart] });
        }
        
        // Log final state
        const finalState = get();
        console.log('Final carts after adding:', finalState.carts);
        
        // Don't reduce stock here - only reduce when order is actually placed
        // Stock reduction will happen in the checkout process
      },
      
      removeFromCart: (vendorId, productId) => {
        const { carts, products } = get();
        const cartIndex = carts.findIndex(cart => cart.vendor_id === vendorId);
        
        if (cartIndex >= 0) {
          const cart = carts[cartIndex];
          const itemToRemove = cart.items.find(item => item.product.id === productId);
          
          // No need to return stock since we don't reduce it when adding to cart
          // Stock is only reduced during actual order placement
          
          cart.items = cart.items.filter(item => item.product.id !== productId);
          cart.total = cart.items.reduce((total, item) => 
            total + (item.product.price * item.quantity), 0
          );
          
          // Remove cart if empty
          if (cart.items.length === 0) {
            set({ carts: carts.filter(c => c.vendor_id !== vendorId) });
          } else {
            set({ carts: [...carts] });
          }
        }
      },
      
      updateCartQuantity: (vendorId, productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(vendorId, productId);
          return;
        }
        
        const { carts, products } = get();
        const cartIndex = carts.findIndex(cart => cart.vendor_id === vendorId);
        
        if (cartIndex >= 0) {
          const cart = carts[cartIndex];
          const itemIndex = cart.items.findIndex(item => item.product.id === productId);
          
          if (itemIndex >= 0) {
            const currentItem = cart.items[itemIndex];
            const product = products.find(p => p.id === productId);
            const oldQuantity = currentItem.quantity;
            const quantityDifference = quantity - oldQuantity;
            
            // Check stock limit against available stock (considering all cart items)
            if (product && product.stock_quantity !== undefined) {
              let totalInAllCarts = 0;
              get().carts.forEach(c => {
                const item = c.items.find(i => i.product.id === productId);
                if (item) totalInAllCarts += item.quantity;
              });
              
              // Subtract the old quantity and add the new quantity to get the new total
              const newTotalInCarts = totalInAllCarts - oldQuantity + quantity;
              
              if (newTotalInCarts > product.stock_quantity) {
                const available = product.stock_quantity - (totalInAllCarts - oldQuantity);
                throw new Error(`Only ${available} items available`);
              }
            }
            
            // Update cart quantity
            cart.items[itemIndex].quantity = quantity;
            cart.total = cart.items.reduce((total, item) => 
              total + (item.product.price * item.quantity), 0
            );
            
            set({ carts: [...carts] });
          }
        }
      },
      
      clearCart: (vendorId) => {
        const { carts, products } = get();
        const cartToRemove = carts.find(cart => cart.vendor_id === vendorId);
        
        // No need to return stock since we don't reduce it when adding to cart
        // Stock is only reduced during actual order placement
        
        set({ carts: carts.filter(cart => cart.vendor_id !== vendorId) });
      },
      
      clearAllCarts: () => {
        set({ carts: [] });
      },
      
      getAvailableStock: (productId) => {
        const { products, carts } = get();
        const product = products.find(p => p.id === productId);
        
        if (!product || product.stock_quantity === undefined) {
          return 0;
        }
        
        // Calculate total quantity in all carts for this product
        let totalInCarts = 0;
        carts.forEach(cart => {
          const item = cart.items.find(item => item.product.id === productId);
          if (item) totalInCarts += item.quantity;
        });
        
        return Math.max(0, product.stock_quantity - totalInCarts);
      },
      
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'duvall-farmers-market-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        carts: state.carts,
        // Don't persist products/vendors as they should be fresh from API
        // Don't persist marketStatus as it's calculated dynamically
      }),
    }
  )
); 