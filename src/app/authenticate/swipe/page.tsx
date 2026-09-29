import React from "react";
import { SwipeVerificationCard } from "@/components/verification/SwipeVerificationCard";
import { StepProgressIndicator, AUTH_STEPS } from "@/components/layout/StepProgressIndicator";

export default function AuthenticateSwipePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <StepProgressIndicator
        steps={AUTH_STEPS}
        currentStepIndex={2}
        title="Swipe Pattern Verification"
        description="Step 3 of 5: Verify your gesture timing characteristics"
      />

      <SwipeVerificationCard onSuccessRedirect="/authenticate/biometric" />
    </div>
  );
}
