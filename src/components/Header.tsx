import { ThemeToggle } from "@/components/ThemeToggle";
import codexLogo from "@/assets/codex-logo.png";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={codexLogo} alt="Codex Logo" className="h-10" />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
