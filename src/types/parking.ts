export interface Vehicle {
  id: string;
  number: string;
  clientName?: string;
  type: 'car' | 'bike' | 'rickshaw';
  entryTime: Date;
  exitTime?: Date;
  fee?: number;
  isPermanent?: boolean;
  cnic?: string;
  monthlyFee?: number;
  paymentStatus?: 'paid' | 'unpaid';
  paymentDate?: Date;
  contact?: string; // Added for permanent client contact number
}

export interface Settings {
  siteName: string;
  pricing: {
    car: { baseHours: number; baseFee: number; extraHourFee: number };
    bike: { baseHours: number; baseFee: number; extraHourFee: number };
    rickshaw: { baseHours: number; baseFee: number; extraHourFee: number };
  };
  credentials: {
    username: string;
    password: string;
  };
  viewMode: 'grid' | 'list';
}

export interface DailyStats {
  date: string;
  totalCars: number;
  totalBikes: number;
  totalRickshaws: number;
  totalVehicles: number;
  totalIncome: number;
  vehicles: Vehicle[];
}

export interface Receipt {
  id: string;
  vehicleNumber: string;
  vehicleType: 'car' | 'bike' | 'rickshaw';
  entryTime: Date;
  exitTime?: Date;
  fee?: number;
  barcode: string;
}