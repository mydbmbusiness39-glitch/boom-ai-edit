import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    
    // Show toast and redirect to dashboard
    toast({
      title: "Page Not Found",
      description: "That page doesn't exist anymore. Taking you to Dashboard.",
      variant: "destructive"
    });
    
    // Redirect after a short delay to let user see the toast
    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [location.pathname, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Redirecting to Dashboard...</p>
      </div>
    </div>
  );
};

export default NotFound;
