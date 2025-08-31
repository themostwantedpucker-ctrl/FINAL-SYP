import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Vehicle, Settings, DailyStats } from '@/types/parking';
import { 
  loadVehicles, 
  saveVehicles, 
  loadSettings, 
  saveSettings, 
  loadDailyStats, 
  saveDailyStats,
  loadPermanentClients,
  savePermanentClients,
  getDefaultSettings
} from '@/utils/storage';
import { apiService, getConfiguredApiBaseUrl } from '@/services/api';
import { calculateParkingFee, getTodayString } from '@/utils/calculations';

interface ParkingContextType {
  vehicles: Vehicle[];
  permanentClients: Vehicle[];
  settings: Settings;
  dailyStats: DailyStats[];
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<{ id: string; entryTime: Date }>;
  exitVehicle: (vehicleId: string) => Promise<void>;
  addPermanentClient: (client: Omit<Vehicle, 'id'>) => void;
  updatePermanentClient: (clientId: string, updates: Partial<Vehicle>) => void;
  removePermanentClient: (clientId: string) => void;
  updateSettings: (newSettings: Settings) => void;
  getCurrentlyParked: () => Vehicle[];
  getTodayStats: () => DailyStats;
}

const ParkingContext = createContext<ParkingContextType | undefined>(undefined);

export const useParkingContext = () => {
  const context = useContext(ParkingContext);
  if (!context) {
    throw new Error('useParkingContext must be used within a ParkingProvider');
  }
  return context;
};

export const ParkingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [permanentClients, setPermanentClients] = useState<Vehicle[]>([]);
  const [settings, setSettings] = useState<Settings>(getDefaultSettings());
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Load data from API with fallback to localStorage
    const loadData = async () => {
      try {
        // Load vehicles and convert string dates back to Date objects
        const loadedVehicles = (await loadVehicles()).map(vehicle => ({
          ...vehicle,
          entryTime: new Date(vehicle.entryTime),
          exitTime: vehicle.exitTime ? new Date(vehicle.exitTime) : undefined,
          paymentDate: vehicle.paymentDate ? new Date(vehicle.paymentDate) : undefined
        }));
        setVehicles(loadedVehicles);
        
        const loadedClients = (await loadPermanentClients()).map(client => ({
          ...client,
          entryTime: new Date(client.entryTime),
          exitTime: client.exitTime ? new Date(client.exitTime) : undefined,
          paymentDate: client.paymentDate ? new Date(client.paymentDate) : undefined
        }));
        setPermanentClients(loadedClients);
        
        // Load settings from API, then merge with defaults to guarantee required fields
        const rawSettings = await loadSettings();
        const defaultSettings = getDefaultSettings();
        const mergedSettings: Settings = {
          ...defaultSettings,
          ...rawSettings,
          credentials: {
            ...defaultSettings.credentials,
            ...(rawSettings as any)?.credentials
          }
        };
        setSettings(mergedSettings);

        // After settings are loaded, auto-auth if credentials unchanged
        try {
          const storedAuth = localStorage.getItem('auth_logged_in') === 'true';
          const storedSig = localStorage.getItem('auth_cred_sig') || '';
          const currentSig = `${mergedSettings.credentials.username}|${mergedSettings.credentials.password}`;
          // Update stored signature to current backend settings
          localStorage.setItem('auth_cred_sig', currentSig);
          if (storedAuth && storedSig === currentSig) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            localStorage.setItem('auth_logged_in', 'false');
          }
        } catch {}
        
        // Rebuild all daily stats from loaded vehicles instead of just loading from storage
        if (loadedVehicles.length > 0) {
          rebuildAllDailyStats(loadedVehicles);
        } else {
          const stats = await loadDailyStats();
          setDailyStats(stats);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    
    loadData();
    
    // Reset daily stats at midnight
    const checkMidnight = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        updateDailyStats();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkMidnight);
  }, []);

  // Global Auto Restore poll (works even when not on Admin Settings page)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Only run if Auto Restore is explicitly enabled
        const autoRestoreEnabled = localStorage.getItem('autoRestore') === 'true';
        if (!autoRestoreEnabled) return;
        
        // Check if user was recently active (within last 15 seconds)
        const lastActivity = localStorage.getItem('last_user_activity');
        if (lastActivity) {
          const timeSinceActivity = Date.now() - parseInt(lastActivity);
          if (timeSinceActivity < 15000) {
            console.log('Skipping auto restore - user recently active');
            return;
          }
        }
        
        // Fetch live data directly from API
        const freshVehicles = await apiService.getVehicles();
        const freshClients = await apiService.getPermanentClients();
        const freshSettings = await apiService.getSettings();
        const freshStats = await apiService.getDailyStats();

        const sigVehicles = (arr: any[]) => JSON.stringify(
          arr.map((v: any) => ({ id: v.id, exitTime: v.exitTime || null, fee: v.fee || 0 })).sort((a: any, b: any) => a.id.localeCompare(b.id))
        );
        const sigClients = (arr: any[]) => JSON.stringify(arr.map((c: any) => c.id).sort());
        const sigSettings = (s: any) => JSON.stringify({
          username: s?.credentials?.username,
          password: s?.credentials?.password,
          siteName: s?.siteName,
          viewMode: s?.viewMode,
        });

        const currentVehicles = JSON.parse(localStorage.getItem('parking_vehicles') || '[]') as any[];
        const currentClients = JSON.parse(localStorage.getItem('parking_permanent_clients') || '[]') as any[];
        const currentSettings = JSON.parse(localStorage.getItem('parking_settings') || '{}') as any;

        // Always replace local data with server data when Auto Restore is enabled
        localStorage.setItem('parking_vehicles', JSON.stringify(freshVehicles));
        localStorage.setItem('parking_permanent_clients', JSON.stringify(freshClients));
        localStorage.setItem('parking_settings', JSON.stringify(freshSettings));
        localStorage.setItem('parking_daily_stats', JSON.stringify(freshStats));
        
        // Always reload to ensure UI reflects server state
        window.location.reload();
      } catch (error) {
        console.error('Auto Restore failed:', error);
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);


  const login = (username: string, password: string): boolean => {
    if (username === settings.credentials.username && password === settings.credentials.password) {
      setIsAuthenticated(true);
      try {
        const sig = `${settings.credentials.username}|${settings.credentials.password}`;
        localStorage.setItem('auth_logged_in', 'true');
        localStorage.setItem('auth_cred_sig', sig);
      } catch {}
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.setItem('auth_logged_in', 'false');
    } catch {}
  };

  const addVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<{ id: string; entryTime: Date }> => {
    const tempId = Date.now().toString();
    const newVehicle: Vehicle = {
      ...vehicle,
      id: tempId
    };

    // Save to API first and prefer server-assigned ID
    let serverId: string | null = null;
    let serverEntryTime: Date | null = null;
    try {
      const created: any = await apiService.addVehicle(newVehicle);
      if (created && created.id) {
        serverId = String(created.id);
      }
      if (created && created.entryTime) {
        serverEntryTime = new Date(created.entryTime);
      }
    } catch (error) {
      console.error('Failed to save vehicle to API:', error);
    }

    const finalVehicle: Vehicle = {
      ...newVehicle,
      id: serverId || newVehicle.id,
      entryTime: serverEntryTime || newVehicle.entryTime,
    } as Vehicle;

    const updatedVehicles = [...vehicles, finalVehicle];
    setVehicles(updatedVehicles);
    saveVehicles(updatedVehicles);
    updateDailyStats(updatedVehicles);

    // Sync complete vehicle list to server immediately after entry (mirror exit behavior)
    try {
      const vehicles = JSON.parse(localStorage.getItem('parking_vehicles') || '[]');
      const permanentClients = JSON.parse(localStorage.getItem('parking_permanent_clients') || '[]');
      const settings = JSON.parse(localStorage.getItem('parking_settings') || '{}');
      const dailyStats = JSON.parse(localStorage.getItem('parking_daily_stats') || '[]');
      const backup = { vehicles: updatedVehicles, permanentClients, settings, dailyStats, backupDate: new Date().toISOString() };

      const API_BASE_URL = getConfiguredApiBaseUrl();
      await fetch(`${API_BASE_URL}/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup)
      });
    } catch (error) {
      console.error('Failed to sync after vehicle entry:', error);
    }

    return { id: finalVehicle.id, entryTime: finalVehicle.entryTime };
  };

  const exitVehicle = async (vehicleId: string) => {
    // Mark user as active to prevent auto restore interruption
    try {
      localStorage.setItem('last_user_activity', Date.now().toString());
    } catch {}
    
    const exitTime = new Date();
    const vehicle = vehicles.find(v => v.id === vehicleId && !v.exitTime);
    
    if (vehicle) {
      const fee = calculateParkingFee(vehicle.entryTime, exitTime, vehicle.type, settings.pricing);
      
      // Save to API first
      try {
        await apiService.exitVehicle(vehicleId, fee);
      } catch (error) {
        console.error('Failed to exit vehicle via API (will retry once):', error);
        // Minimal retry after short delay
        try {
          await new Promise(res => setTimeout(res, 2000));
          await apiService.exitVehicle(vehicleId, fee);
        } catch (err2) {
          console.error('Retry failed to exit vehicle via API:', err2);
        }
      }
    }
    
    const updatedVehicles = vehicles.map(vehicle => {
      if (vehicle.id === vehicleId && !vehicle.exitTime) {
        const fee = calculateParkingFee(vehicle.entryTime, exitTime, vehicle.type, settings.pricing);
        return { ...vehicle, exitTime, fee };
      }
      return vehicle;
    });
    
    setVehicles(updatedVehicles);
    saveVehicles(updatedVehicles);
    updateDailyStats(updatedVehicles);
    
    // Sync complete vehicle list to server immediately after exit
    try {
      const vehicles = JSON.parse(localStorage.getItem('parking_vehicles') || '[]');
      const permanentClients = JSON.parse(localStorage.getItem('parking_permanent_clients') || '[]');
      const settings = JSON.parse(localStorage.getItem('parking_settings') || '{}');
      const dailyStats = JSON.parse(localStorage.getItem('parking_daily_stats') || '[]');
      const backup = { vehicles: updatedVehicles, permanentClients, settings, dailyStats, backupDate: new Date().toISOString() };
      
      const API_BASE_URL = getConfiguredApiBaseUrl();
      await fetch(`${API_BASE_URL}/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup)
      });
    } catch (error) {
      console.error('Failed to sync after vehicle exit:', error);
    }
  };

  const addPermanentClient = (client: Omit<Vehicle, 'id'>) => {
    const newClient: Vehicle = {
      ...client,
      id: Date.now().toString(),
      isPermanent: true,
      paymentStatus: 'unpaid'
    };
    
    const updatedClients = [...permanentClients, newClient];
    // Attempt to persist to API (non-blocking to avoid UI lag)
    apiService.addPermanentClient(newClient).catch((err) => {
      console.error('Failed to add permanent client to API:', err);
    });
    setPermanentClients(updatedClients);
    savePermanentClients(updatedClients);
  };

  const updatePermanentClient = (clientId: string, updates: Partial<Vehicle>) => {
    const updatedClients = permanentClients.map(client =>
      client.id === clientId ? { ...client, ...updates } : client
    );
    
    // Attempt to persist to API (non-blocking)
    apiService.updatePermanentClient(clientId, updates).catch((err) => {
      console.error('Failed to update permanent client on API:', err);
    });
    setPermanentClients(updatedClients);
    savePermanentClients(updatedClients);
  };

  const removePermanentClient = (clientId: string) => {
    const updatedClients = permanentClients.filter(client => client.id !== clientId);
    // Attempt to persist to API (non-blocking)
    apiService.removePermanentClient(clientId).catch((err) => {
      console.error('Failed to remove permanent client on API:', err);
    });
    setPermanentClients(updatedClients);
    savePermanentClients(updatedClients);
  };

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const getCurrentlyParked = (): Vehicle[] => {
    return vehicles.filter(vehicle => !vehicle.exitTime);
  };

  const rebuildAllDailyStats = (vehiclesToUse: Vehicle[]) => {
    // Get all unique dates from vehicle entries and exits
    const allDates = new Set<string>();
    vehiclesToUse.forEach(v => {
      allDates.add(v.entryTime.toDateString());
      if (v.exitTime) {
        allDates.add(v.exitTime.toDateString());
      }
    });

    const rebuiltStats: DailyStats[] = Array.from(allDates).map(dateString => {
      // Get all vehicles that entered on this date (for counts)
      const enteredVehicles = vehiclesToUse.filter(v => 
        v.entryTime.toDateString() === dateString
      );
      
      // Get all vehicles that exited on this date (for income)
      const exitedVehicles = vehiclesToUse.filter(v => 
        v.exitTime && v.exitTime.toDateString() === dateString
      );

      return {
        date: dateString,
        totalCars: enteredVehicles.filter(v => v.type === 'car').length,
        totalBikes: enteredVehicles.filter(v => v.type === 'bike').length,
        totalRickshaws: enteredVehicles.filter(v => v.type === 'rickshaw').length,
        totalVehicles: enteredVehicles.length,
        // Income from vehicles that exited on this date
        totalIncome: exitedVehicles.reduce((sum, v) => sum + (v.fee || 0), 0),
        // Show vehicles that entered on this date
        vehicles: enteredVehicles
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort newest first

    setDailyStats(rebuiltStats);
    saveDailyStats(rebuiltStats);
  };

  const updateDailyStats = (updatedVehicleList?: Vehicle[]) => {
    const vehiclesToUse = updatedVehicleList || vehicles;
    rebuildAllDailyStats(vehiclesToUse);
  };

  const getTodayStats = (): DailyStats => {
    const today = getTodayString();
    return dailyStats.find(s => s.date === today) || {
      date: today,
      totalCars: 0,
      totalBikes: 0,
      totalRickshaws: 0,
      totalVehicles: 0,
      totalIncome: 0,
      vehicles: []
    };
  };

  return (
    <ParkingContext.Provider value={{
      vehicles,
      permanentClients,
      settings,
      dailyStats,
      isAuthenticated,
      login,
      logout,
      addVehicle,
      exitVehicle,
      addPermanentClient,
      updatePermanentClient,
      removePermanentClient,
      updateSettings,
      getCurrentlyParked,
      getTodayStats
    }}>
      {children}
    </ParkingContext.Provider>
  );
};
