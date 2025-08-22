import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useParkingContext } from '@/contexts/ParkingContext';
import { calculateParkingFee, formatCurrency, formatTime } from '@/utils/calculations';
import { Search, Clock, DollarSign, LogOut } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const CurrentlyParked: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeType, setActiveType] = useState<'car' | 'bike' | 'rickshaw'>('car');
  const { getCurrentlyParked, settings, exitVehicle } = useParkingContext();
  const { toast } = useToast();

  const currentlyParked = getCurrentlyParked();

  // Categorize vehicles
  const vehiclesByType = {
    car: currentlyParked.filter(v => v.type === 'car'),
    bike: currentlyParked.filter(v => v.type === 'bike'),
    rickshaw: currentlyParked.filter(v => v.type === 'rickshaw')
  };

  // Filter by search
  const filteredVehicles = vehiclesByType[activeType].filter(vehicle =>
    vehicle.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDirectExit = (vehicle: any) => {
    const exitTime = new Date();
    const fee = calculateParkingFee(new Date(vehicle.entryTime), exitTime, vehicle.type, settings.pricing);
    
    if (window.confirm(`Exit ${vehicle.number}?\nFee: ${formatCurrency(fee)}`)) {
      exitVehicle(vehicle.id);
      toast({
        title: "Vehicle exited",
        description: `${vehicle.type.toUpperCase()} ${vehicle.number} has been checked out. Fee: ${formatCurrency(fee)}`,
      });
    }
  };

  const getCurrentFee = (vehicle: any) => {
    const now = new Date();
    return calculateParkingFee(vehicle.entryTime, now, vehicle.type, settings.pricing);
  };

  const getTimeParked = (entryTime: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - entryTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Currently Parked Vehicles
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search by vehicle number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeType} onValueChange={val => setActiveType(val as 'car' | 'bike' | 'rickshaw')}>
            <TabsList className="mb-4">
              <TabsTrigger value="car">Cars ({vehiclesByType.car.length})</TabsTrigger>
              <TabsTrigger value="bike">Bikes ({vehiclesByType.bike.length})</TabsTrigger>
              <TabsTrigger value="rickshaw">Rickshaws ({vehiclesByType.rickshaw.length})</TabsTrigger>
            </TabsList>
            <TabsContent value={activeType}>
              {filteredVehicles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {vehiclesByType[activeType].length === 0
                      ? `No ${activeType === 'car' ? 'cars' : activeType === 'bike' ? 'bikes' : 'rickshaws'} currently parked`
                      : 'No vehicles match your search'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Vehicle Number</th>
                        <th className="text-left p-3 font-semibold">Vehicle Type</th>
                        <th className="text-left p-3 font-semibold">Entry</th>
                        <th className="text-left p-3 font-semibold">Duration</th>
                        <th className="text-left p-3 font-semibold">Current Fee</th>
                        <th className="text-left p-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.map((vehicle) => (
                        <tr key={vehicle.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-semibold">{vehicle.number}</td>
                          <td className="p-3">
                            <Badge
                              variant={vehicle.type === 'car' ? 'default' : vehicle.type === 'bike' ? 'secondary' : 'outline'}
                            >
                              {vehicle.type.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">{formatTime(new Date(vehicle.entryTime))}</td>
                          <td className="p-3 text-sm">{getTimeParked(new Date(vehicle.entryTime))}</td>
                          <td className="p-3 text-sm font-semibold text-primary">
                            {formatCurrency(getCurrentFee(vehicle))}
                          </td>
                          <td className="p-3">
                            <Button
                              onClick={() => handleDirectExit(vehicle)}
                              variant="destructive"
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <LogOut className="w-4 h-4" />
                              Exit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Summary */}
      {filteredVehicles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {filteredVehicles.length}
                </div>
                <p className="text-sm text-muted-foreground">
                  {activeType === 'car' ? 'Cars' : activeType === 'bike' ? 'Bikes' : 'Rickshaws'}
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(filteredVehicles.reduce((sum, v) => sum + getCurrentFee(v), 0))}
                </div>
                <p className="text-sm text-muted-foreground">Total Expected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CurrentlyParked;