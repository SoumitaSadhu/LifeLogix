import apiClient from "./apiClient";

export interface BloodSugarEntry {
  id: string;
  date: string;
  type: "blood_sugar";
  value: number;
  unit: "mg/dL";
  notes?: string;
}

interface BackendBloodSugarReading {
  id: number;
  recordedAt: string;
  valueMgDl: number;
  notes: string | null;
}

interface BloodSugarReadingsResponse {
  readings: BackendBloodSugarReading[];
}

interface BloodSugarReadingResponse {
  reading: BackendBloodSugarReading;
}

interface CreateBloodSugarInput {
  value: number;
  recordedAt: string;
  notes: string;
}

function mapBloodSugarReading(reading: BackendBloodSugarReading): BloodSugarEntry {
  return {
    id: String(reading.id),
    date: reading.recordedAt,
    type: "blood_sugar",
    value: reading.valueMgDl,
    unit: "mg/dL",
    ...(reading.notes ? { notes: reading.notes } : {}),
  };
}

export async function getBloodSugarReadings(): Promise<BloodSugarEntry[]> {
  const { readings } = await apiClient<BloodSugarReadingsResponse>("/bs");
  return readings.map(mapBloodSugarReading);
}

export async function createBloodSugarReading(
  input: CreateBloodSugarInput,
): Promise<BloodSugarEntry> {
  const { reading } = await apiClient<BloodSugarReadingResponse>("/bs", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return mapBloodSugarReading(reading);
}