import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import { testAnalytics } from "@/utils/testAnalytics";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Upload from "./pages/Upload";
import Style from "./pages/Style";
import Editor from "./pages/Editor";
import Create from "./pages/Create";
import OneTapEdit from "./pages/OneTapEdit";
import Status from "./pages/Status";
import ScriptGenerator from "./pages/ScriptGenerator";
import TrendSync from "./pages/TrendSync";
import CommunityCollab from "./pages/CommunityCollab";
import ClipPost from "./pages/ClipPost";
import BatchProcessor from "./pages/BatchProcessor";
import AutoUpload from "./pages/AutoUpload";
import VoiceCloning from "./pages/VoiceCloning";
import AiHost from "./pages/AiHost";
import DynamicOverlays from "./pages/DynamicOverlays";
import AiStudio from "./pages/AiStudio";
import Marketplace from "./pages/Marketplace";
import BrandMarketplace from "./pages/BrandMarketplace";
import Agency from "./pages/Agency";
import Subscribers from "./pages/Subscribers";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import TestDashboard from "./pages/TestDashboard";
import TestSettings from "./pages/TestSettings";
import Teams from "./pages/Teams";
import Security from "./pages/Security";
import Community from "./pages/Community";
import ThumbnailGenerator from "./pages/ThumbnailGenerator";
import VideoDubbing from "./pages/VideoDubbing";
import AIMusicGenerator from "./pages/AIMusicGenerator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route 
            path="/one-tap" 
            element={
              <ProtectedRoute>
                <OneTapEdit />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create" 
            element={
              <ProtectedRoute>
                <Create />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/upload" 
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/style" 
            element={
              <ProtectedRoute>
                <Style />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/editor" 
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/status/:jobId" 
            element={
              <ProtectedRoute>
                <Status />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/status" 
            element={
              <ProtectedRoute>
                <Status />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/script-generator" 
            element={
              <ProtectedRoute>
                <ScriptGenerator />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trend-sync" 
            element={
              <ProtectedRoute>
                <TrendSync />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/community-collab" 
            element={
              <ProtectedRoute>
                <CommunityCollab />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clip-post" 
            element={
              <ProtectedRoute>
                <ClipPost />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/batch-processor" 
            element={
              <ProtectedRoute>
                <BatchProcessor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/auto-upload" 
            element={
              <ProtectedRoute>
                <AutoUpload />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/voice-cloning" 
            element={
              <ProtectedRoute>
                <VoiceCloning />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ai-host" 
            element={
              <ProtectedRoute>
                <AiHost />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dynamic-overlays" 
            element={
              <ProtectedRoute>
                <DynamicOverlays />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ai-studio" 
            element={
              <ProtectedRoute>
                <AiStudio />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/marketplace" 
            element={
              <ProtectedRoute>
                <Marketplace />
              </ProtectedRoute>
            } 
          />
           <Route 
             path="/analytics" 
             element={
               <ProtectedRoute>
                 <Analytics />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/dashboard" 
             element={
               <ProtectedRoute>
                 <Dashboard />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/test-dashboard" 
             element={
               <ProtectedRoute>
                 <TestDashboard />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/test-settings" 
             element={
               <ProtectedRoute>
                 <TestSettings />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/teams" 
             element={
               <ProtectedRoute>
                 <Teams />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/security" 
             element={
               <ProtectedRoute>
                 <Security />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/community" 
             element={
               <ProtectedRoute>
                 <Community />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/thumbnail-generator" 
             element={
               <ProtectedRoute>
                 <ThumbnailGenerator />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/video-dubbing" 
             element={
               <ProtectedRoute>
                 <VideoDubbing />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/ai-music" 
             element={
               <ProtectedRoute>
                 <AIMusicGenerator />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/subscribers" 
             element={
               <ProtectedRoute>
                 <Subscribers />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/brand-marketplace" 
             element={
               <ProtectedRoute>
                 <BrandMarketplace />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/agency" 
             element={
               <ProtectedRoute>
                 <Agency />
               </ProtectedRoute>
             } 
           />
           {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
           <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
