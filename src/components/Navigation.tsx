'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Bars3Icon, XMarkIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useMarketStore } from '@/store/marketStore';
import { cn } from '@/lib/utils';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { carts } = useMarketStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCartItems = mounted ? carts.reduce((total, cart) => 
    total + cart.items.reduce((cartTotal, item) => cartTotal + item.quantity, 0), 0
  ) : 0;

  const menuItems = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/shop' },
    { name: 'Calendar', href: '/calendar' },
    { name: 'About Us', href: '/about' },
    { name: 'Vendor Sign-up', href: '/vendor-signup' },
    { name: 'Admin', href: '/admin' },
  ];

  return (
    <nav className="bg-white shadow-md border-b border-earth-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-market-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">DFM</span>
              </div>
              <span className="font-bold text-xl text-earth-800">
                Duvall Farmers Market Online Service
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-3 py-2 text-sm font-medium transition-colors duration-200',
                    pathname === item.href
                      ? 'text-market-600 border-b-2 border-market-600'
                      : 'text-earth-700 hover:text-market-600'
                  )}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Cart Icon */}
              <Link
                href="/cart"
                className="relative p-2 text-earth-700 hover:text-market-600 transition-colors duration-200"
              >
                <ShoppingCartIcon className="h-6 w-6" />
                {totalCartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-market-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalCartItems}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-4">
            {/* Mobile Cart Icon */}
            <Link
              href="/cart"
              className="relative p-2 text-earth-700 hover:text-market-600 transition-colors duration-200"
            >
              <ShoppingCartIcon className="h-6 w-6" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-market-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {totalCartItems}
                </span>
              )}
            </Link>
            
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-earth-700 hover:text-market-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-market-500"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-earth-200">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'block px-3 py-2 text-base font-medium transition-colors duration-200 rounded-md',
                  pathname === item.href
                    ? 'text-market-600 bg-market-50'
                    : 'text-earth-700 hover:text-market-600 hover:bg-earth-50'
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation; 