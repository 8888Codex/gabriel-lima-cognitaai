import { CheckCircle2, Loader2, FileCheck, Users, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  label: string;
  icon: React.ElementType;
}

const steps: Step[] = [
  { id: 1, label: "Validando arquivo", icon: FileCheck },
  { id: 2, label: "Processando contatos", icon: Users },
  { id: 3, label: "Iniciando ligações", icon: Phone },
];

interface ProgressStepsProps {
  currentStep: number;
}

const ProgressSteps = ({ currentStep }: ProgressStepsProps) => {
  return (
    <div className="w-full py-8">
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isPending = currentStep < step.id;

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Icon Circle */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 relative z-10",
                    isCompleted && "bg-primary scale-110 shadow-lg",
                    isActive && "bg-primary animate-pulse scale-110 shadow-lg shadow-primary/50",
                    isPending && "bg-muted scale-90"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-primary-foreground animate-scale-in" />
                  ) : isActive ? (
                    <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
                  ) : (
                    <Icon
                      className={cn(
                        "w-6 h-6 transition-colors",
                        isPending ? "text-muted-foreground" : "text-primary-foreground"
                      )}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="mt-3 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium transition-all duration-300",
                      isActive && "text-foreground scale-105 font-semibold",
                      isCompleted && "text-foreground",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProgressSteps;
