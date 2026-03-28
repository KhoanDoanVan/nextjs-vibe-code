import { apiRequest } from "@/lib/api/client";
import type {
  PublicAdmissionApplyPayload,
  PublicLookupResult,
  PublicSelectOption,
} from "@/lib/public-admission/types";

const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const unwrapApiData = <TData>(value: unknown): TData => {
  if (isObject(value) && "data" in value) {
    return value.data as TData;
  }

  return value as TData;
};

const toObjectRows = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Record<string, unknown> => isObject(item));
};

const resolveOptionId = (row: Record<string, unknown>): number | null => {
  const candidates = ["id", "periodId", "majorId", "blockId", "value"];
  for (const key of candidates) {
    const parsed = Number(row[key]);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const resolveOptionLabel = (
  row: Record<string, unknown>,
  fallbackPrefix: string,
  id: number,
): string => {
  const candidates = [
    "label",
    "name",
    "periodName",
    "majorName",
    "blockName",
    "code",
    "majorCode",
    "blockCode",
  ];

  const parts = candidates
    .map((key) => row[key])
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  if (parts.length > 0) {
    return parts.join(" - ");
  }

  return `${fallbackPrefix} #${id}`;
};

const toSelectOptions = (
  value: unknown,
  fallbackPrefix: string,
): PublicSelectOption[] => {
  const rows = toObjectRows(unwrapApiData<unknown>(value));

  return rows
    .map((row) => {
      const id = resolveOptionId(row);
      if (!id) {
        return null;
      }

      return {
        id,
        label: resolveOptionLabel(row, fallbackPrefix, id),
        raw: row,
      };
    })
    .filter((item): item is PublicSelectOption => item !== null);
};

export const getPublicAdmissionActivePeriods = async (): Promise<PublicSelectOption[]> => {
  const response = await apiRequest<unknown>("/api/v1/public/admissions/active-periods", {
    method: "GET",
  });

  return toSelectOptions(response, "Kỳ");
};

export const getPublicAdmissionMajorsByPeriod = async (
  periodId: number,
): Promise<PublicSelectOption[]> => {
  const response = await apiRequest<unknown>(
    `/api/v1/public/admissions/periods/${periodId}/majors`,
    {
      method: "GET",
    },
  );

  return toSelectOptions(response, "Ngành");
};

export const getPublicAdmissionBlocksByPeriodMajor = async (
  periodId: number,
  majorId: number,
): Promise<PublicSelectOption[]> => {
  const response = await apiRequest<unknown>(
    `/api/v1/public/admissions/periods/${periodId}/majors/${majorId}/blocks`,
    {
      method: "GET",
    },
  );

  return toSelectOptions(response, "Khối");
};

export const lookupPublicAdmissions = async (
  nationalId: string,
  phone: string,
): Promise<PublicLookupResult[]> => {
  const query = new URLSearchParams({
    nationalId,
    phone,
  });

  const response = await apiRequest<unknown>(
    `/api/v1/public/admissions/lookup?${query.toString()}`,
    {
      method: "GET",
    },
  );

  const rows = unwrapApiData<unknown>(response);
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((item) => (isObject(item) ? item : null))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      fullName: typeof item.fullName === "string" ? item.fullName : undefined,
      nationalId: typeof item.nationalId === "string" ? item.nationalId : undefined,
      status: typeof item.status === "string" ? item.status : undefined,
      periodName: typeof item.periodName === "string" ? item.periodName : undefined,
      majorName: typeof item.majorName === "string" ? item.majorName : undefined,
      blockName: typeof item.blockName === "string" ? item.blockName : undefined,
      totalScore:
        typeof item.totalScore === "number"
          ? item.totalScore
          : Number.isFinite(Number(item.totalScore))
            ? Number(item.totalScore)
            : undefined,
    }));
};

export const submitPublicAdmissionApplication = async (
  payload: PublicAdmissionApplyPayload,
): Promise<void> => {
  await apiRequest<unknown>("/api/v1/public/admissions/apply", {
    method: "POST",
    body: payload,
  });
};
