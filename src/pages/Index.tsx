import { useState, useEffect } from "react";
import ContactUploadForm from "@/components/ContactUploadForm";
import { Header } from "@/components/Header";
import VapiVoiceModal from "@/components/VapiVoiceModal";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

const Index = () => {
  const [isVapiModalOpen, setIsVapiModalOpen] = useState(false);

  // Auto-open modal on first load to configure webhook
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVapiModalOpen(true);
    }, 500); // Small delay for smooth UX
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-4 pt-20">
        <ContactUploadForm />
        
        <Button
          onClick={() => setIsVapiModalOpen(true)}
          className="fixed bottom-8 right-8 rounded-full w-14 h-14 shadow-lg"
          variant="gradient"
          size="icon"
        >
          <Phone className="h-6 w-6" />
        </Button>

        <VapiVoiceModal 
          open={isVapiModalOpen} 
          onOpenChange={setIsVapiModalOpen}
        />
      </div>
    </div>
  );
};

export default Index;
