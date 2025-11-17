import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users, Clock } from "lucide-react";

interface SuccessScreenProps {
  contactCount: number;
  startTime: string;
  onNewCampaign: () => void;
}

const SuccessScreen = ({ contactCount, startTime, onNewCampaign }: SuccessScreenProps) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

      <div className="w-full max-w-lg animate-scale-in">
        <Card className="shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
          <CardContent className="p-8 text-center">
            {/* Success Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6 animate-scale-in">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>

            {/* Success Message */}
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Campanha Iniciada!
            </h2>
            <p className="text-muted-foreground mb-8 text-base">
              Suas ligações foram iniciadas com sucesso
            </p>

            {/* Campaign Summary */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-secondary/50">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Contatos Processados</p>
                  <p className="text-xl font-bold text-foreground">{contactCount}</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-secondary/50">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Horário de Início</p>
                  <p className="text-xl font-bold text-foreground">{startTime}</p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={onNewCampaign}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-base rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              Iniciar Nova Campanha
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessScreen;
