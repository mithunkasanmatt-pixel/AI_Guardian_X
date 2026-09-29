import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit-logger";

const registerSchema = z
  .object({
    name: z.string().min(2, "Full Name is required and must be at least 2 characters"),
    email: z.string().email("Valid email address is required"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(1, "Confirm Password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password and Confirm Password must match",
    path: ["confirmPassword"],
  });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid registration input data" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;
    const lowerEmail = email.toLowerCase();

    // Prevent duplicate account creation
    const existingUser = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create User record in database (securityEnrollmentCompleted defaults to false)
    const newUser = await prisma.user.create({
      data: {
        name,
        email: lowerEmail,
        passwordHash,
        securityEnrollmentCompleted: false,
        accountStatus: "ACTIVE",
      },
    });

    // Record audit event
    await logAuditEvent({
      userId: newUser.id,
      eventType: "REGISTRATION",
      success: true,
    });

    return NextResponse.json({
      success: true,
      userId: newUser.id,
      nextStep: "/login",
      message: "Account successfully created. Please sign in to complete security enrollment.",
    });
  } catch (err: any) {
    console.error("Registration API Error:", err);
    return NextResponse.json(
      { error: "Server error during account registration." },
      { status: 500 }
    );
  }
}
