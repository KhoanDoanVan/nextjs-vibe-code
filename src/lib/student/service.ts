import { apiRequest } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import type {
  AttendanceResponse,
  ClassSessionResponse,
  ChangePasswordRequest,
  CourseRegistrationRequest,
  CourseRegistrationResponse,
  CourseSectionResponse,
  GradeComponentResponse,
  GradeReportResponse,
  ProfileResponse,
  RecurringScheduleResponse,
  UpdateProfileRequest,
} from "@/lib/student/types";

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const unwrapApiData = <TData>(response: unknown): TData => {
  if (isObject(response) && "data" in response) {
    return response.data as TData;
  }

  return response as TData;
};

const toProfile = (value: unknown): ProfileResponse => {
  if (!isObject(value)) {
    return {};
  }

  return value as ProfileResponse;
};

const toArray = <TItem>(value: unknown): TItem[] => {
  if (Array.isArray(value)) {
    return value as TItem[];
  }

  return [];
};

export const getMyProfile = async (
  authorization: string,
): Promise<ProfileResponse> => {
  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    "/api/v1/profile/me",
    {
      method: "GET",
      accessToken: authorization,
    },
  );

  return toProfile(unwrapApiData<unknown>(response));
};

export const updateMyProfile = async (
  payload: UpdateProfileRequest,
  authorization: string,
): Promise<ProfileResponse> => {
  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    "/api/v1/profile/me",
    {
      method: "PUT",
      body: payload,
      accessToken: authorization,
    },
  );

  return toProfile(unwrapApiData<unknown>(response));
};

export const changeMyPassword = async (
  payload: ChangePasswordRequest,
  authorization: string,
): Promise<void> => {
  await apiRequest<ApiResponse<unknown> | unknown>("/api/v1/profile/password", {
    method: "PUT",
    body: payload,
    accessToken: authorization,
  });
};

export const getMyGradeReports = async (
  studentId: number,
  authorization: string,
): Promise<GradeReportResponse[]> => {
  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    `/api/v1/students/${studentId}/grade-reports`,
    {
      method: "GET",
      accessToken: authorization,
    },
  );

  return toArray<GradeReportResponse>(unwrapApiData<unknown>(response));
};

export const getGradeComponentsByCourse = async (
  courseId: number,
  authorization: string,
): Promise<GradeComponentResponse[]> => {
  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    `/api/v1/courses/${courseId}/grade-components`,
    {
      method: "GET",
      accessToken: authorization,
    },
  );

  return toArray<GradeComponentResponse>(unwrapApiData<unknown>(response));
};

export const getMyAttendance = async (
  studentId: number,
  authorization: string,
): Promise<AttendanceResponse[]> => {
  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    `/api/v1/students/${studentId}/attendances`,
    {
      method: "GET",
      accessToken: authorization,
    },
  );

  return toArray<AttendanceResponse>(unwrapApiData<unknown>(response));
};

export const getCourseSections = async (
  authorization: string,
): Promise<CourseSectionResponse[]> => {
  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    "/api/v1/course-sections",
    {
      method: "GET",
      accessToken: authorization,
    },
  );

  return toArray<CourseSectionResponse>(unwrapApiData<unknown>(response));
};

export const getCourseSectionById = async (
  sectionId: number,
  authorization: string,
): Promise<CourseSectionResponse> => {
  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    `/api/v1/course-sections/${sectionId}`,
    {
      method: "GET",
      accessToken: authorization,
    },
  );

  return unwrapApiData<CourseSectionResponse>(response);
};

export const getCourseSectionsByCourse = async (
  courseId: number,
  authorization: string,
): Promise<CourseSectionResponse[]> => {
  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    `/api/v1/course-sections/course/${courseId}`,
    {
      method: "GET",
      accessToken: authorization,
    },
  );

  return toArray<CourseSectionResponse>(unwrapApiData<unknown>(response));
};

export const getCourseSectionsBySemester = async (
  semesterId: number,
  authorization: string,
): Promise<CourseSectionResponse[]> => {
  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    `/api/v1/course-sections/semester/${semesterId}`,
    {
      method: "GET",
      accessToken: authorization,
    },
  );

  return toArray<CourseSectionResponse>(unwrapApiData<unknown>(response));
};

export const getRecurringSchedulesBySection = async (
  sectionId: number,
  authorization: string,
): Promise<RecurringScheduleResponse[]> => {
  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    `/api/v1/recurring-schedules/section/${sectionId}`,
    {
      method: "GET",
      accessToken: authorization,
    },
  );

  return toArray<RecurringScheduleResponse>(unwrapApiData<unknown>(response));
};

export const getRecurringScheduleSessions = async (
  recurringScheduleId: number,
  authorization: string,
): Promise<ClassSessionResponse[]> => {
  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    `/api/v1/recurring-schedules/${recurringScheduleId}/sessions`,
    {
      method: "GET",
      accessToken: authorization,
    },
  );

  return toArray<ClassSessionResponse>(unwrapApiData<unknown>(response));
};

export const registerCourseSection = async (
  payload: CourseRegistrationRequest,
  authorization: string,
): Promise<CourseRegistrationResponse> => {
  const response = await apiRequest<ApiResponse<unknown> | unknown>(
    "/api/v1/course-registrations",
    {
      method: "POST",
      body: payload,
      accessToken: authorization,
    },
  );

  return unwrapApiData<CourseRegistrationResponse>(response);
};
