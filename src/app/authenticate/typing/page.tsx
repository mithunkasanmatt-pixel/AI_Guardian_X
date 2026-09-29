import React from "react";
import { TypingVerificationCard } from "@/components/verification/TypingVerificationCard";
import { StepProgressIndicator, AUTH_STEPS } from "@/components/layout/StepProgressIndicator";

export default function AuthenticateTypingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <StepProgressIndicator
        steps={AUTH_STEPS}
        currentStepIndex={1}
        title="Behavioral Typing Verification"
        description="Step 2 of 5: Verify your keystroke timing characteristics"
      />

      <TypingVerificationCard onSuccessRedirect="/authenticate/swipe" />
    </div>
  );
}
