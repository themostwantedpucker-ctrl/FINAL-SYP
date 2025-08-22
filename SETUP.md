# Park Master Pro - Setup Guide

## 🚀 Quick Start

This parking management system now includes both frontend and backend functionality, making it a complete dynamic solution for your parking business.

### Features Added:
1. ✅ **Remove Button for Permanent Vehicles** - With warning dialog before deletion
2. ✅ **Backend API** - Full REST API for dynamic data management
3. ✅ **Fixed Receipt Printing** - Only prints receipt with Code 128 barcode

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

## 🛠️ Installation

### 1. Install Frontend Dependencies
```bash
npm install
```

### 2. Install Backend Dependencies
```bash
npm run install:server
```

## 🚀 Running the Application

### Option 1: Run Full Stack (Recommended)
```bash
npm run dev:full
```
This starts both frontend (port 5173) and backend (port 3001) simultaneously.

### Option 2: Run Separately

**Frontend only:**
```bash
npm run dev
```

**Backend only:**
```bash
npm run server:dev
```

## 🌐 Access URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **API Health Check**: http://localhost:3001/api/health

## 🔐 Default Login Credentials

- **Username**: admin
- **Password**: admin123

## 📱 New Features

### 1. Remove Permanent Vehicles
- Navigate to "Permanent Clients" tab
- Click the red trash icon next to any vehicle
- Confirm deletion in the warning dialog
- Vehicle will be permanently removed from the system

### 2. Receipt Printing with Barcode
- When a vehicle enters, click "Print Receipt"
- The receipt now includes a scannable Code 128 barcode
- Only the receipt content prints (not the entire page)
- Barcode can be scanned for vehicle identification

### 3. Backend API Integration
- All data is now stored on the server
- Multiple workers can access the same data
- Real-time updates across all connected devices
- Data persistence between sessions

## 🗂️ API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Vehicles
- `GET /api/vehicles` - Get all vehicles
- `POST /api/vehicles` - Add new vehicle
- `PUT /api/vehicles/:id/exit` - Mark vehicle as exited

### Permanent Clients
- `GET /api/permanent-clients` - Get all permanent clients
- `POST /api/permanent-clients` - Add new permanent client
- `PUT /api/permanent-clients/:id` - Update permanent client
- `DELETE /api/permanent-clients/:id` - Remove permanent client

### Settings & Stats
- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update system settings
- `GET /api/daily-stats` - Get daily statistics
- `POST /api/daily-stats` - Update daily statistics

## 📊 Data Storage

Data is stored in JSON files in the `server/data/` directory:
- `vehicles.json` - All vehicle entries/exits
- `permanent-clients.json` - Permanent client registrations
- `settings.json` - System settings and pricing
- `daily-stats.json` - Daily statistics and reports

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```
VITE_API_URL=http://localhost:3001/api
```

### Backend Configuration
The backend runs on port 3001 by default. To change:
```bash
PORT=3002 npm run server
```

## 🚀 Deployment

### Frontend Deployment
```bash
npm run build
```
Deploy the `dist/` folder to any static hosting service.

### Backend Deployment
Deploy the `server/` folder to any Node.js hosting service (Heroku, Railway, etc.).

### Full Stack Deployment
For platforms like Railway or Render, use:
```bash
npm run dev:full
```

## 🛠️ Troubleshooting

### Common Issues:

1. **Port Already in Use**
   - Change ports in package.json scripts
   - Kill existing processes: `npx kill-port 5173 3001`

2. **API Connection Failed**
   - Ensure backend is running on port 3001
   - Check `.env` file has correct API URL
   - Verify CORS settings in server.js

3. **Barcode Not Displaying**
   - Ensure `jsbarcode` is installed: `npm install jsbarcode`
   - Check browser console for errors

4. **Data Not Persisting**
   - Ensure `server/data/` directory has write permissions
   - Check server logs for file system errors

## 📞 Support

For issues or questions:
1. Check the browser console for errors
2. Check the server logs in terminal
3. Ensure all dependencies are installed
4. Verify API endpoints are accessible

## 🎯 Next Steps

Your parking management system is now fully dynamic and ready for production use! Your workers can:

- Access the system from any device with internet
- Add/remove vehicles in real-time
- Print receipts with scannable barcodes
- Manage permanent clients with full CRUD operations
- View real-time statistics and reports

The system automatically saves all data and provides a professional interface for parking management operations.
