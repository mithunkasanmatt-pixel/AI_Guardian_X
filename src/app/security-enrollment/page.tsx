"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Keyboard, Move, Gauge, Shield, CheckCircle2 } from "lucide-react";
import { TypingEnrollmentCard } from "@/components/enrollment/TypingEnrollmentCard";
import { SwipeEnrollmentCard } from "@/components/enrollment/SwipeEnrollmentCard";
import { PressureEnrollmentCard } from "@/components/enrollment/PressureEnrollmentCard";
import { StepProgressIndicator, StepItem } from "@/components/layout/StepProgressIndicator";

const ENROLLMENT_STEPS: StepItem[] = [
  { id: "typing", name: "Typing Speed", icon: Keyboard },
  { id: "swipe", name: "Swipe Behavior", icon: Move },
  { id: "pressure", name: "Finger Pressure", icon: Gauge },
];

export default function SecurityEnrollmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step") || "typing";

  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    if (stepParam === "swipe") setActiveStepIndex(1);
    else if (stepParam === "pressure") setActiveStepIndex(2);
    else setActiveStepIndex(0);
  }, [stepParam]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <StepProgressIndicator
        steps={ENROLLMENT_STEPS}
        currentStepIndex={activeStepIndex}
        title="First-Time Security Enrollment"
        description="Establish your baseline behavioral and biometric characteristics for zero-trust security."
      />

      {activeStepIndex === 0 && (
        <TypingEnrollmentCard onSuccessRedirect="/security-enrollment?step=swipe" />
      )}

      {activeStepIndex === 1 && (
        <SwipeEnrollmentCard onSuccessRedirect="/security-enrollment?step=pressure" />
      )}

      {activeStepIndex === 2 && (
        <PressureEnrollmentCard onSuccessRedirect="/dashboard" />
      )}
    </div>
  );
}
