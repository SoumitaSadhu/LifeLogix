import apiClient from "./apiClient";

export interface WeightEntry {
  id: string;
  date: string;
  type: "weight";
  value: number;
  unit: "kg";
  notes?: string;
}

interface BackendWeightReading {
  id: number;
  recordedAt: string;
  weightKg: number;
  notes: string | null;
}

interface WeightReadingsResponse {
  readings: BackendWeightReading[];
}

interface WeightReadingResponse {
  reading: BackendWeightReading;
}

interface CreateWeightInput {
  value: number;
  recordedAt: string;
  notes: string;
}

function mapWeightReading(reading: BackendWeightReading): WeightEntry {
  return {
    id: String(reading.id),
    date: reading.recordedAt,
    type: "weight",
    value: reading.weightKg,
    unit: "kg",
    ...(reading.notes ? { notes: reading.notes } : {}),
  };
}

export async function getWeightReadings(): Promise<WeightEntry[]> {
  const { readings } = await apiClient<WeightReadingsResponse>("/weight");
  return readings.map(mapWeightReading);
}

export async function createWeightReading(input: CreateWeightInput): Promise<WeightEntry> {
  const { reading } = await apiClient<WeightReadingResponse>("/weight", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return mapWeightReading(reading);
}
