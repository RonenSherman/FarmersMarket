import { format, isThisWeek, nextThursday, isThursday, isAfter, isBefore, parseISO } from 'date-fns';
import { ProductType } from '@/types';

export function getNextMarketDate(): Date {
  const today = new Date();
  
  if (isThursday(today)) {
    // If it's Thursday, check if market is still open (before 6:30 PM)
    const marketEndTime = new Date();
    marketEndTime.setHours(18, 30, 0, 0);
    
    if (isBefore(today, marketEndTime)) {
      return today;
    }
  }
  
  return nextThursday(today);
}

export function isMarketOpen(): boolean {
  const now = new Date();
  
  if (!isThursday(now)) {
    return false;
  }
  
  const marketEndTime = new Date();
  marketEndTime.setHours(18, 30, 0, 0);
  
  return isBefore(now, marketEndTime);
}

export function isMarketOpenWithTimes(startTime: string, endTime: string): boolean {
  const now = new Date();
  
  if (!isThursday(now)) {
    return false;
  }
  
  // Parse the time strings (format: "HH:MM" or "HH:MM:SS")
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const marketStartTime = new Date();
  marketStartTime.setHours(startHour, startMinute, 0, 0);
  
  const marketEndTime = new Date();
  marketEndTime.setHours(endHour, endMinute, 0, 0);
  
  // Use inclusive comparisons: market is open from start time (inclusive) to end time (inclusive)
  return now >= marketStartTime && now <= marketEndTime;
}

export function formatMarketDate(date: Date): string {
  return format(date, 'EEEE, MMMM do');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getMarketEndTime(): string {
  return '6:30 PM';
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatProductType(type: ProductType): string {
  return type
    .split('_')
    .map(word => capitalizeFirst(word))
    .join(' ');
}

export const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'produce', label: 'Fresh Produce' },
  { value: 'meat', label: 'Meat & Poultry' },
  { value: 'dairy', label: 'Dairy Products' },
  { value: 'baked_goods', label: 'Baked Goods' },
  { value: 'crafts', label: 'Crafts' },
  { value: 'artisan_goods', label: 'Artisan Goods' },
  { value: 'flowers', label: 'Flowers & Plants' },
  { value: 'honey', label: 'Honey & Syrups' },
  { value: 'preserves', label: 'Jams & Preserves' },
];

export function cn(...classes: string[]): string {
  return classes.filter(Boolean).join(' ');
} 