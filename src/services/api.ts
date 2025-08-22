// Dynamic API base URL with localStorage override so we can change servers without rebuilds
export function getConfiguredApiBaseUrl(): string {
  try {
    const override = localStorage.getItem('api_base_url');
    if (override && override.trim()) return override.trim();
  } catch {}
  // Fallback order: env -> same-origin /api. No hardcoded external URLs.
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  return envUrl && envUrl.trim() ? envUrl.trim() : `${window.location.origin}/api`;
}

export function setConfiguredApiBaseUrl(url: string) {
  try {
    if (url && url.trim()) {
      localStorage.setItem('api_base_url', url.trim());
    } else {
      localStorage.removeItem('api_base_url');
    }
  } catch {}
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const base = getConfiguredApiBaseUrl();
    const url = `${base}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async login(username: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // Vehicles
  async getVehicles() {
    return this.request('/vehicles');
  }

  async addVehicle(vehicle: any) {
    return this.request('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicle),
    });
  }

  async exitVehicle(vehicleId: string, fee: number) {
    return this.request(`/vehicles/${vehicleId}/exit`, {
      method: 'PUT',
      body: JSON.stringify({ fee }),
    });
  }

  // Permanent Clients
  async getPermanentClients() {
    return this.request('/permanent-clients');
  }

  async addPermanentClient(client: any) {
    return this.request('/permanent-clients', {
      method: 'POST',
      body: JSON.stringify(client),
    });
  }

  async updatePermanentClient(clientId: string, updates: any) {
    return this.request(`/permanent-clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async removePermanentClient(clientId: string) {
    return this.request(`/permanent-clients/${clientId}`, {
      method: 'DELETE',
    });
  }

  // Settings
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settings: any) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Daily Stats
  async getDailyStats() {
    return this.request('/daily-stats');
  }

  async updateDailyStats(stats: any) {
    return this.request('/daily-stats', {
      method: 'POST',
      body: JSON.stringify(stats),
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export const apiService = new ApiService();
