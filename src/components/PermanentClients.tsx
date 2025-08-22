import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useParkingContext } from '@/contexts/ParkingContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, generateBarcode } from '@/utils/calculations';
import { Search, UserPlus, Trash2, Receipt, Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';

const PermanentClients: React.FC = () => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [cnic, setCnic] = useState('');
  const [vehicleType, setVehicleType] = useState<'car' | 'bike' | 'rickshaw'>('car');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [contact, setContact] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const barcodeRef = useRef<SVGSVGElement>(null);

  const { permanentClients, addPermanentClient, updatePermanentClient, removePermanentClient, settings } = useParkingContext();
  const { toast } = useToast();

  const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;
  const CONTACT_REGEX = /^\+92\d{10}$/;
  const handleRegistration = () => {
    if (!vehicleNumber.trim() || !clientName.trim() || !cnic.trim() || !monthlyFee.trim() || !contact.trim()) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }
    if (!CNIC_REGEX.test(cnic)) {
      toast({
        title: "Invalid CNIC",
        description: "CNIC must be in xxxxx-xxxxxxx-x format (13 digits, with dashes)",
        variant: "destructive"
      });
      return;
    }
    if (!CONTACT_REGEX.test(contact)) {
      toast({
        title: "Invalid Contact Number",
        description: "Contact number must be in +92xxxxxxxxxx format (Pakistani mobile)",
        variant: "destructive"
      });
      return;
    }
    if (cnic.length > 15) {
      toast({
        title: "CNIC Too Long",
        description: "CNIC should not exceed 15 characters (including dashes)",
        variant: "destructive"
      });
      return;
    }
    if (contact.length > 13) {
      toast({
        title: "Contact Number Too Long",
        description: "Contact number should not exceed 13 characters (+92xxxxxxxxxx)",
        variant: "destructive"
      });
      return;
    }

    const existingClient = permanentClients.find(
      client => client.number.toLowerCase() === vehicleNumber.toLowerCase()
    );

    if (existingClient) {
      toast({
        title: "Error",
        description: "Vehicle already registered",
        variant: "destructive"
      });
      return;
    }

    addPermanentClient({
      number: vehicleNumber,
      clientName,
      type: vehicleType,
      entryTime: new Date(),
      cnic,
      monthlyFee: parseInt(monthlyFee),
      contact,
      paymentStatus: 'unpaid'
    });

    setVehicleNumber('');
    setClientName('');
    setCnic('');
    setMonthlyFee('');
    setContact('');

    toast({
      title: "Success",
      description: "Permanent client registered successfully",
    });
  };

  const togglePaymentStatus = (clientId: string, currentStatus: 'paid' | 'unpaid') => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    const paymentDate = newStatus === 'paid' ? new Date() : undefined;

    updatePermanentClient(clientId, { 
      paymentStatus: newStatus,
      paymentDate 
    });

    toast({
      title: "Payment status updated",
      description: `Status changed to ${newStatus}`,
    });
  };

  const handleRemoveClient = (clientId: string, vehicleNumber: string) => {
    removePermanentClient(clientId);
    toast({
      title: "Client Removed",
      description: `Vehicle ${vehicleNumber} has been removed from permanent clients`,
    });
  };

  const generateReceipt = (client: any) => {
    const barcode = generateBarcode(client.number, new Date());
    setCurrentReceipt({
      ...client,
      barcode,
      receiptDate: new Date()
    });
    setShowReceipt(true);
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setEditModalOpen(true);
  };

  const handleUpdateClient = () => {
    if (!editingClient) return;
    if (!CNIC_REGEX.test(editingClient.cnic)) {
      toast({
        title: "Invalid CNIC",
        description: "CNIC must be in xxxxx-xxxxxxx-x format (13 digits, with dashes)",
        variant: "destructive"
      });
      return;
    }
    if (!CONTACT_REGEX.test(editingClient.contact)) {
      toast({
        title: "Invalid Contact Number",
        description: "Contact number must be in +92xxxxxxxxxx format (Pakistani mobile)",
        variant: "destructive"
      });
      return;
    }
    if (editingClient.cnic.length > 15) {
      toast({
        title: "CNIC Too Long",
        description: "CNIC should not exceed 15 characters (including dashes)",
        variant: "destructive"
      });
      return;
    }
    if (editingClient.contact.length > 13) {
      toast({
        title: "Contact Number Too Long",
        description: "Contact number should not exceed 13 characters (+92xxxxxxxxxx)",
        variant: "destructive"
      });
      return;
    }
    updatePermanentClient(editingClient.id, {
      clientName: editingClient.clientName,
      cnic: editingClient.cnic,
      contact: editingClient.contact,
      monthlyFee: editingClient.monthlyFee,
      type: editingClient.type,
    });

    setEditingClient(null);
    setEditModalOpen(false);

    toast({
      title: "Client updated",
      description: "Client information updated successfully",
    });
  };

  // Generate barcode when receipt is shown
  useEffect(() => {
    if (showReceipt && currentReceipt && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, currentReceipt.barcode, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: false
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [showReceipt, currentReceipt]);

  const printReceipt = () => {
    const printContent = document.getElementById('permanent-receipt-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Permanent Vehicle Receipt</title>
              <style>
                body { font-family: 'Courier New', monospace; margin: 0; padding: 15px; font-weight: bold; }
                .receipt { max-width: 300px; margin: 0 auto; text-align: center; }
                .receipt h3 { margin: 0 0 20px 0; font-size: 18px; font-weight: bold; }
                .receipt div { font-size: 14px; line-height: 1.8; font-weight: bold; }
                .flex { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: bold; }
                .font-semibold { font-weight: bold; }
                .border-t { border-top: 2px dashed #000; padding-top: 12px; margin-bottom: 12px; }
                .barcode-container { margin: 15px 0; }
                .text-xs { font-size: 12px; margin-top: 15px; font-weight: bold; }
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

  const filteredClients = permanentClients.filter(client =>
    client.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.cnic?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paidClients = filteredClients.filter(client => client.paymentStatus === 'paid');
  const unpaidClients = filteredClients.filter(client => client.paymentStatus === 'unpaid');

  const ClientCard = ({ client }: { client: any }) => (
    <Card key={client.id} className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{client.number}</span>
              <Badge variant={client.type === 'car' ? 'default' : client.type === 'bike' ? 'secondary' : 'outline'}>
                {client.type.toUpperCase()}
              </Badge>
            </div>
            {client.clientName && (
              <p className="text-sm font-medium">{client.clientName}</p>
            )}
            <p className="text-sm text-muted-foreground">CNIC: {client.cnic}</p>
            <p className="text-sm text-muted-foreground">Contact: {client.contact || '-'}</p>
            <p className="text-sm">Monthly Fee: {formatCurrency(client.monthlyFee || 0)}</p>
            {client.paymentDate && (
              <p className="text-xs text-muted-foreground">
                Last Payment: {new Date(client.paymentDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Badge variant={client.paymentStatus === 'paid' ? 'default' : 'destructive'}>
              {client.paymentStatus?.toUpperCase()}
            </Badge>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => generateReceipt(client)}
                variant="outline"
              >
                <Receipt className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleEditClient(client)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => togglePaymentStatus(client.id, client.paymentStatus)}
                variant={client.paymentStatus === 'paid' ? 'outline' : 'default'}
              >
                Mark as {client.paymentStatus === 'paid' ? 'Unpaid' : 'Paid'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Permanent Client</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove vehicle <strong>{client.number}</strong> from permanent clients? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRemoveClient(client.id, client.number)}>
                      Remove Client
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Edit Modal */}
      {editModalOpen && editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="bg-white rounded-lg max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Edit Permanent Client
                <Button size="sm" variant="outline" onClick={() => { setEditModalOpen(false); setEditingClient(null); }}>X</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input className="text-lg"
                placeholder="Client's full name"
                value={editingClient.clientName || ''}
                onChange={e => setEditingClient({ ...editingClient, clientName: e.target.value })}
              />
              <Input className="text-lg"
                placeholder="CNIC of owner"
                value={editingClient.cnic || ''}
                maxLength={15}
                onChange={e => {
                  let val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length > 13) val = val.slice(0, 13);
                  let formatted = val;
                  if (val.length > 5) formatted = val.slice(0,5) + '-' + val.slice(5);
                  if (val.length > 12) formatted = formatted.slice(0,13) + '-' + formatted.slice(13);
                  setEditingClient({ ...editingClient, cnic: formatted });
                }}
              />
              <Input className="text-lg"
                placeholder="Contact number"
                value={editingClient.contact?.startsWith('+92') ? editingClient.contact : '+92'}
                maxLength={13}
                onChange={e => {
                  let val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.startsWith('92')) val = val.slice(2);
                  if (val.length > 10) val = val.slice(0, 10);
                  setEditingClient({ ...editingClient, contact: '+92' + val });
                }}
              />
              <Input className="text-lg"
                placeholder="Negotiated monthly fee (PKR)"
                type="number"
                value={editingClient.monthlyFee || ''}
                onChange={e => setEditingClient({ ...editingClient, monthlyFee: e.target.value })}
              />
              <Select value={editingClient.type} onValueChange={(value: 'car' | 'bike' | 'rickshaw') => setEditingClient({ ...editingClient, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                  <SelectItem value="rickshaw">Rickshaw</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setEditModalOpen(false); setEditingClient(null); }}>Cancel</Button>
                <Button onClick={handleUpdateClient}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <Tabs defaultValue="registration" className="w-full">
        <TabsList>
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="history">Registration History</TabsTrigger>
        </TabsList>

        <TabsContent value="registration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="h-5 w-5 mr-2" />
                Register Permanent Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input className="text-lg"
                  placeholder="Vehicle number"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
                <Input className="text-lg"
                  placeholder="Client's full name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input className="text-lg"
                  placeholder="CNIC of owner"
                  value={cnic}
                  maxLength={15}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length > 13) val = val.slice(0, 13);
                    let formatted = val;
                    if (val.length > 5) formatted = val.slice(0,5) + '-' + val.slice(5);
                    if (val.length > 12) formatted = formatted.slice(0,13) + '-' + formatted.slice(13);
                    setCnic(formatted);
                  }}
                />
                <Input className="text-lg"
                  placeholder="Negotiated monthly fee (PKR)"
                  type="number"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Select value={vehicleType} onValueChange={(value: 'car' | 'bike' | 'rickshaw') => setVehicleType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="bike">Bike</SelectItem>
                    <SelectItem value="rickshaw">Rickshaw</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="text-lg"
                  placeholder="Contact number"
                  value={contact.startsWith('+92') ? contact : '+92'}
                  maxLength={13}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.startsWith('92')) val = val.slice(2);
                    if (val.length > 10) val = val.slice(0, 10);
                    setContact('+92' + val);
                  }}
                />
              </div>
              <Button onClick={handleRegistration} className="w-full">
                Register Client
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Registration History
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <Input className="text-lg"
                    placeholder="Search by vehicle number or CNIC"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All ({filteredClients.length})</TabsTrigger>
                  <TabsTrigger value="paid">Paid ({paidClients.length})</TabsTrigger>
                  <TabsTrigger value="unpaid">Unpaid ({unpaidClients.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  {filteredClients.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No permanent clients found</p>
                  ) : (
                    <div className="space-y-4">
                      {filteredClients.map(client => <ClientCard key={client.id} client={client} />)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="paid" className="mt-4">
                  {paidClients.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No paid clients found</p>
                  ) : (
                    <div className="space-y-4">
                      {paidClients.map(client => <ClientCard key={client.id} client={client} />)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="unpaid" className="mt-4">
                  {unpaidClients.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No unpaid clients found</p>
                  ) : (
                    <div className="space-y-4">
                      {unpaidClients.map(client => <ClientCard key={client.id} client={client} />)}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Receipt Modal */}
      {showReceipt && currentReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="bg-white rounded-lg max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Permanent Vehicle Receipt
                <div className="flex gap-2">
                  <Button onClick={printReceipt} size="sm">
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button onClick={() => setShowReceipt(false)} variant="outline" size="sm">
                    Close
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div id="permanent-receipt-content" className="text-center border-2 border-dashed border-border p-4 bg-muted/50">
                <div className="receipt">
                  <h3 className="font-bold text-lg mb-4">{settings.siteName || 'PARKING RECEIPT'}</h3>
                  <div className="text-sm font-mono" style={{lineHeight: '1.8'}}>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Name:</span>
                      <span>{currentReceipt.clientName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Contact:</span>
                      <span>{currentReceipt.contact || '-'}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Date:</span>
                      <span>{new Date(currentReceipt.receiptDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Vehicle Number:</span>
                      <span>{currentReceipt.number}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">CNIC:</span>
                      <span>{currentReceipt.cnic}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Vehicle Type:</span>
                      <span>{currentReceipt.type.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Monthly Fee:</span>
                      <span>{formatCurrency(currentReceipt.monthlyFee || 0)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Payment Status:</span>
                      <span>{currentReceipt.paymentStatus?.toUpperCase()}</span>
                    </div>
                    {currentReceipt.paymentDate && (
                      <div className="flex justify-between mb-4">
                        <span className="font-semibold">Payment Date:</span>
                        <span>{new Date(currentReceipt.paymentDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="border-t border-dashed border-gray-400 pt-3 mb-3"></div>
                    <div className="barcode-container mb-3">
                      <svg ref={barcodeRef}></svg>
                      <p className="text-xs mt-2 text-muted-foreground">Permanent Vehicle ID</p>
                    </div>
                    <div className="border-t border-dashed border-gray-400 pt-3"></div>
                    <p className="text-xs mt-3 font-normal">Keep this receipt for your records</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PermanentClients;