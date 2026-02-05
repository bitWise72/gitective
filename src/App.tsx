import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
 import { useAuth } from "./hooks/useAuth";
 import Index from "./pages/Index";
 import AuthPage from "./pages/AuthPage";
import InvestigationPage from "./pages/InvestigationPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

 const AppRoutes = () => {
   const { isAuthenticated, isLoading } = useAuth();
 
   if (isLoading) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
       </div>
     );
   }
 
   return (
     <Routes>
       <Route path="/auth" element={<AuthPage />} />
       <Route
         path="/"
         element={isAuthenticated ? <Index /> : <AuthPage />}
       />
       <Route
         path="/investigation/:id"
         element={isAuthenticated ? <InvestigationPage /> : <AuthPage />}
       />
       <Route path="*" element={<NotFound />} />
     </Routes>
   );
 };
 
 const App = () => (
   <QueryClientProvider client={queryClient}>
     <TooltipProvider>
       <Toaster />
       <Sonner />
       <BrowserRouter>
         <AppRoutes />
       </BrowserRouter>
     </TooltipProvider>
   </QueryClientProvider>
 );

export default App;
