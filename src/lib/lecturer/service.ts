import { apiRequest } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import type { LecturerScheduleRow } from "@/lib/lecturer/types";

const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const unwrapApiData = <TData>(value: unknown): TData => {
  if (isObject(value) && "data" in value) {
    return value.data as TData;
  }

  return value as TData;
};

const toScheduleRows = (value: unknown): LecturerScheduleRow[] => {
  const payload = unwrapApiData<unknown>(value);

  if (Array.isArray(payload)) {
    return payload.filter((item): item is LecturerScheduleRow => isObject(item));
  }

  if (isObject(payload)) {
    if (Array.isArray(payload.items)) {
      return payload.items.filter((item): item is LecturerScheduleRow => isObject(item));
    }
    if (Array.isArray(payload.content)) {
      return payload.content.filter((item): item is LecturerScheduleRow => isObject(item));
    }
    if (Array.isArray(payload.data)) {
      return payload.data.filter((item): item is LecturerScheduleRow => isObject(item));
    }

    return [payload];
  }

  return [];
};

export const getMyLecturerSchedule = async (
  startDate: string,
  endDate: string,
  authorization: string,
): Promise<LecturerScheduleRow[]> => {
  const query = new URLSearchParams({
    startDate,
    endDate,
  });

  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    `/api/v1/schedules/lecturers/me?${query.toString()}`,
    {
      method: "GET",
      accessToken: authorization,
    },
  );

  return toScheduleRows(response);
};
