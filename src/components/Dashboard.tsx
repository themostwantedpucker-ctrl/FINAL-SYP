import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useParkingContext } from '@/contexts/ParkingContext';
import { formatCurrency } from '@/utils/calculations';
import { LogOut, Car, Bike, Truck, DollarSign } from 'lucide-react';
import WalkInClients from './WalkInClients';
import PermanentClients from './PermanentClients';
import CurrentlyParked from './CurrentlyParked';
import History from './History';
import AdminSettings from './AdminSettings';

const Dashboard: React.FC = () => {
  const [hideIncomeStatus, setHideIncomeStatus] = useState(false);
  const { logout, settings, getTodayStats, getCurrentlyParked } = useParkingContext();
  const [activeTab, setActiveTab] = useState('walkin');
  
  const todayStats = getTodayStats();
  const currentlyParked = getCurrentlyParked();
  
  const currentCars = currentlyParked.filter(v => v.type === 'car').length;
  const currentBikes = currentlyParked.filter(v => v.type === 'bike').length;
  const currentRickshaws = currentlyParked.filter(v => v.type === 'rickshaw').length;
  const currentTotal = currentlyParked.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-3 sm:p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{settings.siteName}</h1>
          <Button onClick={logout} variant="outline" size="sm" className="ml-2">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="p-3 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card>
            <CardHeader className="pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center">
                <Car className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-blue-500" />
                <span className="truncate">Cars</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-lg sm:text-2xl font-bold">{currentCars}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Currently parked</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Bike className="h-4 w-4 mr-2 text-green-500" />
                Bikes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentBikes}</div>
              <p className="text-xs text-muted-foreground">Currently parked</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Truck className="h-4 w-4 mr-2 text-orange-500" />
                Rickshaws
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentRickshaws}</div>
              <p className="text-xs text-muted-foreground">Currently parked</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentTotal}</div>
              <p className="text-xs text-muted-foreground">Currently parked</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-primary" />
                Today's Income
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                style={{ minWidth: 32, padding: '0 8px', fontSize: 12 }}
                onClick={() => setHideIncomeStatus(v => !v)}
                tabIndex={0}
                aria-label="Hide today's income"
              >
                {hideIncomeStatus ? 'Show' : 'Hide'}
              </Button>
            </CardHeader>
            <CardContent>
              {hideIncomeStatus ? (
                <div className="text-2xl font-bold text-muted-foreground">Hidden</div>
              ) : (
                <div className="text-2xl font-bold">{formatCurrency(todayStats.totalIncome)}</div>
              )}
              <p className="text-xs text-muted-foreground">Resets at midnight</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
            <TabsTrigger value="walkin" className="text-xs sm:text-sm p-2 sm:p-3">Walk-in</TabsTrigger>
            <TabsTrigger value="permanent" className="text-xs sm:text-sm p-2 sm:p-3">Permanent</TabsTrigger>
            <TabsTrigger value="parked" className="text-xs sm:text-sm p-2 sm:p-3 col-span-2 sm:col-span-1">Currently Parked</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm p-2 sm:p-3">History</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm p-2 sm:p-3">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="walkin" className="mt-3 sm:mt-6">
            <WalkInClients />
          </TabsContent>
          
          <TabsContent value="permanent" className="mt-3 sm:mt-6">
            <PermanentClients />
          </TabsContent>
          
          <TabsContent value="parked" className="mt-3 sm:mt-6">
            <CurrentlyParked />
          </TabsContent>
          
          <TabsContent value="history" className="mt-3 sm:mt-6">
            <History />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-3 sm:mt-6">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;