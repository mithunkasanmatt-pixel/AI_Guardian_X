import React from "react";
import { TypingEnrollmentCard } from "@/components/enrollment/TypingEnrollmentCard";
import { StepProgressIndicator, REGISTRATION_STEPS } from "@/components/layout/StepProgressIndicator";

export default function RegisterTypingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <StepProgressIndicator
        steps={REGISTRATION_STEPS}
        currentStepIndex={1}
        title="Behavioral Typing Enrollment"
        description="Step 2 of 5: Learn your typing timing characteristics"
      />

      <TypingEnrollmentCard onSuccessRedirect="/register/swipe" />
    </div>
  );
}
