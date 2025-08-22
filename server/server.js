const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Data file paths (support persistent disk via env DATA_DIR)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const VEHICLES_FILE = path.join(DATA_DIR, 'vehicles.json');
const PERMANENT_CLIENTS_FILE = path.join(DATA_DIR, 'permanent-clients.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const DAILY_STATS_FILE = path.join(DATA_DIR, 'daily-stats.json');
const BACKUP_FILE = path.join(DATA_DIR, 'backup.json');

// Supabase setup (optional; enabled when env vars are present)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'parking';
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Helper functions for file operations
async function readJsonFile(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeJsonFile(filePath, defaultValue);
      return defaultValue;
    }
    throw error;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Supabase helpers
async function uploadBackupToSupabase(backupData) {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  try {
    const payload = JSON.stringify(backupData, null, 2);
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload('backup.json', Buffer.from(payload), {
        contentType: 'application/json',
        upsert: true,
      });
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error('Supabase upload failed:', err.message || err);
    return { ok: false, reason: 'upload_failed', error: String(err.message || err) };
  }
}

async function downloadBackupFromSupabase() {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  try {
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .download('backup.json');
    if (error) throw error;
    const text = await data.text();
    const json = JSON.parse(text);
    return { ok: true, data: json };
  } catch (err) {
    if (err && err.message && /Object not found|not found/i.test(err.message)) {
      return { ok: false, reason: 'not_found' };
    }
    console.error('Supabase download failed:', err.message || err);
    return { ok: false, reason: 'download_failed', error: String(err.message || err) };
  }
}

// Default settings
const defaultSettings = {
  siteName: "Park Master Pro",
  pricing: {
    car: { baseHours: 2, baseFee: 50, extraHourFee: 25 },
    bike: { baseHours: 2, baseFee: 20, extraHourFee: 10 },
    rickshaw: { baseHours: 2, baseFee: 30, extraHourFee: 15 }
  },
  credentials: {
    username: "admin",
    password: "admin123"
  },
  viewMode: "grid"
};

// Routes

// Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const settings = await readJsonFile(SETTINGS_FILE, defaultSettings);
    
    if (username === settings.credentials.username && password === settings.credentials.password) {
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Vehicles
app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await readJsonFile(VEHICLES_FILE, []);
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

app.post('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await readJsonFile(VEHICLES_FILE, []);
    const newVehicle = {
      ...req.body,
      id: Date.now().toString(),
      entryTime: new Date().toISOString()
    };
    vehicles.push(newVehicle);
    await writeJsonFile(VEHICLES_FILE, vehicles);
    res.json(newVehicle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});

app.put('/api/vehicles/:id/exit', async (req, res) => {
  try {
    const vehicles = await readJsonFile(VEHICLES_FILE, []);
    const vehicleIndex = vehicles.findIndex(v => v.id === req.params.id);
    
    if (vehicleIndex === -1) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    vehicles[vehicleIndex] = {
      ...vehicles[vehicleIndex],
      exitTime: new Date().toISOString(),
      fee: req.body.fee
    };
    
    await writeJsonFile(VEHICLES_FILE, vehicles);
    res.json(vehicles[vehicleIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// Permanent Clients
app.get('/api/permanent-clients', async (req, res) => {
  try {
    const clients = await readJsonFile(PERMANENT_CLIENTS_FILE, []);
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permanent clients' });
  }
});

app.post('/api/permanent-clients', async (req, res) => {
  try {
    const clients = await readJsonFile(PERMANENT_CLIENTS_FILE, []);
    const newClient = {
      ...req.body,
      id: Date.now().toString(),
      isPermanent: true,
      paymentStatus: 'unpaid',
      entryTime: new Date().toISOString()
    };
    clients.push(newClient);
    await writeJsonFile(PERMANENT_CLIENTS_FILE, clients);
    res.json(newClient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add permanent client' });
  }
});

app.put('/api/permanent-clients/:id', async (req, res) => {
  try {
    const clients = await readJsonFile(PERMANENT_CLIENTS_FILE, []);
    const clientIndex = clients.findIndex(c => c.id === req.params.id);
    
    if (clientIndex === -1) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    clients[clientIndex] = { ...clients[clientIndex], ...req.body };
    await writeJsonFile(PERMANENT_CLIENTS_FILE, clients);
    res.json(clients[clientIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update permanent client' });
  }
});

app.delete('/api/permanent-clients/:id', async (req, res) => {
  try {
    const clients = await readJsonFile(PERMANENT_CLIENTS_FILE, []);
    const filteredClients = clients.filter(c => c.id !== req.params.id);
    await writeJsonFile(PERMANENT_CLIENTS_FILE, filteredClients);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove permanent client' });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await readJsonFile(SETTINGS_FILE, defaultSettings);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    await writeJsonFile(SETTINGS_FILE, req.body);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Daily Stats
app.get('/api/daily-stats', async (req, res) => {
  try {
    const stats = await readJsonFile(DAILY_STATS_FILE, []);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch daily stats' });
  }
});

app.post('/api/daily-stats', async (req, res) => {
  try {
    const stats = await readJsonFile(DAILY_STATS_FILE, []);
    const existingIndex = stats.findIndex(s => s.date === req.body.date);
    
    if (existingIndex !== -1) {
      stats[existingIndex] = req.body;
    } else {
      stats.push(req.body);
    }
    
    await writeJsonFile(DAILY_STATS_FILE, stats);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update daily stats' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Backup endpoint (upload all data)
app.post('/api/backup', async (req, res) => {
  try {
    const backupData = req.body;
    // Save to local backup file
    await writeJsonFile(BACKUP_FILE, backupData);
    
    // Also overwrite live data files to keep them in sync
    if (backupData.vehicles) {
      await writeJsonFile(VEHICLES_FILE, backupData.vehicles);
    }
    if (backupData.permanentClients) {
      await writeJsonFile(PERMANENT_CLIENTS_FILE, backupData.permanentClients);
    }
    if (backupData.settings) {
      await writeJsonFile(SETTINGS_FILE, backupData.settings);
    }
    if (backupData.dailyStats) {
      await writeJsonFile(DAILY_STATS_FILE, backupData.dailyStats);
    }
    
    // Upload to Supabase storage (best-effort)
    const up = await uploadBackupToSupabase(backupData);
    if (!up.ok && up.reason !== 'supabase_not_configured') {
      console.warn('Backup saved locally but failed to upload to Supabase');
    }

    res.json({ success: true, supabase: up.ok });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save backup' });
  }
});

// Restore endpoint (download all data)
app.get('/api/backup', async (req, res) => {
  try {
    // Try remote first, fallback to local
    const down = await downloadBackupFromSupabase();
    if (down.ok) {
      return res.json(down.data || {});
    }
    const backupData = await readJsonFile(BACKUP_FILE, {});
    res.json(backupData || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to load backup' });
  }
});

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../dist')));

// For any route not handled by your API, serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Initialize and start server
async function startServer() {
  try {
    await ensureDataDir();
    // On cold start, attempt to restore local files from remote backup (best-effort)
    try {
      const down = await downloadBackupFromSupabase();
      if (down.ok && down.data) {
        const b = down.data;
        if (b.vehicles) await writeJsonFile(VEHICLES_FILE, b.vehicles);
        if (b.permanentClients) await writeJsonFile(PERMANENT_CLIENTS_FILE, b.permanentClients);
        if (b.settings) await writeJsonFile(SETTINGS_FILE, b.settings);
        if (b.dailyStats) await writeJsonFile(DAILY_STATS_FILE, b.dailyStats);
        await writeJsonFile(BACKUP_FILE, b);
        console.log('✅ Restored data from Supabase backup at startup');
      } else {
        console.log('ℹ️ No Supabase backup found or not configured; using local files');
      }
    } catch (e) {
      console.warn('Startup restore skipped due to error:', e.message || e);
    }
    app.listen(PORT, () => {
      console.log(`🚀 Park Master Pro Backend Server running on port ${PORT}`);
      console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
      if (process.env.DATA_DIR) {
        console.log(`💾 Using data directory: ${process.env.DATA_DIR}`);
      } else {
        console.log(`💾 Using data directory: ${DATA_DIR}`);
      }
      if (supabase) {
        console.log(`☁️ Supabase storage enabled (bucket: ${SUPABASE_BUCKET})`);
      } else {
        console.log('☁️ Supabase storage not configured');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
