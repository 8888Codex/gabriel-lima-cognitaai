import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import codexLogo from "@/assets/codex-logo.png";
import codexLogoBlack from "@/assets/codex-logo-black.png";

export function Header() {
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === "dark" ? codexLogoBlack : codexLogo;
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Codex Logo" className="h-10 transition-opacity duration-300" />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
