import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthProvider";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Demo from "./pages/Demo";
import Dashboard from "./pages/Dashboard";
import Project from "./pages/Project";
import Upload from "./pages/Upload";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Health from "./pages/Health";
import Editor from "./pages/Editor";
import Analytics from "./pages/Analytics";
import ClipPost from "./pages/ClipPost";
import AiStudio from "./pages/AiStudio";
import Status from "./pages/Status";
import TestDashboard from "./pages/TestDashboard";
import TestSettings from "./pages/TestSettings";
import VoiceDemo from "./pages/VoiceDemo";
import TTSDemo from "./pages/TTSDemo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<TTSDemo />} />
              <Route path="/home" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/voice-demo" element={<VoiceDemo />} />
              <Route path="/health" element={<Health />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/project/:id" element={<ProtectedRoute><Project /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/editor" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/clip-post" element={<ProtectedRoute><ClipPost /></ProtectedRoute>} />
              <Route path="/ai-studio" element={<ProtectedRoute><AiStudio /></ProtectedRoute>} />
              <Route path="/status/:id?" element={<ProtectedRoute><Status /></ProtectedRoute>} />
              <Route path="/test-dashboard" element={<ProtectedRoute><TestDashboard /></ProtectedRoute>} />
              <Route path="/test-settings" element={<ProtectedRoute><TestSettings /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
