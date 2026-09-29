import React from "react";
import { SwipeEnrollmentCard } from "@/components/enrollment/SwipeEnrollmentCard";
import { StepProgressIndicator, REGISTRATION_STEPS } from "@/components/layout/StepProgressIndicator";

export default function RegisterSwipePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <StepProgressIndicator
        steps={REGISTRATION_STEPS}
        currentStepIndex={2}
        title="Swipe Pattern Enrollment"
        description="Step 3 of 5: Learn your gesture timing characteristics"
      />

      <SwipeEnrollmentCard onSuccessRedirect="/register/biometric" />
    </div>
  );
}
