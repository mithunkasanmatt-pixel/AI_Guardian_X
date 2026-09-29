import React from "react";
import { AuthResultCard } from "@/components/verification/AuthResultCard";
import { StepProgressIndicator, AUTH_STEPS } from "@/components/layout/StepProgressIndicator";

export default function AuthenticateResultPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <StepProgressIndicator
        steps={AUTH_STEPS}
        currentStepIndex={4}
        completedStepIndices={[0, 1, 2, 3, 4]}
        title="Authentication Result"
        description="Step 5 of 5: Final identity verification decision"
      />

      <AuthResultCard />
    </div>
  );
}
