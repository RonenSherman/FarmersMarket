import { create } from 'zustand';
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

export const useMarketStore = create<MarketStore>((set, get) => ({
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
  
  carts: [],
  
  addToCart: (vendorId, vendorName, product, quantity) => {
    const { carts } = get();
    const existingCartIndex = carts.findIndex(cart => cart.vendor_id === vendorId);
    
    if (existingCartIndex >= 0) {
      const existingCart = carts[existingCartIndex];
      const existingItemIndex = existingCart.items.findIndex(item => item.product.id === product.id);
      
      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        existingCart.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item to existing cart
        existingCart.items.push({ product, quantity });
      }
      
      // Recalculate total
      existingCart.total = existingCart.items.reduce((total, item) => 
        total + (item.product.price * item.quantity), 0
      );
      
      set({ carts: [...carts] });
    } else {
      // Create new cart
      const newCart: VendorCart = {
        vendor_id: vendorId,
        vendor_name: vendorName,
        items: [{ product, quantity }],
        total: product.price * quantity
      };
      
      set({ carts: [...carts, newCart] });
    }
  },
  
  removeFromCart: (vendorId, productId) => {
    const { carts } = get();
    const cartIndex = carts.findIndex(cart => cart.vendor_id === vendorId);
    
    if (cartIndex >= 0) {
      const cart = carts[cartIndex];
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
    
    const { carts } = get();
    const cartIndex = carts.findIndex(cart => cart.vendor_id === vendorId);
    
    if (cartIndex >= 0) {
      const cart = carts[cartIndex];
      const itemIndex = cart.items.findIndex(item => item.product.id === productId);
      
      if (itemIndex >= 0) {
        cart.items[itemIndex].quantity = quantity;
        cart.total = cart.items.reduce((total, item) => 
          total + (item.product.price * item.quantity), 0
        );
        
        set({ carts: [...carts] });
      }
    }
  },
  
  clearCart: (vendorId) => {
    set({ carts: get().carts.filter(cart => cart.vendor_id !== vendorId) });
  },
  
  clearAllCarts: () => {
    set({ carts: [] });
  },
  
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
})); 