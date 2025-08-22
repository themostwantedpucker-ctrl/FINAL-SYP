import { Vehicle, Settings, DailyStats } from '@/types/parking';
import { apiService } from '@/services/api';

const STORAGE_KEYS = {
  VEHICLES: 'parking_vehicles',
  SETTINGS: 'parking_settings',
  DAILY_STATS: 'parking_daily_stats',
  PERMANENT_CLIENTS: 'parking_permanent_clients'
};

export const getDefaultSettings = (): Settings => ({
  siteName: 'Smart Parking System',
  pricing: {
    car: { baseHours: 10, baseFee: 100, extraHourFee: 10 },
    bike: { baseHours: 10, baseFee: 50, extraHourFee: 5 },
    rickshaw: { baseHours: 10, baseFee: 100, extraHourFee: 10 }
  },
  credentials: {
    username: 'admin',
    password: 'admin 1234'
  },
  viewMode: 'list'
});

// Fallback to localStorage if API fails
export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to storage:', error);
  }
};

// API-first functions with localStorage fallback
export const loadVehicles = async (): Promise<Vehicle[]> => {
  try {
    return await apiService.getVehicles();
  } catch (error) {
    console.warn('API failed, using localStorage:', error);
    return loadFromStorage(STORAGE_KEYS.VEHICLES, []);
  }
};

export const saveVehicles = async (vehicles: Vehicle[]): Promise<void> => {
  try {
    // Save to localStorage as backup
    saveToStorage(STORAGE_KEYS.VEHICLES, vehicles);
    // Note: Individual vehicle operations handled by context
  } catch (error) {
    console.error('Failed to save vehicles:', error);
  }
};

export const loadSettings = async (): Promise<Settings> => {
  try {
    return await apiService.getSettings();
  } catch (error) {
    console.warn('API failed, using localStorage:', error);
    return loadFromStorage(STORAGE_KEYS.SETTINGS, getDefaultSettings());
  }
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  try {
    await apiService.updateSettings(settings);
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
  } catch (error) {
    console.error('Failed to save settings:', error);
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
  }
};

export const loadDailyStats = async (): Promise<DailyStats[]> => {
  try {
    return await apiService.getDailyStats();
  } catch (error) {
    console.warn('API failed, using localStorage:', error);
    return loadFromStorage(STORAGE_KEYS.DAILY_STATS, []);
  }
};

export const saveDailyStats = async (stats: DailyStats[]): Promise<void> => {
  try {
    await apiService.updateDailyStats(stats);
    saveToStorage(STORAGE_KEYS.DAILY_STATS, stats);
  } catch (error) {
    console.error('Failed to save daily stats:', error);
    saveToStorage(STORAGE_KEYS.DAILY_STATS, stats);
  }
};

export const loadPermanentClients = async (): Promise<Vehicle[]> => {
  try {
    return await apiService.getPermanentClients();
  } catch (error) {
    console.warn('API failed, using localStorage:', error);
    return loadFromStorage(STORAGE_KEYS.PERMANENT_CLIENTS, []);
  }
};

export const savePermanentClients = async (clients: Vehicle[]): Promise<void> => {
  try {
    // Note: Individual client operations handled by context
    saveToStorage(STORAGE_KEYS.PERMANENT_CLIENTS, clients);
  } catch (error) {
    console.error('Failed to save permanent clients:', error);
    saveToStorage(STORAGE_KEYS.PERMANENT_CLIENTS, clients);
  }
};