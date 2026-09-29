export interface BiometricPressureSample {
  pressure: number; // 0.0 to 1.0 (or normalized hardware scale)
  timestamp: number;
}

export interface BiometricPressureData {
  pressureValue: number;
  pressureDurationMs: number;
  minPressure: number;
  maxPressure: number;
  averagePressure: number;
  pressureVariance: number;
  sampleCount: number;
  timestamp: number;
  sensorIdentifier: string;
  samples: BiometricPressureSample[];
}

export interface SensorInfo {
  name: string;
  isMock: boolean;
  supported: boolean;
  details: string;
}

export interface BiometricProvider {
  initialize(): Promise<boolean>;
  getSensorInfo(): SensorInfo;
  startCapture(
    element: HTMLElement,
    onSample: (sample: BiometricPressureSample) => void,
    onComplete: (data: BiometricPressureData) => void
  ): () => void; // returns cleanup unbind function
}

/**
 * Real Hardware Biometric Pressure Provider
 * Uses W3C PointerEvents pressure API (e.pressure) and Web Touch API (Touch.force)
 */
export class RealBiometricProvider implements BiometricProvider {
  private sensorName = "W3C PointerEvent Pressure Sensor";

  async initialize(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    return "PointerEvent" in window || "ontouchstart" in window;
  }

  getSensorInfo(): SensorInfo {
    const hasPointer = typeof window !== "undefined" && "PointerEvent" in window;
    return {
      name: this.sensorName,
      isMock: false,
      supported: hasPointer,
      details: hasPointer
        ? "Hardware pressure sensor available via PointerEvent API"
        : "Hardware pressure sensor not detected",
    };
  }

  startCapture(
    element: HTMLElement,
    onSample: (sample: BiometricPressureSample) => void,
    onComplete: (data: BiometricPressureData) => void
  ): () => void {
    const samples: BiometricPressureSample[] = [];
    let startTime = 0;
    let isActive = false;

    const handlePointerDown = (e: PointerEvent) => {
      isActive = true;
      startTime = performance.now();
      samples.length = 0;
      const pressure = e.pressure > 0 ? e.pressure : 0.5; // fallback default touch pressure if binary sensor
      const sample = { pressure: Number(pressure.toFixed(4)), timestamp: startTime };
      samples.push(sample);
      onSample(sample);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isActive) return;
      const now = performance.now();
      const pressure = e.pressure > 0 ? e.pressure : 0.5;
      const sample = { pressure: Number(pressure.toFixed(4)), timestamp: now };
      samples.push(sample);
      onSample(sample);
    };

    const handlePointerUp = () => {
      if (!isActive) return;
      isActive = false;
      const endTime = performance.now();
      const duration = Math.max(1, endTime - startTime);

      const pressures = samples.map((s) => s.pressure);
      const minPressure = pressures.length > 0 ? Math.min(...pressures) : 0;
      const maxPressure = pressures.length > 0 ? Math.max(...pressures) : 0;
      const avgPressure = pressures.length > 0 ? pressures.reduce((a, b) => a + b, 0) / pressures.length : 0;

      const variance = pressures.length > 0
        ? pressures.reduce((acc, p) => acc + Math.pow(p - avgPressure, 2), 0) / pressures.length
        : 0;

      onComplete({
        pressureValue: Number(avgPressure.toFixed(4)),
        pressureDurationMs: Math.round(duration),
        minPressure: Number(minPressure.toFixed(4)),
        maxPressure: Number(maxPressure.toFixed(4)),
        averagePressure: Number(avgPressure.toFixed(4)),
        pressureVariance: Number(variance.toFixed(6)),
        sampleCount: samples.length,
        timestamp: Date.now(),
        sensorIdentifier: "hardware-pointer-pressure",
        samples: [...samples],
      });
    };

    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerUp);
    element.addEventListener("pointercancel", handlePointerUp);

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerUp);
      element.removeEventListener("pointercancel", handlePointerUp);
    };
  }
}

/**
 * Development Mock Biometric Pressure Provider
 * Simulates realistic finger pressure profile dynamics for testing without physical pressure hardware
 */
export class MockBiometricProvider implements BiometricProvider {
  getSensorInfo(): SensorInfo {
    return {
      name: "Development Mock Pressure Sensor",
      isMock: true,
      supported: true,
      details: "Development mode mock sensor simulating finger pressure characteristics",
    };
  }

  async initialize(): Promise<boolean> {
    return true;
  }

  startCapture(
    element: HTMLElement,
    onSample: (sample: BiometricPressureSample) => void,
    onComplete: (data: BiometricPressureData) => void
  ): () => void {
    const samples: BiometricPressureSample[] = [];
    let startTime = 0;
    let isActive = false;
    let timer: any = null;

    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isActive = true;
      startTime = performance.now();
      samples.length = 0;

      // Base pressure target around 0.65 with natural micro-tremor simulation
      const baseTarget = 0.62 + (Math.random() * 0.15 - 0.075);

      timer = setInterval(() => {
        if (!isActive) return;
        const now = performance.now();
        const elapsed = now - startTime;
        // Press curve simulation (rise -> steady hold with micro-variations)
        const ramp = Math.min(1, elapsed / 200);
        const noise = (Math.random() - 0.5) * 0.06;
        const pressure = Math.max(0.1, Math.min(1.0, baseTarget * ramp + noise));

        const sample = { pressure: Number(pressure.toFixed(4)), timestamp: now };
        samples.push(sample);
        onSample(sample);
      }, 50);
    };

    const handleEnd = () => {
      if (!isActive) return;
      isActive = false;
      if (timer) clearInterval(timer);

      const endTime = performance.now();
      const duration = Math.max(1, endTime - startTime);

      const pressures = samples.map((s) => s.pressure);
      const minPressure = pressures.length > 0 ? Math.min(...pressures) : 0;
      const maxPressure = pressures.length > 0 ? Math.max(...pressures) : 0;
      const avgPressure = pressures.length > 0 ? pressures.reduce((a, b) => a + b, 0) / pressures.length : 0;

      const variance = pressures.length > 0
        ? pressures.reduce((acc, p) => acc + Math.pow(p - avgPressure, 2), 0) / pressures.length
        : 0;

      onComplete({
        pressureValue: Number(avgPressure.toFixed(4)),
        pressureDurationMs: Math.round(duration),
        minPressure: Number(minPressure.toFixed(4)),
        maxPressure: Number(maxPressure.toFixed(4)),
        averagePressure: Number(avgPressure.toFixed(4)),
        pressureVariance: Number(variance.toFixed(6)),
        sampleCount: samples.length,
        timestamp: Date.now(),
        sensorIdentifier: "dev-mock-pressure-sensor",
        samples: [...samples],
      });
    };

    element.addEventListener("mousedown", handleStart as any);
    element.addEventListener("mouseup", handleEnd);
    element.addEventListener("mouseleave", handleEnd);
    element.addEventListener("touchstart", handleStart as any);
    element.addEventListener("touchend", handleEnd);

    return () => {
      if (timer) clearInterval(timer);
      element.removeEventListener("mousedown", handleStart as any);
      element.removeEventListener("mouseup", handleEnd);
      element.removeEventListener("mouseleave", handleEnd);
      element.removeEventListener("touchstart", handleStart as any);
      element.removeEventListener("touchend", handleEnd);
    };
  }
}

/**
 * Biometric Provider Factory
 */
export function getBiometricProvider(forceMock: boolean = false): BiometricProvider {
  if (forceMock || process.env.NODE_ENV === "development") {
    return new MockBiometricProvider();
  }
  return new RealBiometricProvider();
}
