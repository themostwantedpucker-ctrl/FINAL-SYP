import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useParkingContext } from '@/contexts/ParkingContext';
import { useToast } from '@/hooks/use-toast';
import { generateBarcode, formatTime, formatTimeOnly, calculateParkingFee, formatCurrency } from '@/utils/calculations';
import { QrCode, Printer, Search } from 'lucide-react';
import JsBarcode from 'jsbarcode';

// Helper to calculate duration between two times (entryTime, exitTime)
function getTimeParked(entryTime: Date, exitTime: Date) {
  const diffMs = exitTime.getTime() - entryTime.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffHours > 0) {
    return `${diffHours}h ${diffMins}m`;
  }
  return `${diffMins}m`;
}


const WalkInClients: React.FC = () => {
  // Unified exit handler for merged input bar
  const handleUnifiedExit = (value: string) => {
    // Heuristic: barcode is at least 10 chars and all digits (or contains only allowed barcode chars)
    if (value.length >= 10 && /[0-9]{6,}/.test(value)) {
      handleBarcodeExitUnified(value);
    } else {
      // Do not alter user input; use it as-is for manual exit
      setExitNumber(value);
      handleManualExit(value);
    }
  };

  // Helper to use barcode exit logic with unified input bar
  const handleBarcodeExitUnified = (value: string) => {
    setExitBarcode(value);
    // Immediately show the vehicle number in the exit input if we can resolve it
    const matched = vehicles.find(v => generateBarcode(v.number, v.entryTime) === value && !v.exitTime);
    if (matched) {
      setExitNumber(matched.number);
    }
    setTimeout(() => {
      handleBarcodeExit(value);
      setExitBarcode('');
    }, 10);
  };

  const barcodeRef = useRef(null);
  const vehicleNumberInputRef = useRef<HTMLInputElement>(null);
  // Lock the exit input to a vehicle number while a scan is being processed
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<'car' | 'bike' | 'rickshaw'>('car');
  const [exitNumber, setExitNumber] = useState('');
  const [exitBarcode, setExitBarcode] = useState('');
  // Suppress subsequent scanner characters briefly after detecting a barcode
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [showExitReceipt, setShowExitReceipt] = useState(false);
  const [exitReceiptData, setExitReceiptData] = useState<any>(null);
  
  const { addVehicle, exitVehicle, vehicles, settings } = useParkingContext();
  const { toast } = useToast();

  const handleEntry = async () => {
    try {
      if (!vehicleNumber.trim()) {
        toast({
          title: "Error",
          description: "Please enter vehicle number",
          variant: "destructive"
        });
        return;
      }
      // Prevent duplicate entry if vehicle is already parked
      const alreadyParked = vehicles.some(v => v.number.trim().toLowerCase() === vehicleNumber.trim().toLowerCase() && !v.exitTime);
      if (alreadyParked) {
        toast({
          title: "Duplicate Entry",
          description: `Vehicle ${vehicleNumber.trim().toUpperCase()} is already parked!`,
          variant: "destructive"
        });
        return;
      }

      const entryTime = new Date();
      const { id: vehicleId, entryTime: persistedEntryTime } = await addVehicle({
        number: vehicleNumber,
        type: vehicleType,
        entryTime
      });

      // Use the exact persisted entryTime from backend/local storage to ensure barcode matches
      const barcode = generateBarcode(vehicleNumber, persistedEntryTime);
      
      const receiptData = {
        id: vehicleId,
        vehicleNumber,
        vehicleType,
        entryTime: persistedEntryTime,
        barcode
      };
      setCurrentReceipt(receiptData);
      setShowReceipt(true);
      setVehicleNumber('');
      toast({
        title: "Vehicle entered",
        description: `${vehicleType.toUpperCase()} ${vehicleNumber} has been registered`,
      });
      // Wait for the receipt modal and barcode to render, then trigger print
      setTimeout(() => {
        printReceipt();
        // Automatically close the receipt modal after print dialog appears
        setTimeout(() => {
          setShowReceipt(false);
          // Focus the vehicle number input
          vehicleNumberInputRef.current?.focus();
        }, 1000);
      }, 350);
    } catch (err) {
      console.error('Vehicle entry failed:', err);
      toast({
        title: 'Error',
        description: 'Failed to enter vehicle. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleManualExit = (vehicleNumber?: string) => {
    const numberToExit = vehicleNumber || exitNumber;
    if (!numberToExit.trim()) {
      toast({
        title: "Error",
        description: "Please enter vehicle number",
        variant: "destructive"
      });
      return;
    }

    const vehicle = vehicles.find(v => 
      v.number.toLowerCase() === numberToExit.toLowerCase() && !v.exitTime
    );

    if (!vehicle) {
      toast({
        title: "Error",
        description: "Vehicle not found or already exited",
        variant: "destructive"
      });
      return;
    }

    // Show exit receipt with calculated fee before confirming exit
    showExitReceiptWithFee(vehicle);
  };

  const showExitReceiptWithFee = (vehicle: any) => {
    const exitTime = new Date();
    const calculatedFee = calculateParkingFee(
      vehicle.entryTime,
      exitTime,
      vehicle.type,
      settings.pricing
    );

    const exitData = {
      ...vehicle,
      exitTime,
      calculatedFee,
      barcode: generateBarcode(vehicle.number, vehicle.entryTime)
    };

    setExitReceiptData(exitData);
    setShowExitReceipt(true);
  };

  const confirmExit = () => {
    if (exitReceiptData) {
      exitVehicle(exitReceiptData.id);
      setExitNumber('');
      setExitBarcode('');
      setShowExitReceipt(false);
      setExitReceiptData(null);
      
      toast({
        title: "Vehicle exited",
        description: `${exitReceiptData.type.toUpperCase()} ${exitReceiptData.number} has exited`,
      });
    }
  };

  const handleBarcodeExit = (barcode?: string) => {
    const value = typeof barcode === 'string' ? barcode.trim() : exitBarcode.trim();
    if (!value) {
      toast({
        title: "Error",
        description: "Please enter barcode",
        variant: "destructive"
      });
      return;
    }

    // Normalize scanned value to uppercase for robust comparison
    const scanned = value.toUpperCase();
    console.log('Scanned barcode:', scanned);
    console.log('Available vehicles:', vehicles.filter(v => !v.exitTime).map(v => ({
      number: v.number,
      entryTime: v.entryTime,
      barcode: generateBarcode(v.number, v.entryTime)
    })));

    const vehicle = vehicles.find(v => {
      const vehicleBarcode = generateBarcode(v.number, v.entryTime);
      const match = !v.exitTime && (vehicleBarcode === scanned || scanned.includes(vehicleBarcode));
      console.log(`Comparing: scanned="${scanned}" vs generated="${vehicleBarcode}" for vehicle ${v.number} => ${match ? 'MATCH' : 'NO MATCH'}`);
      return match;
    });

    if (!vehicle) {
      toast({
        title: "Error",
        description: `Invalid barcode or vehicle already exited. Scanned: ${value}`,
        variant: "destructive"
      });
      return;
    }

    // Replace the scanned barcode in the input with just the vehicle number
    setExitNumber(vehicle.number);

    // Show exit receipt with calculated fee
    showExitReceiptWithFee(vehicle);

    // Auto-exit quickly after preparing receipt data
    setTimeout(() => {
      // Double-check the vehicle still exists and hasn't been exited by someone else
      const currentVehicle = vehicles.find(v => v.id === vehicle.id && !v.exitTime);
      if (currentVehicle) {
        confirmExit();
      }
    }, 50);
  };

  // Generate barcode when receipt is shown
  useEffect(() => {
    if (showReceipt && currentReceipt && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, currentReceipt.barcode, {
          format: "CODE128",
          // Make bars thicker/taller so print scaling still yields a scannable code
          width: 3.5,
          height: 74,
          // Show encoded text to verify and assist scanners that read both bars and text
          displayValue: true,
          fontSize: 18,
          textMargin: 8,
          lineColor: "#000000",
          background: "#FFFFFF",
          // Larger quiet zones ~10 mm each side -> 10 * (96/25.4) ≈ 37.8 px
          marginLeft: 38,
          marginRight: 38,
          // Keep top/bottom minimal (no requirement)
          marginTop: 0,
          marginBottom: 0
        });
        try {
          (barcodeRef.current as any)?.setAttribute?.('shape-rendering', 'crispEdges');
        } catch {}
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [showReceipt, currentReceipt]);

  const printReceipt = () => {
    const printContent = document.getElementById('receipt-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Parking Receipt</title>
              <style>
                body { font-family: 'Courier New', monospace; margin: 0; padding: 15px; font-weight: bold; }
                .receipt { max-width: 1350px; margin: 0 auto; text-align: center; }
                .receipt h3 { margin: 0 0 20px 0; font-size: 81px; font-weight: bold; }
                .receipt div { font-size: 63px; line-height: 1.8; font-weight: bold; }
                .flex { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: bold; }
                .font-semibold { font-weight: bold; }
                .border-t { border-top: 2px dashed #000; padding-top: 12px; margin-bottom: 12px; }
                .barcode-container { margin: 15px 0; }
                .barcode-container svg { width: 77%; height: auto; }
                .text-xs { font-size: 54px; margin-top: 15px; font-weight: bold; }
                @media print {
                  body { margin: 0; padding: 8px; font-weight: bold; }
                  .receipt { max-width: none; width: 100%; }
                  .border-2 { border: none !important; }
                  .bg-muted\/50 { background: none !important; }
                  * { font-weight: bold !important; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const printExitReceipt = () => {
    const printContent = document.getElementById('exit-receipt-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Exit Receipt</title>
              <style>
                body { font-family: 'Courier New', monospace; margin: 0; padding: 15px; font-weight: bold; }
                .receipt { max-width: 300px; margin: 0 auto; text-align: center; }
                .receipt h3 { margin: 0 0 20px 0; font-size: 18px; font-weight: bold; }
                .receipt div { font-size: 14px; line-height: 1.8; font-weight: bold; }
                .flex { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: bold; }
                .font-semibold { font-weight: bold; }
                .border-t { border-top: 2px dashed #000; padding-top: 12px; margin-bottom: 12px; }
                .barcode-container { margin: 15px 0; }
                .barcode-container svg { width: 100%; height: auto; }
                .text-xs { font-size: 12px; margin-top: 15px; font-weight: bold; }
                .text-lg { font-size: 16px; font-weight: bold; }
                @media print {
                  body { margin: 0; padding: 8px; font-weight: bold; }
                  .receipt { max-width: none; width: 100%; }
                  .border-2 { border: none !important; }
                  .bg-muted\/50 { background: none !important; }
                  * { font-weight: bold !important; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Unified Vehicle Entry and Exit Interface */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Entry Box */}
        <div className="bg-blue-100 rounded-lg p-6 flex-1 max-w-md">
          <div className="mb-4">
            <span className="block text-lg font-semibold mb-2">Walkin Client</span>
            <div className="flex gap-2 mb-4">
              <Input
                ref={vehicleNumberInputRef}
                placeholder="Registration No."
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleEntry();
                  }
                }}
                className="flex-1"
                style={{ maxWidth: 200 }}
              />
              <Button
                onClick={() => setVehicleNumber('')}
                variant="outline"
                size="sm"
                className="px-3"
              >
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-6 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="vehicleType"
                  value="car"
                  checked={vehicleType === 'car'}
                  onChange={() => setVehicleType('car')}
                  className="accent-blue-600"
                />
                Car
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="vehicleType"
                  value="bike"
                  checked={vehicleType === 'bike'}
                  onChange={() => setVehicleType('bike')}
                  className="accent-blue-600"
                />
                Bike
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="vehicleType"
                  value="rickshaw"
                  checked={vehicleType === 'rickshaw'}
                  onChange={() => setVehicleType('rickshaw')}
                  className="accent-blue-600"
                />
                Rickshaw
              </label>
            </div>
            <Button onClick={handleEntry} className="w-full">Enter</Button>
          </div>
        </div>
        {/* Exit Box */}
        <div className="bg-green-100 rounded-lg p-12 flex-1 max-w-2xl min-h-[450px] shadow-lg">
          <span className="block text-3xl font-bold mb-4">Exit</span>
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Exit (Vehicle Number or Barcode)"
                value={exitNumber}
                onChange={(e) => {
                  const value = e.target.value;
                  // Heuristic: barcode is at least 10 chars and contains at least 6 consecutive digits
                  const isBarcode = value.length >= 10 && /[0-9]{6,}/.test(value);
                  // Do not modify what the user sees in the input
                  setExitNumber(value);
                  if (isBarcode) {
                    handleBarcodeExitUnified(value);
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value;
                    const isBarcode = value.length >= 10 && /[0-9]{6,}/.test(value);
                    if (isBarcode) {
                      // Do not alter input; process barcode directly
                      setExitNumber(value);
                      e.preventDefault();
                      handleBarcodeExitUnified(value);
                      return;
                    }
                    // Manual exit with whatever is in the input
                    handleUnifiedExit(exitNumber);
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={() => setExitNumber('')}
                variant="outline"
                size="sm"
                className="px-3"
              >
                Clear
              </Button>
            </div>
            <Button onClick={() => handleUnifiedExit(exitNumber)} className="w-full mb-4">Exit Vehicle</Button>

          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && currentReceipt && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Entry Receipt
              <div className="flex gap-2">
                {/* Print button removed, print is now automatic after entry */}
                <Button onClick={() => setShowReceipt(false)} variant="outline" size="sm">
                  Close
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div id="receipt-content" className="text-center border-2 border-dashed border-border p-4 bg-muted/50">
              <div className="receipt">
                <h3 className="font-bold mb-4" style={{ fontSize: '20.25px' }}>{settings.siteName || 'PARKING RECEIPT'}</h3>
                <div className="text-lg font-mono" style={{lineHeight: '1.6', fontSize: '15.75px'}}>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', letterSpacing: '2px', fontSize: '15.75px' }}>
    <span className="font-semibold" style={{ minWidth: 170, textAlign: 'left', display: 'inline-block' }}>Date:</span>
    <span style={{ minWidth: 170, textAlign: 'right', display: 'inline-block' }}>{new Date(currentReceipt.entryTime).toLocaleDateString()}</span>
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', letterSpacing: '2px', fontSize: '15.75px' }}>
    <span className="font-semibold" style={{ minWidth: 170, textAlign: 'left', display: 'inline-block' }}>Entry Time:</span>
    <span style={{ minWidth: 170, textAlign: 'right', display: 'inline-block' }}>{formatTimeOnly(currentReceipt.entryTime)}</span>
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', letterSpacing: '2px', fontSize: '15.75px' }}>
    <span className="font-semibold" style={{ minWidth: 170, textAlign: 'left', display: 'inline-block' }}>Vehicle Type:</span>
    <span style={{ minWidth: 170, textAlign: 'right', display: 'inline-block' }}>{currentReceipt.vehicleType.toUpperCase()}</span>
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', letterSpacing: '2px', fontSize: '15.75px' }}>
    <span className="font-semibold" style={{ minWidth: 170, textAlign: 'left', display: 'inline-block' }}>Vehicle Number:</span>
    <span style={{ minWidth: 170, textAlign: 'right', display: 'inline-block' }}>{currentReceipt.vehicleNumber}</span>
  </div>
  <div className="border-t border-dashed border-gray-400 pt-3 mb-3"></div>
  <div className="barcode-container mb-3">
    <svg ref={barcodeRef}></svg>
    <p className="text-xs mt-2 text-muted-foreground" style={{ fontSize: '22.5px' }}>{currentReceipt.vehicleNumber}</p>
  </div>
  <div className="border-t border-dashed border-gray-400 pt-3"></div>
  <p className="text-xs mt-3 font-normal" style={{ fontSize: '27px' }}>Please keep this receipt for exit</p>
  <p className="text-xs mt-3 font-normal text-center" style={{ fontSize: '20.25px', lineHeight: '1.3' }}>
    گاڑی کو مکمل لاک شیشے لازمی بند کریں۔ گاڑی کے اندر سامان، گاڑی پر سکریچ اور کسی حادثے کی صورت میں ادارہ ذمہ دار نہیں ہوگا۔ گاڑی کی چیکنگ بوقت ضرور کی جائے گی۔
  </p>
</div>
</div>
              
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exit Receipt Modal */}
      {showExitReceipt && exitReceiptData && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onClick={(e) => {
      // Only trigger confirmExit if clicking the overlay, not the card or its children
      if (e.target === e.currentTarget) {
        confirmExit();
      }
    }}
    style={{ cursor: 'pointer' }}
  >
    <Card className="bg-white rounded-lg max-w-md w-full mx-4" onClick={e => e.stopPropagation()} style={{ cursor: 'default' }}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Exit Receipt - Confirm Payment
                <div className="flex gap-2">
                  <Button onClick={printExitReceipt} size="sm">
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div id="exit-receipt-content" className="text-center border-2 border-dashed border-border p-4 bg-muted/50">
                <div className="receipt">
                  <h3 className="font-bold text-lg mb-4">{settings.siteName || 'PARKING RECEIPT'}</h3>
                  <div className="text-sm font-mono" style={{lineHeight: '1.8'}}>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Vehicle Number:</span>
                      <span>{exitReceiptData.number}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Vehicle Type:</span>
                      <span>{exitReceiptData.type.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Entry Date:</span>
                      <span>{new Date(exitReceiptData.entryTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Entry Time:</span>
                      <span>{formatTimeOnly(exitReceiptData.entryTime)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Exit Date:</span>
                      <span>{new Date(exitReceiptData.exitTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between mb-4">
                      <span className="font-semibold">Exit Time:</span>
                      <span>{formatTimeOnly(exitReceiptData.exitTime)}</span>
                    </div>
                    <div className="border-t border-dashed border-gray-400 pt-3 mb-3"></div>
                    <div className="flex justify-between mb-2">
  <span className="font-semibold">Duration:</span>
  <span>{getTimeParked(new Date(exitReceiptData.entryTime), new Date(exitReceiptData.exitTime))}</span>
</div>
<div className="flex justify-between mb-4 text-lg font-bold">
  <span>Total Fee:</span>
  <span>{formatCurrency(exitReceiptData.calculatedFee)}</span>
</div>
                    <div className="border-t border-dashed border-gray-400 pt-3 mb-3"></div>
                    <div className="barcode-container mb-3">
                      <svg ref={barcodeRef}></svg>
                      <p className="text-xs mt-2 text-muted-foreground">Vehicle Exit Code</p>
                    </div>
                    <div className="border-t border-dashed border-gray-400 pt-3"></div>
                    <p className="text-xs mt-3 font-normal">Thank you for using our parking service</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button onClick={confirmExit} className="flex-1">
                  Confirm Exit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WalkInClients;