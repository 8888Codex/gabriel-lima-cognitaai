import ContactUploadForm from "@/components/ContactUploadForm";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <ContactUploadForm />
      </div>
    </div>
  );
};

export default Index;
