import React from "react";
import { BiometricEnrollmentCard } from "@/components/enrollment/BiometricEnrollmentCard";
import { StepProgressIndicator, REGISTRATION_STEPS } from "@/components/layout/StepProgressIndicator";

export default function RegisterBiometricPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <StepProgressIndicator
        steps={REGISTRATION_STEPS}
        currentStepIndex={3}
        title="Biometric Passkey Enrollment"
        description="Step 4 of 5: Register device biometric passkey"
      />

      <BiometricEnrollmentCard onSuccessRedirect="/register/success" />
    </div>
  );
}
