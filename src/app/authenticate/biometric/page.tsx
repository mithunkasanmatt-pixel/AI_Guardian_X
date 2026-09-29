import React from "react";
import { PressureVerificationCard } from "@/components/verification/PressureVerificationCard";
import { StepProgressIndicator, AUTH_STEPS } from "@/components/layout/StepProgressIndicator";

export default function AuthenticateBiometricPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <StepProgressIndicator
        steps={AUTH_STEPS}
        currentStepIndex={3}
        title="Biometric Finger Pressure Verification"
        description="Step 4 of 5: Verify finger pressure characteristic"
      />

      <PressureVerificationCard onSuccessRedirect="/authenticate/result" />
    </div>
  );
}
