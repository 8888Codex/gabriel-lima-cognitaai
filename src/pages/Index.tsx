import ContactUploadForm from "@/components/ContactUploadForm";
import { Header } from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-4 pt-20">
        <ContactUploadForm />
      </div>
    </div>
  );
};

export default Index;
