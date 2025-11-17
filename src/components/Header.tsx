import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, useLocation } from "react-router-dom";
import { FileText, Phone } from "lucide-react";
import codexLogo from "@/assets/codex-logo.png";
import codexLogoBlack from "@/assets/codex-logo-black.png";

export function Header() {
  const location = useLocation();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3">
            <img src={codexLogo} alt="Codex Logo" className="h-10 hidden dark:block select-none transition-opacity duration-300" />
            <img src={codexLogoBlack} alt="Codex Logo" className="h-10 block dark:hidden select-none transition-opacity duration-300" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Phone className="h-4 w-4" />
              Chamadas
            </Link>
            <Link 
              to="/call-logs" 
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/call-logs' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <FileText className="h-4 w-4" />
              Histórico
            </Link>
          </nav>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
