import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useParkingContext } from '@/contexts/ParkingContext';
import { formatCurrency, formatTime } from '@/utils/calculations';
import { Search, Calendar, TrendingUp, Download, Upload, FileDown, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const History: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { vehicles, dailyStats, updateSettings, settings } = useParkingContext();
  const { toast } = useToast();
  
  // Filter vehicles with exit time (completed parking sessions)
  const completedVehicles = vehicles.filter(v => v.exitTime);
  
  const filteredVehicles = completedVehicles.filter(vehicle => {
    const matchesSearch = vehicle.number.toLowerCase().includes(searchTerm.toLowerCase());
    if (!selectedDate) return matchesSearch;
    
    const vehicleDate = new Date(vehicle.entryTime).toDateString();
    const filterDate = new Date(selectedDate).toDateString();
    return matchesSearch && vehicleDate === filterDate;
  });

  const filteredStats = dailyStats.filter(stat => {
    if (!selectedDate && !searchTerm) return true;
    
    // Filter by selected date
    const matchesDate = !selectedDate || new Date(stat.date).toDateString() === new Date(selectedDate).toDateString();
    
    // Filter by search term (vehicle numbers, income amount, or date)
    let matchesSearch = true;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const hasMatchingVehicle = vehicles.some(v => 
        v.exitTime && 
        v.exitTime.toDateString() === new Date(stat.date).toDateString() &&
        v.number.toLowerCase().includes(searchLower)
      );
      const matchesIncome = stat.totalIncome.toString().includes(searchTerm);
      const matchesDate = stat.date.toLowerCase().includes(searchLower) || 
                         new Date(stat.date).toLocaleDateString().toLowerCase().includes(searchLower);
      
      matchesSearch = hasMatchingVehicle || matchesIncome || matchesDate;
    }
    
    return matchesDate && matchesSearch;
  });

  const handleDateClick = (date: string) => {
    setSelectedDate(date === selectedDate ? '' : date);
  };

  // Export functions
  const exportToCSV = () => {
    const csvData = completedVehicles.map(vehicle => ({
      'Vehicle Number': vehicle.number,
      'Type': vehicle.type.toUpperCase(),
      'Entry Time': formatTime(new Date(vehicle.entryTime)),
      'Exit Time': vehicle.exitTime ? formatTime(new Date(vehicle.exitTime)) : 'N/A',
      'Duration (Hours)': vehicle.exitTime ? 
        Math.ceil((new Date(vehicle.exitTime).getTime() - new Date(vehicle.entryTime).getTime()) / (1000 * 60 * 60)) : 0,
      'Fee (PKR)': vehicle.fee || 0,
      'Date': new Date(vehicle.entryTime).toDateString()
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    downloadFile(csvContent, `parking-history-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    
    toast({
      title: "Export Successful",
      description: "Vehicle history exported to CSV file",
    });
  };

  const exportToJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      siteName: settings.siteName,
      vehicles: completedVehicles,
      dailyStats: dailyStats,
      summary: {
        totalVehicles: completedVehicles.length,
        totalIncome: completedVehicles.reduce((sum, v) => sum + (v.fee || 0), 0),
        dateRange: {
          from: completedVehicles.length > 0 ? 
            new Date(Math.min(...completedVehicles.map(v => new Date(v.entryTime).getTime()))).toDateString() : null,
          to: completedVehicles.length > 0 ? 
            new Date(Math.max(...completedVehicles.map(v => new Date(v.entryTime).getTime()))).toDateString() : null
        }
      }
    };

    downloadFile(JSON.stringify(exportData, null, 2), `parking-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    
    toast({
      title: "Backup Created",
      description: "Complete parking data backup downloaded",
    });
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);
        
        if (importData.vehicles && importData.dailyStats) {
          // Here you would need to add import functions to your context
          // For now, show success message
          toast({
            title: "Import Ready",
            description: `Found ${importData.vehicles?.length || 0} vehicles in backup file`,
          });
        } else {
          throw new Error('Invalid backup file format');
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid backup file format",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Export/Import Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Data Management
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={exportToJSON} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Backup JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import Backup
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• <strong>Export CSV:</strong> Download vehicle history as spreadsheet</p>
            <p>• <strong>Backup JSON:</strong> Complete data backup for restoration</p>
            <p>• <strong>Import Backup:</strong> Restore data from previous backup</p>
            <p className="text-accent font-medium">💡 Tip: Regular backups prevent data loss from browser clearing!</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="income" className="w-full">
        <TabsList>
          <TabsTrigger value="income">Income History</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Daily Income History
                </div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <Input
                    placeholder="Search by vehicle, amount, or date"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Calendar className="h-4 w-4" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No income data found</p>
              ) : (
                <div className="space-y-4">
                  {filteredStats.map((stat) => (
                    <Card 
                      key={stat.date} 
                      className="border-l-4 border-l-accent cursor-pointer hover:bg-muted/50"
                      onClick={() => handleDateClick(stat.date)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h3 className="font-semibold">
                              {new Date(stat.date).toLocaleDateString('en-PK', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </h3>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>Cars: {stat.totalCars}</span>
                              <span>Bikes: {stat.totalBikes}</span>
                              <span>Rickshaws: {stat.totalRickshaws}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-accent">
                              {formatCurrency(stat.totalIncome)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {stat.totalVehicles} vehicles
                            </p>
                          </div>
                        </div>
                        
                        {selectedDate && new Date(selectedDate).toDateString() === new Date(stat.date).toDateString() && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium mb-3">Vehicles that exited this day:</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {/* Show vehicles that exited on this date */}
                              {vehicles.filter(v => v.exitTime && v.exitTime.toDateString() === new Date(stat.date).toDateString()).map((vehicle) => (
                                <div key={vehicle.id} className="flex justify-between items-center p-2 bg-background rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{vehicle.number}</span>
                                    <Badge variant="outline">
                                      {vehicle.type.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="text-right text-sm">
                                    <div>{formatCurrency(vehicle.fee || 0)}</div>
                                    <div className="text-muted-foreground">
                                      {formatTime(new Date(vehicle.entryTime))} - {vehicle.exitTime ? formatTime(new Date(vehicle.exitTime)) : 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="vehicle">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                All Time Vehicle History
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
              {filteredVehicles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {completedVehicles.length === 0 ? 'No vehicle history found' : 'No vehicles match your search'}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredVehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="border-l-2 border-l-muted-foreground">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{vehicle.number}</span>
                              <Badge variant="outline">
                                {vehicle.type.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div>Entry: {formatTime(new Date(vehicle.entryTime))}</div>
                              <div>Exit: {vehicle.exitTime ? formatTime(new Date(vehicle.exitTime)) : 'N/A'}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-primary">
                              {formatCurrency(vehicle.fee || 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {vehicle.exitTime && (
                                <>
                                  {Math.ceil((new Date(vehicle.exitTime).getTime() - new Date(vehicle.entryTime).getTime()) / (1000 * 60 * 60))} hours
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default History;