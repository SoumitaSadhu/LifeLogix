import apiClient from "./apiClient";

export interface BloodPressureEntry {
  id: string;
  date: string;
  type: "blood_pressure";
  systolic: number;
  diastolic: number;
  notes?: string;
}

interface BackendBloodPressureReading {
  id: number;
  recordedAt: string;
  systolic: number;
  diastolic: number;
  notes: string | null;
}

interface BloodPressureReadingsResponse {
  readings: BackendBloodPressureReading[];
}

interface BloodPressureReadingResponse {
  reading: BackendBloodPressureReading;
}

interface CreateBloodPressureInput {
  systolic: number;
  diastolic: number;
  recordedAt: string;
  notes: string;
}

function mapBloodPressureReading(reading: BackendBloodPressureReading): BloodPressureEntry {
  return {
    id: String(reading.id),
    date: reading.recordedAt,
    type: "blood_pressure",
    systolic: reading.systolic,
    diastolic: reading.diastolic,
    ...(reading.notes ? { notes: reading.notes } : {}),
  };
}

export async function getBloodPressureReadings(): Promise<BloodPressureEntry[]> {
  const { readings } = await apiClient<BloodPressureReadingsResponse>("/bp");
  return readings.map(mapBloodPressureReading);
}

export async function createBloodPressureReading(
  input: CreateBloodPressureInput,
): Promise<BloodPressureEntry> {
  const { reading } = await apiClient<BloodPressureReadingResponse>("/bp", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return mapBloodPressureReading(reading);
}