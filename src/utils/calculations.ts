import { Settings } from '@/types/parking';

export const calculateParkingFee = (
  entryTime: Date,
  exitTime: Date,
  vehicleType: 'car' | 'bike' | 'rickshaw',
  pricing: Settings['pricing']
): number => {
  const hoursDiff = Math.ceil((exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60));
  const vehiclePricing = pricing[vehicleType];
  
  if (hoursDiff <= vehiclePricing.baseHours) {
    return vehiclePricing.baseFee;
  }
  
  const extraHours = hoursDiff - vehiclePricing.baseHours;
  return vehiclePricing.baseFee + (extraHours * vehiclePricing.extraHourFee);
};

export const generateBarcode = (vehicleNumber: string, entryTime: Date): string => {
  return `${vehicleNumber.replace(/\s+/g, '').toUpperCase()}-${entryTime.getTime()}`;
};

export const formatCurrency = (amount: number): string => {
  return `${amount} PKR`;
};

export const formatTime = (date: Date): string => {
  return date.toLocaleString('en-PK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format only time (without date) for receipts
export const formatTimeOnly = (date: Date): string => {
  return date.toLocaleString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const getTodayString = (): string => {
  return new Date().toDateString();
};