import React from "react";
import { Check, Shield, Keyboard, Move, Fingerprint, Lock, CheckCircle2 } from "lucide-react";

export interface StepItem {
  id: string;
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface StepProgressIndicatorProps {
  steps: StepItem[];
  currentStepIndex: number;
  completedStepIndices?: number[];
  title?: string;
  description?: string;
}

export const REGISTRATION_STEPS: StepItem[] = [
  { id: "account", name: "Account", icon: Lock },
  { id: "typing", name: "Typing", icon: Keyboard },
  { id: "swipe", name: "Swipe", icon: Move },
  { id: "biometric", name: "Biometric", icon: Fingerprint },
  { id: "complete", name: "Complete", icon: CheckCircle2 },
];

export const AUTH_STEPS: StepItem[] = [
  { id: "password", name: "Password", icon: Lock },
  { id: "typing", name: "Typing", icon: Keyboard },
  { id: "swipe", name: "Swipe", icon: Move },
  { id: "biometric", name: "Biometric", icon: Fingerprint },
  { id: "result", name: "Result", icon: Shield },
];

export function StepProgressIndicator({
  steps,
  currentStepIndex,
  completedStepIndices = [],
  title,
  description,
}: StepProgressIndicatorProps) {
  return (
    <div className="w-full mb-8">
      {(title || description) && (
        <div className="text-center mb-6">
          {title && <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>}
          {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
        </div>
      )}

      <nav aria-label="Progress">
        <ol role="list" className="flex items-center justify-between w-full">
          {steps.map((step, index) => {
            const isCompleted = completedStepIndices.includes(index) || index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const Icon = step.icon;

            return (
              <li key={step.id} className="relative flex-1 flex flex-col items-center">
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-0.5 transition-colors duration-300 ${
                      index < currentStepIndex
                        ? "bg-indigo-600 dark:bg-indigo-500"
                        : "bg-slate-200 dark:bg-slate-800"
                    }`}
                    style={{ transform: "translateX(50%)" }}
                  />
                )}

                {/* Step Circle Icon */}
                <div
                  className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500"
                      : isCurrent
                      ? "border-indigo-600 bg-white text-indigo-600 dark:bg-slate-900 dark:border-indigo-400 dark:text-indigo-400 ring-4 ring-indigo-100 dark:ring-indigo-950"
                      : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 stroke-[2.5]" />
                  ) : Icon ? (
                    <Icon className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step Name Label */}
                <span
                  className={`mt-2 text-xs font-medium text-center transition-colors ${
                    isCurrent
                      ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                      : isCompleted
                      ? "text-slate-800 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {step.name}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
