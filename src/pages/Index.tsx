import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ParkingProvider, useParkingContext } from "@/contexts/ParkingContext";
import LoginPage from "@/components/LoginPage";
import Dashboard from "@/components/Dashboard";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isAuthenticated } = useParkingContext();
  return isAuthenticated ? <Dashboard /> : <LoginPage />;
};

const Index = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ParkingProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </ParkingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default Index;
