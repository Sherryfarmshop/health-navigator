import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import LabResultsList from "@/pages/lab-results/LabResultsList";
import LabResultDetail from "@/pages/lab-results/LabResultDetail";
import AddLabResult from "@/pages/lab-results/AddLabResult";
import MedicationsList from "@/pages/medications/MedicationsList";
import SymptomsPage from "@/pages/symptoms/SymptomsPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 1
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/lab-results" component={LabResultsList} />
        <Route path="/lab-results/add" component={AddLabResult} />
        <Route path="/lab-results/:id" component={LabResultDetail} />
        <Route path="/medications" component={MedicationsList} />
        <Route path="/symptoms" component={SymptomsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
