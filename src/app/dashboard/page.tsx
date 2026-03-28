"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import {
  changeMyPassword,
  getCourseSectionById,
  getGradeComponentsByCourse,
  getCourseSections,
  getCourseSectionsByCourse,
  getCourseSectionsBySemester,
  getMyAttendance,
  getMyGradeReports,
  getMyProfile,
  getRecurringScheduleSessions,
  getRecurringSchedulesBySection,
  registerCourseSection,
  updateMyProfile,
} from "@/lib/student/service";
import {
  studentFeatureTabs,
  studentTopHeaderTabs,
} from "@/lib/student/tabs";
import type {
  AttendanceResponse,
  ClassSessionResponse,
  CourseSectionResponse,
  GradeComponentResponse,
  GradeDetailResponse,
  GradeReportResponse,
  ProfileResponse,
  RecurringScheduleResponse,
  StudentFeatureTab,
} from "@/lib/student/types";

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Thao tác thất bại. Vui lòng thử lại.";
};

const formatDate = (value?: string): string => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN");
};

const formatDateTime = (value?: string): string => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
};

const formatScore = (value?: number): string => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return value.toFixed(2);
};

const toLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseIsoDateLocal = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
};

const getMondayOfWeek = (date: Date): Date => {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + diff);
  return normalized;
};

const getIsoWeekNumber = (value: Date): number => {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const formatDateShort = (value: string): string => {
  const date = parseIsoDateLocal(value);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
};

const buildScheduleWeekOption = (startDate: string): ScheduleWeekOption => {
  const start = parseIsoDateLocal(startDate);
  const end = addDays(start, 6);
  const endDate = toLocalIsoDate(end);
  const weekNumber = getIsoWeekNumber(start);

  return {
    key: startDate,
    weekNumber,
    startDate,
    endDate,
    label: `Tuần ${weekNumber} [từ ngày ${formatDateShort(
      startDate,
    )} đến ngày ${formatDateShort(endDate)}]`,
  };
};

interface RegistrationNotice {
  title: string;
  message: string;
  detail?: string;
}

interface RegisteredCourseItem {
  registrationId: number;
  registrationTime?: string;
  status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "DROPPED";
  section: CourseSectionResponse;
}

interface CourseFilterOption {
  courseId: number;
  courseCode?: string;
  courseName: string;
}

interface SemesterFilterOption {
  semesterId: number;
  semesterNumber?: number;
  academicYear?: string;
  label: string;
}

interface WeeklyScheduleBlock {
  key: string;
  sectionId: number;
  courseName: string;
  courseCode?: string;
  sectionCode?: string;
  lecturerName?: string;
  classroomName?: string;
  startPeriod: number;
  endPeriod: number;
  dayIndex: number;
  sessionDate?: string;
  status?: string;
  semesterId?: number;
  semesterNumber?: number;
  academicYear?: string;
}

interface ScheduleWeekOption {
  key: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  label: string;
}

type GradeDetailItem = GradeDetailResponse;

const contentCardClass =
  "rounded-[8px] border border-[#8ab3d1] bg-white shadow-[0_1px_2px_rgba(7,51,84,0.16)]";

const sectionTitleClass =
  "flex items-center justify-between border-b border-[#c5dced] px-4 py-2 text-[18px] font-semibold text-[#1a4f75]";

const periodStartTimeMap: Record<number, string> = {
  1: "07:00",
  2: "07:50",
  3: "09:00",
  4: "09:50",
  5: "10:40",
  6: "13:00",
  7: "13:50",
  8: "15:00",
  9: "15:50",
  10: "16:40",
  11: "17:40",
  12: "18:30",
  13: "19:20",
  14: "20:10",
};

const periodEndTimeMap: Record<number, string> = {
  1: "07:50",
  2: "08:40",
  3: "09:50",
  4: "10:40",
  5: "11:30",
  6: "13:50",
  7: "14:40",
  8: "15:50",
  9: "16:40",
  10: "17:30",
  11: "18:30",
  12: "19:20",
  13: "20:10",
  14: "21:00",
};

const scheduleDayLabels = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
] as const;

const getSectionDisplayName = (section: CourseSectionResponse): string => {
  return section.displayName || section.sectionCode || `Lớp ${section.id}`;
};

const getCourseDisplayName = (section: CourseSectionResponse): string => {
  return section.courseName || section.courseCode || "Chưa cập nhật";
};

const getGroupLabel = (section: CourseSectionResponse): string => {
  const matched = section.sectionCode?.match(/(\d+)$/);
  return matched?.[1] || "-";
};

const getCreditsLabel = (section: CourseSectionResponse): string => {
  void section;
  return "-";
};

const getScheduleLabel = (section: CourseSectionResponse): string => {
  const term = [
    section.semesterNumber ? `Học kỳ ${section.semesterNumber}` : null,
    section.academicYear || null,
  ]
    .filter(Boolean)
    .join(" - ");

  const lecturer = section.lecturerName ? `GV ${section.lecturerName}` : "";

  return [term, lecturer].filter(Boolean).join(", ") || "Chưa có thời khóa biểu";
};

const getSemesterDisplayLabel = (
  semesterNumber?: number,
  academicYear?: string,
): string => {
  const term = semesterNumber ? `Học kỳ ${semesterNumber}` : "Học kỳ";
  return [term, academicYear].filter(Boolean).join(" - ");
};

const getGradeSemesterFilterValue = (
  section?: CourseSectionResponse,
): string => {
  if (!section) {
    return "";
  }

  if (typeof section.semesterId === "number" && Number.isInteger(section.semesterId)) {
    return `semester:${section.semesterId}`;
  }

  const label = getSemesterDisplayLabel(section.semesterNumber, section.academicYear);
  return label ? `label:${label}` : "";
};

const getGradeCourseFilterValue = (
  report: GradeReportResponse,
  section?: CourseSectionResponse,
): string => {
  if (section && typeof section.courseId === "number" && Number.isInteger(section.courseId)) {
    return `course:${section.courseId}`;
  }

  const fallbackName = report.courseName?.trim();
  return fallbackName ? `name:${fallbackName}` : "";
};

const parsePositiveInteger = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const getPeriodRangeLabel = (startPeriod?: number, endPeriod?: number): string => {
  if (
    Number.isInteger(startPeriod) &&
    Number.isInteger(endPeriod) &&
    startPeriod &&
    endPeriod
  ) {
    return `Tiết ${startPeriod} - ${endPeriod}`;
  }

  return "-";
};

const getPeriodClockRange = (startPeriod: number, endPeriod: number): string => {
  const start = periodStartTimeMap[startPeriod] || `Tiết ${startPeriod}`;
  const end = periodEndTimeMap[endPeriod] || `Tiết ${endPeriod}`;
  return `${start} -> ${end}`;
};

const normalizeDayIndex = (
  dayOfWeek?: number,
  dayOfWeekName?: string,
): number | null => {
  const normalizedName = dayOfWeekName?.trim().toLowerCase();
  if (normalizedName) {
    if (
      normalizedName.includes("chủ nhật") ||
      normalizedName.includes("chu nhat") ||
      normalizedName.includes("sunday")
    ) {
      return 6;
    }

    const mappingByName: Array<{ key: string; dayIndex: number }> = [
      { key: "thứ 2", dayIndex: 0 },
      { key: "thu 2", dayIndex: 0 },
      { key: "monday", dayIndex: 0 },
      { key: "thứ 3", dayIndex: 1 },
      { key: "thu 3", dayIndex: 1 },
      { key: "tuesday", dayIndex: 1 },
      { key: "thứ 4", dayIndex: 2 },
      { key: "thu 4", dayIndex: 2 },
      { key: "wednesday", dayIndex: 2 },
      { key: "thứ 5", dayIndex: 3 },
      { key: "thu 5", dayIndex: 3 },
      { key: "thursday", dayIndex: 3 },
      { key: "thứ 6", dayIndex: 4 },
      { key: "thu 6", dayIndex: 4 },
      { key: "friday", dayIndex: 4 },
      { key: "thứ 7", dayIndex: 5 },
      { key: "thu 7", dayIndex: 5 },
      { key: "saturday", dayIndex: 5 },
    ];

    const matched = mappingByName.find((item) =>
      normalizedName.includes(item.key),
    );
    if (matched) {
      return matched.dayIndex;
    }
  }

  const numericDay = typeof dayOfWeek === "number" ? dayOfWeek : NaN;
  if (!Number.isInteger(numericDay)) {
    return null;
  }

  if (numericDay === 0 || numericDay === 7 || numericDay === 8) {
    return 6;
  }

  if (numericDay >= 1 && numericDay <= 6) {
    return numericDay - 1;
  }

  return null;
};

const getDayIndexFromSessionDate = (sessionDate?: string): number | null => {
  if (!sessionDate) {
    return null;
  }

  const date = parseIsoDateLocal(sessionDate);
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
};

const getScheduleCardClassName = (
  status?: string,
  courseCode?: string,
): string => {
  if (status === "CANCELLED") {
    return "border-[#df8e8e] bg-[#fff1f1] text-[#8f2f2f]";
  }

  if (status === "RESCHEDULED") {
    return "border-[#e6b074] bg-[#fff7ea] text-[#8a5200]";
  }

  const colorPalettes = [
    "border-[#86abd8] bg-[#dce9fb] text-[#1c3552]",
    "border-[#93b6e3] bg-[#d8e7fb] text-[#1d3651]",
    "border-[#97abd1] bg-[#dfe8f8] text-[#20334d]",
    "border-[#9fb3d8] bg-[#dbe7fb] text-[#1f3552]",
  ];

  const token = courseCode || "course";
  const hash = token
    .split("")
    .reduce((current, char) => current + char.charCodeAt(0), 0);
  return colorPalettes[hash % colorPalettes.length];
};

const getRegistrationStatusLabel = (status?: string): string => {
  switch (status) {
    case "OPEN":
      return "Đang mở";
    case "ONGOING":
      return "Đang diễn ra";
    case "FINISHED":
      return "Đã kết thúc";
    case "CANCELLED":
      return "Đã hủy";
    case "PENDING":
      return "Chờ xác nhận";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "DROPPED":
      return "Đã hủy đăng ký";
    default:
      return status || "-";
  }
};

const getRegistrationStatusClass = (status?: string): string => {
  switch (status) {
    case "OPEN":
    case "CONFIRMED":
      return "bg-[#eef8f1] text-[#1d7a46]";
    case "PENDING":
    case "ONGOING":
      return "bg-[#fff7e8] text-[#a16a00]";
    case "CANCELLED":
    case "DROPPED":
      return "bg-[#fff0f0] text-[#bf4e4e]";
    default:
      return "bg-[#eef4f8] text-[#47677e]";
  }
};

const getGradeStatusLabel = (status?: string): string => {
  switch (status) {
    case "PUBLISHED":
      return "Đã công bố";
    case "LOCKED":
      return "Đã chốt";
    case "DRAFT":
      return "Nháp";
    default:
      return status || "-";
  }
};

const getGradeStatusClass = (status?: string): string => {
  switch (status) {
    case "PUBLISHED":
      return "bg-[#eef8f1] text-[#1d7a46]";
    case "LOCKED":
      return "bg-[#eef4fb] text-[#1f4f84]";
    case "DRAFT":
      return "bg-[#fff7e8] text-[#a16a00]";
    default:
      return "bg-[#eef4f8] text-[#47677e]";
  }
};

const getTopHeaderDisplayLabel = (label: string): string => {
  if (label === "Thông báo") {
    return "Thông báo";
  }

  if (label === "Quy dinh - quy che") {
    return "Quy định - quy chế";
  }

  if (label === "Thông tin cập nhật") {
    return "Thông tin cập nhật";
  }

  return label;
};

const getStudentTabDisplayLabel = (
  item: Pick<StudentFeatureTab, "key" | "label">,
): string => {
  if (item.key === "course-registration") {
    return "Đăng ký môn học";
  }

  return item.label;
};

const getStudentTabDescription = (
  item: Pick<StudentFeatureTab, "key" | "description">,
): string => {
  if (item.key === "course-registration") {
    return "Tra cứu học phần đang mở, lọc theo môn học và gửi yêu cầu đăng ký ngay trên trang này.";
  }

  return item.description;
};

const parseRegistrationError = (error: unknown): RegistrationNotice => {
  const fallback: RegistrationNotice = {
    title: "Không thể đăng ký học phần",
    message: "Đăng ký học phần thất bại. Vui lòng thử lại.",
  };

  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  const separatorIndex = error.message.indexOf(" - ");
  if (separatorIndex >= 0) {
    const payloadText = error.message.slice(separatorIndex + 3).trim();

    try {
      const payload = JSON.parse(payloadText) as {
        status?: number;
        message?: string;
        path?: string;
      };

      if (
        payload.status === 400 &&
        typeof payload.path === "string" &&
        payload.path.includes("schedule conflicts with section")
      ) {
        const matched = payload.path.match(/section\s+([A-Za-z0-9_-]+)/i);

        return {
          title: "Không thể đăng ký học phần",
          message: matched
            ? `Lớp học phần bạn chọn bị trùng lịch với lớp ${matched[1]} đã đăng ký. Vui lòng chọn lớp khác hoặc hủy lớp đang bị trùng trước khi đăng ký lại.`
            : "Lớp học phần bạn chọn đang bị trùng lịch với một lớp đã đăng ký. Vui lòng kiểm tra lại thời khóa biểu trước khi đăng ký.",
          detail: payload.path,
        };
      }
    } catch {
      return {
        title: fallback.title,
        message: error.message,
      };
    }
  }

  return {
    title: fallback.title,
    message: error.message,
  };
};

export default function DashboardPage() {
  const { session, logout } = useAuth();
  const toast = useToast();

  const [activeTabKey, setActiveTabKey] =
    useState<StudentFeatureTab["key"]>("home");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [tabError, setTabError] = useState("");
  const [tabMessage, setTabMessage] = useState("");
  useToastFeedback({
    errorMessage: tabError,
    errorTitle: "Thao tác sinh viên thất bại",
  });

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    dateOfBirth: "",
  });

  const [gradeReports, setGradeReports] = useState<GradeReportResponse[]>([]);
  const [gradeKeyword, setGradeKeyword] = useState("");
  const [gradeStatusFilter, setGradeStatusFilter] = useState("");
  const [gradeSemesterFilter, setGradeSemesterFilter] = useState("");
  const [gradeCourseFilter, setGradeCourseFilter] = useState("");
  const [selectedGradeReportId, setSelectedGradeReportId] = useState<
    number | null
  >(null);
  const [gradeSectionsById, setGradeSectionsById] = useState<
    Record<number, CourseSectionResponse>
  >({});
  const [isGradeContextLoading, setIsGradeContextLoading] = useState(false);
  const [gradeComponentsByCourseId, setGradeComponentsByCourseId] = useState<
    Record<number, GradeComponentResponse[]>
  >({});
  const [loadingGradeComponentCourseId, setLoadingGradeComponentCourseId] =
    useState<number | null>(null);
  const [attendanceItems, setAttendanceItems] = useState<AttendanceResponse[]>([]);
  const [allCourseSections, setAllCourseSections] = useState<
    CourseSectionResponse[]
  >([]);
  const [courseSections, setCourseSections] = useState<CourseSectionResponse[]>(
    [],
  );
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [courseKeyword, setCourseKeyword] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [registrationNotice, setRegistrationNotice] =
    useState<RegistrationNotice | null>(null);
  const [registeredSections, setRegisteredSections] = useState<
    RegisteredCourseItem[]
  >([]);
  const [sectionDetail, setSectionDetail] = useState<CourseSectionResponse | null>(
    null,
  );
  const [sectionSchedules, setSectionSchedules] = useState<
    RecurringScheduleResponse[]
  >([]);
  const [sectionSessions, setSectionSessions] = useState<ClassSessionResponse[]>(
    [],
  );
  const [isSectionDetailLoading, setIsSectionDetailLoading] = useState(false);
  const [myScheduleBlocks, setMyScheduleBlocks] = useState<WeeklyScheduleBlock[]>(
    [],
  );
  const [selectedScheduleSemesterId, setSelectedScheduleSemesterId] =
    useState("");
  const [selectedScheduleWeekKey, setSelectedScheduleWeekKey] = useState("");
  const [scheduleViewType, setScheduleViewType] = useState("personal");
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (!studentIdInput) {
      setStudentIdInput(String(session.accountId));
    }
  }, [session, studentIdInput]);

  const activeTab = useMemo(
    () =>
      studentFeatureTabs.find((item) => item.key === activeTabKey) ||
      studentFeatureTabs[0],
    [activeTabKey],
  );

  const selectedSection = useMemo(() => {
    return (
      courseSections.find((section) => String(section.id) === selectedSectionId) ||
      null
    );
  }, [courseSections, selectedSectionId]);

  const selectedSectionDetails = useMemo(() => {
    if (sectionDetail && String(sectionDetail.id) === selectedSectionId) {
      return sectionDetail;
    }

    return selectedSection;
  }, [sectionDetail, selectedSection, selectedSectionId]);

  const courseFilterOptions = useMemo(() => {
    const optionsMap = new Map<number, CourseFilterOption>();

    allCourseSections.forEach((section) => {
      if (!section.courseId || optionsMap.has(section.courseId)) {
        return;
      }

      optionsMap.set(section.courseId, {
        courseId: section.courseId,
        courseCode: section.courseCode,
        courseName: getCourseDisplayName(section),
      });
    });

    return Array.from(optionsMap.values()).sort((a, b) =>
      a.courseName.localeCompare(b.courseName, "vi"),
    );
  }, [allCourseSections]);

  const semesterFilterOptions = useMemo(() => {
    const optionsMap = new Map<number, SemesterFilterOption>();

    allCourseSections.forEach((section) => {
      if (!section.semesterId || optionsMap.has(section.semesterId)) {
        return;
      }

      optionsMap.set(section.semesterId, {
        semesterId: section.semesterId,
        semesterNumber: section.semesterNumber,
        academicYear: section.academicYear,
        label: getSemesterDisplayLabel(section.semesterNumber, section.academicYear),
      });
    });

    return Array.from(optionsMap.values()).sort((a, b) => {
      if ((a.semesterNumber ?? 0) === (b.semesterNumber ?? 0)) {
        return (a.academicYear || "").localeCompare(b.academicYear || "", "vi");
      }

      return (a.semesterNumber ?? 0) - (b.semesterNumber ?? 0);
    });
  }, [allCourseSections]);

  const selectedSemesterLabel = useMemo(() => {
    const semesterValue = parsePositiveInteger(selectedSemesterId);
    if (!semesterValue) {
      return null;
    }

    const option = semesterFilterOptions.find(
      (item) => item.semesterId === semesterValue,
    );

    return option?.label || null;
  }, [selectedSemesterId, semesterFilterOptions]);

  const filteredSections = useMemo(() => {
    const normalizedKeyword = courseKeyword.trim().toLowerCase();

    return courseSections.filter((section) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [
          section.courseCode,
          getCourseDisplayName(section),
          getSectionDisplayName(section),
          section.sectionCode,
          section.lecturerName,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedKeyword),
          );

      return matchesKeyword;
    });
  }, [courseKeyword, courseSections]);

  const scheduleSemesterOptions = useMemo(() => {
    const optionsMap = new Map<number, SemesterFilterOption>();

    myScheduleBlocks.forEach((block) => {
      if (!block.semesterId || optionsMap.has(block.semesterId)) {
        return;
      }

      optionsMap.set(block.semesterId, {
        semesterId: block.semesterId,
        semesterNumber: block.semesterNumber,
        academicYear: block.academicYear,
        label: getSemesterDisplayLabel(block.semesterNumber, block.academicYear),
      });
    });

    return Array.from(optionsMap.values()).sort((a, b) => {
      if ((a.semesterNumber ?? 0) === (b.semesterNumber ?? 0)) {
        return (a.academicYear || "").localeCompare(b.academicYear || "", "vi");
      }

      return (a.semesterNumber ?? 0) - (b.semesterNumber ?? 0);
    });
  }, [myScheduleBlocks]);

  const scheduleBlocksBySemester = useMemo(() => {
    const semesterId = parsePositiveInteger(selectedScheduleSemesterId);
    if (!semesterId) {
      return myScheduleBlocks;
    }

    return myScheduleBlocks.filter((block) => block.semesterId === semesterId);
  }, [myScheduleBlocks, selectedScheduleSemesterId]);

  const scheduleWeekOptions = useMemo<ScheduleWeekOption[]>(() => {
    const weekStarts = new Set<string>();

    scheduleBlocksBySemester.forEach((block) => {
      if (!block.sessionDate) {
        return;
      }

      const monday = getMondayOfWeek(parseIsoDateLocal(block.sessionDate));
      weekStarts.add(toLocalIsoDate(monday));
    });

    if (weekStarts.size === 0) {
      weekStarts.add(toLocalIsoDate(getMondayOfWeek(new Date())));
    }

    return Array.from(weekStarts.values())
      .sort((a, b) => parseIsoDateLocal(a).getTime() - parseIsoDateLocal(b).getTime())
      .map((startDate) => buildScheduleWeekOption(startDate));
  }, [scheduleBlocksBySemester]);

  const selectedScheduleWeekStartKey = useMemo(() => {
    if (selectedScheduleWeekKey) {
      return selectedScheduleWeekKey;
    }

    if (scheduleWeekOptions.length > 0) {
      return scheduleWeekOptions[0].key;
    }

    return toLocalIsoDate(getMondayOfWeek(new Date()));
  }, [scheduleWeekOptions, selectedScheduleWeekKey]);

  const selectedScheduleWeek = useMemo(() => {
    return (
      scheduleWeekOptions.find((item) => item.key === selectedScheduleWeekStartKey) ||
      buildScheduleWeekOption(selectedScheduleWeekStartKey)
    );
  }, [scheduleWeekOptions, selectedScheduleWeekStartKey]);

  const scheduleWeekSelectOptions = useMemo(() => {
    const optionMap = new Map<string, ScheduleWeekOption>();

    scheduleWeekOptions.forEach((item) => {
      optionMap.set(item.key, item);
    });

    const centerWeek = parseIsoDateLocal(selectedScheduleWeekStartKey);
    for (let offset = -4; offset <= 4; offset += 1) {
      const weekKey = toLocalIsoDate(addDays(centerWeek, offset * 7));
      if (!optionMap.has(weekKey)) {
        optionMap.set(weekKey, buildScheduleWeekOption(weekKey));
      }
    }

    return Array.from(optionMap.values()).sort(
      (first, second) =>
        parseIsoDateLocal(first.startDate).getTime() -
        parseIsoDateLocal(second.startDate).getTime(),
    );
  }, [scheduleWeekOptions, selectedScheduleWeekStartKey]);

  const scheduleWeekDates = useMemo(() => {
    const startDate = parseIsoDateLocal(selectedScheduleWeek.startDate);
    return Array.from({ length: 7 }, (_, index) =>
      toLocalIsoDate(addDays(startDate, index)),
    );
  }, [selectedScheduleWeek]);

  const selectedScheduleSemesterLabel = useMemo(() => {
    const selectedSemester = scheduleSemesterOptions.find(
      (item) => String(item.semesterId) === selectedScheduleSemesterId,
    );

    return selectedSemester?.label || "Tất cả học kỳ";
  }, [scheduleSemesterOptions, selectedScheduleSemesterId]);

  const scheduleVisibleBlocks = useMemo(() => {
    const weekStart = parseIsoDateLocal(selectedScheduleWeek.startDate).getTime();
    const weekEnd = parseIsoDateLocal(selectedScheduleWeek.endDate).getTime();
    const currentWeekStart = parseIsoDateLocal(selectedScheduleWeek.startDate);

    return scheduleBlocksBySemester
      .map((block) => {
        const safeStart = Math.max(1, Math.min(14, block.startPeriod));
        const safeEnd = Math.max(safeStart, Math.min(14, block.endPeriod));
        return {
          ...block,
          startPeriod: safeStart,
          endPeriod: safeEnd,
        };
      })
      .flatMap((block) => {
        if (block.sessionDate) {
          const sessionTime = parseIsoDateLocal(block.sessionDate).getTime();
          if (sessionTime < weekStart || sessionTime > weekEnd) {
            return [];
          }

          const sessionDayIndex = getDayIndexFromSessionDate(block.sessionDate);
          if (sessionDayIndex === null) {
            return [];
          }

          return [{ ...block, dayIndex: sessionDayIndex }];
        }

        if (block.dayIndex < 0 || block.dayIndex > 6) {
          return [];
        }

        return [
          {
            ...block,
            sessionDate: toLocalIsoDate(addDays(currentWeekStart, block.dayIndex)),
          },
        ];
      });
  }, [scheduleBlocksBySemester, selectedScheduleWeek]);

  const scheduleBlocksByDay = useMemo(() => {
    const buckets: WeeklyScheduleBlock[][] = Array.from({ length: 7 }, () => []);

    scheduleVisibleBlocks.forEach((block) => {
      if (block.dayIndex < 0 || block.dayIndex > 6) {
        return;
      }
      buckets[block.dayIndex].push(block);
    });

    buckets.forEach((dayBlocks) => {
      dayBlocks.sort((first, second) => {
        if (first.startPeriod === second.startPeriod) {
          return first.endPeriod - second.endPeriod;
        }
        return first.startPeriod - second.startPeriod;
      });
    });

    return buckets;
  }, [scheduleVisibleBlocks]);

  const gradeSemesterOptions = useMemo(() => {
    const optionsMap = new Map<string, { value: string; label: string }>();

    gradeReports.forEach((report) => {
      if (!report.sectionId) {
        return;
      }

      const section = gradeSectionsById[report.sectionId];
      if (!section) {
        return;
      }

      const value = getGradeSemesterFilterValue(section);
      if (!value || optionsMap.has(value)) {
        return;
      }

      optionsMap.set(value, {
        value,
        label: getSemesterDisplayLabel(section.semesterNumber, section.academicYear),
      });
    });

    return Array.from(optionsMap.values()).sort((first, second) =>
      first.label.localeCompare(second.label, "vi"),
    );
  }, [gradeReports, gradeSectionsById]);

  const gradeCourseOptions = useMemo(() => {
    const optionsMap = new Map<string, { value: string; label: string }>();

    gradeReports.forEach((report) => {
      const section = report.sectionId ? gradeSectionsById[report.sectionId] : undefined;
      const value = getGradeCourseFilterValue(report, section);

      if (!value || optionsMap.has(value)) {
        return;
      }

      const sectionCourseName = section ? getCourseDisplayName(section) : "";
      const label = section
        ? [section.courseCode, sectionCourseName].filter(Boolean).join(" - ")
        : report.courseName || value;

      optionsMap.set(value, {
        value,
        label,
      });
    });

    return Array.from(optionsMap.values()).sort((first, second) =>
      first.label.localeCompare(second.label, "vi"),
    );
  }, [gradeReports, gradeSectionsById]);

  const filteredGradeReports = useMemo(() => {
    const normalizedKeyword = gradeKeyword.trim().toLowerCase();

    return gradeReports.filter((item) => {
      const statusMatched = !gradeStatusFilter || item.status === gradeStatusFilter;

      const sectionInfo = item.sectionId
        ? gradeSectionsById[item.sectionId]
        : undefined;
      const semesterMatched =
        !gradeSemesterFilter ||
        getGradeSemesterFilterValue(sectionInfo) === gradeSemesterFilter;
      const courseMatched =
        !gradeCourseFilter ||
        getGradeCourseFilterValue(item, sectionInfo) === gradeCourseFilter;
      const semesterLabel = getSemesterDisplayLabel(
        sectionInfo?.semesterNumber,
        sectionInfo?.academicYear,
      );
      const keywordMatched =
        !normalizedKeyword ||
        [
          item.courseName,
          item.letterGrade,
          item.status,
          typeof item.finalScore === "number"
            ? String(item.finalScore)
            : undefined,
          sectionInfo?.sectionCode,
          sectionInfo?.courseCode,
          semesterLabel,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedKeyword),
          );

      return statusMatched && semesterMatched && courseMatched && keywordMatched;
    });
  }, [
    gradeCourseFilter,
    gradeKeyword,
    gradeReports,
    gradeSectionsById,
    gradeSemesterFilter,
    gradeStatusFilter,
  ]);

  const gradeSummary = useMemo(() => {
    const validScores = gradeReports
      .map((item) => item.finalScore)
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      );

    const publishedCount = gradeReports.filter(
      (item) => item.status === "PUBLISHED",
    ).length;
    const lockedCount = gradeReports.filter((item) => item.status === "LOCKED").length;

    const averageScore =
      validScores.length > 0
        ? validScores.reduce((sum, value) => sum + value, 0) / validScores.length
        : null;

    return {
      total: gradeReports.length,
      publishedCount,
      lockedCount,
      averageScore,
    };
  }, [gradeReports]);

  const selectedGradeReport = useMemo(() => {
    if (selectedGradeReportId === null) {
      return filteredGradeReports[0] || gradeReports[0] || null;
    }

    return (
      filteredGradeReports.find((item) => item.id === selectedGradeReportId) ||
      gradeReports.find((item) => item.id === selectedGradeReportId) ||
      null
    );
  }, [filteredGradeReports, gradeReports, selectedGradeReportId]);

  const selectedGradeSection = useMemo(() => {
    if (!selectedGradeReport?.sectionId) {
      return null;
    }

    return gradeSectionsById[selectedGradeReport.sectionId] || null;
  }, [gradeSectionsById, selectedGradeReport]);

  const selectedGradeDetails = useMemo<GradeDetailItem[]>(() => {
    if (!selectedGradeReport) {
      return [];
    }

    const details = selectedGradeReport.gradeDetails;
    if (!Array.isArray(details)) {
      return [];
    }

    return details;
  }, [selectedGradeReport]);

  const selectedGradeCourseId = selectedGradeSection?.courseId || null;

  const selectedGradeComponents = useMemo(() => {
    if (!selectedGradeCourseId) {
      return [] as GradeComponentResponse[];
    }

    return gradeComponentsByCourseId[selectedGradeCourseId] || [];
  }, [gradeComponentsByCourseId, selectedGradeCourseId]);

  const selectedGradeComponentRows = useMemo(() => {
    if (selectedGradeComponents.length === 0) {
      return selectedGradeDetails;
    }

    const detailByComponentId = new Map<number, GradeDetailItem>();
    selectedGradeDetails.forEach((detail) => {
      if (typeof detail.componentId !== "number") {
        return;
      }
      detailByComponentId.set(detail.componentId, detail);
    });

    const mergedRows = selectedGradeComponents.map((component) => {
      const matchedDetail =
        typeof component.id === "number"
          ? detailByComponentId.get(component.id)
          : undefined;

      return {
        id: matchedDetail?.id,
        componentId: component.id,
        componentName: component.componentName || matchedDetail?.componentName,
        weightPercentage:
          typeof component.weightPercentage === "number"
            ? component.weightPercentage
            : matchedDetail?.weightPercentage,
        score: matchedDetail?.score,
      } satisfies GradeDetailItem;
    });

    const extraDetails = selectedGradeDetails.filter((detail) => {
      if (typeof detail.componentId !== "number") {
        return true;
      }

      return !selectedGradeComponents.some(
        (component) => component.id === detail.componentId,
      );
    });

    return [...mergedRows, ...extraDetails];
  }, [selectedGradeComponents, selectedGradeDetails]);

  const selectedGradeComponentStats = useMemo(() => {
    const totalWeight = selectedGradeComponentRows.reduce((sum, item) => {
      if (typeof item.weightPercentage !== "number") {
        return sum;
      }
      return sum + item.weightPercentage;
    }, 0);

    const gradedWeight = selectedGradeComponentRows.reduce((sum, item) => {
      if (
        typeof item.weightPercentage !== "number" ||
        typeof item.score !== "number"
      ) {
        return sum;
      }
      return sum + item.weightPercentage;
    }, 0);

    const weightedScore = selectedGradeComponentRows.reduce((sum, item) => {
      if (
        typeof item.weightPercentage !== "number" ||
        typeof item.score !== "number"
      ) {
        return sum;
      }
      return sum + (item.score * item.weightPercentage) / 100;
    }, 0);

    return {
      totalWeight,
      gradedWeight,
      weightedScore,
    };
  }, [selectedGradeComponentRows]);

  const isLoadingSelectedGradeComponents =
    selectedGradeCourseId !== null &&
    loadingGradeComponentCourseId === selectedGradeCourseId;

  const hasSelectedGradeWeight = selectedGradeComponentRows.some(
    (item) => typeof item.weightPercentage === "number",
  );
  const isSelectedGradeWeightBalanced =
    hasSelectedGradeWeight &&
    Math.abs(selectedGradeComponentStats.totalWeight - 100) <= 0.01;

  useEffect(() => {
    if (scheduleSemesterOptions.length === 0) {
      if (selectedScheduleSemesterId) {
        setSelectedScheduleSemesterId("");
      }
      return;
    }

    const stillValid = scheduleSemesterOptions.some(
      (item) => String(item.semesterId) === selectedScheduleSemesterId,
    );

    if (!stillValid) {
      const defaultOption = scheduleSemesterOptions[scheduleSemesterOptions.length - 1];
      setSelectedScheduleSemesterId(String(defaultOption.semesterId));
    }
  }, [scheduleSemesterOptions, selectedScheduleSemesterId]);

  useEffect(() => {
    if (selectedScheduleWeekKey) {
      return;
    }

    const currentWeekKey = toLocalIsoDate(getMondayOfWeek(new Date()));
    const defaultOption =
      scheduleWeekOptions.find((item) => item.key === currentWeekKey) ||
      scheduleWeekOptions[0] ||
      buildScheduleWeekOption(currentWeekKey);

    setSelectedScheduleWeekKey(defaultOption.key);
  }, [scheduleWeekOptions, selectedScheduleWeekKey]);

  useEffect(() => {
    if (activeTabKey !== "grades") {
      return;
    }

    const authorization = session?.authorization;
    if (!authorization || !selectedGradeCourseId) {
      return;
    }

    if (gradeComponentsByCourseId[selectedGradeCourseId]) {
      return;
    }

    let cancelled = false;
    setLoadingGradeComponentCourseId(selectedGradeCourseId);

    const loadGradeComponents = async () => {
      try {
        const components = await getGradeComponentsByCourse(
          selectedGradeCourseId,
          authorization,
        );

        if (cancelled) {
          return;
        }

        setGradeComponentsByCourseId((current) => ({
          ...current,
          [selectedGradeCourseId]: components,
        }));
      } catch {
        if (cancelled) {
          return;
        }

        setGradeComponentsByCourseId((current) => ({
          ...current,
          [selectedGradeCourseId]: [],
        }));
      } finally {
        if (!cancelled) {
          setLoadingGradeComponentCourseId(null);
        }
      }
    };

    void loadGradeComponents();

    return () => {
      cancelled = true;
    };
  }, [activeTabKey, gradeComponentsByCourseId, selectedGradeCourseId, session?.authorization]);

  const requireSession = (): string | null => {
    if (!session?.authorization) {
      setTabError("Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.");
      return null;
    }

    return session.authorization;
  };

  const getStudentIdValue = (): number | null => {
    const parsed = Number(studentIdInput);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setTabError("Mã sinh viên không hợp le.");
      return null;
    }

    return parsed;
  };

  const runAction = async (action: () => Promise<void>) => {
    try {
      setIsWorking(true);
      setTabError("");
      setTabMessage("");
      await action();
    } catch (error) {
      setTabError(toErrorMessage(error));
    } finally {
      setIsWorking(false);
    }
  };

  const buildFallbackProfile = (): ProfileResponse => {
    return {
      username: session?.username,
      role: session?.role,
      studentCode: studentIdInput || undefined,
    };
  };

  const handleLoadProfile = async () => {
    const authorization = requireSession();
    if (!authorization) {
      return;
    }

    setIsWorking(true);
    setTabError("");
    setTabMessage("");

    try {
      const data = await getMyProfile(authorization);
      setProfile(data);
      setProfileForm({
        fullName: data.fullName || "",
        phone: data.phone || "",
        address: data.address || "",
        dateOfBirth: data.dateOfBirth || "",
      });
      setTabMessage("Đã tải thông tin hồ sơ.");
    } catch (error) {
      const errorMessage = toErrorMessage(error);
      if (
        errorMessage.includes("[API 403]") ||
        errorMessage.includes("[API 404]")
      ) {
        const fallbackProfile = buildFallbackProfile();
        setProfile(fallbackProfile);
        setProfileForm({
          fullName: fallbackProfile.fullName || "",
          phone: fallbackProfile.phone || "",
          address: fallbackProfile.address || "",
          dateOfBirth: fallbackProfile.dateOfBirth || "",
        });
        setTabMessage(
          "Tài khoản hiện tại chưa có dữ liệu hồ sơ đầy đủ. Đang hiển thị thông tin cơ bản.",
        );
        return;
      }

      setTabError(errorMessage);
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const authorization = requireSession();
    if (!authorization) {
      return;
    }

    await runAction(async () => {
      const data = await updateMyProfile(
        {
          fullName: profileForm.fullName.trim(),
          phone: profileForm.phone.trim() || undefined,
          address: profileForm.address.trim() || undefined,
          dateOfBirth: profileForm.dateOfBirth || undefined,
        },
        authorization,
      );
      setProfile(data);
      setTabMessage("Cập nhật hồ sơ thành công.");
      toast.success("Cập nhật hồ sơ thành công.", "Thành công");
    });
  };

  const handleLoadGrades = async () => {
    const authorization = requireSession();
    const studentId = getStudentIdValue();

    if (!authorization || !studentId) {
      return;
    }

    await runAction(async () => {
      const data = await getMyGradeReports(studentId, authorization);
      setGradeReports(data);
      setSelectedGradeReportId(data[0]?.id ?? null);
      setGradeComponentsByCourseId({});
      setLoadingGradeComponentCourseId(null);

      const sectionIds = Array.from(
        new Set(
          data
            .map((item) => item.sectionId)
            .filter(
              (value): value is number =>
                typeof value === "number" && Number.isInteger(value) && value > 0,
            ),
        ),
      );

      if (sectionIds.length === 0) {
        setGradeSectionsById({});
        setTabMessage(`Đã tải ${data.length} bản ghi điểm.`);
        return;
      }

      setIsGradeContextLoading(true);

      try {
        const sections = await Promise.all(
          sectionIds.map((sectionId) =>
            getCourseSectionById(sectionId, authorization).catch(() => null),
          ),
        );

        const nextSectionMap: Record<number, CourseSectionResponse> = {};
        sections.forEach((section) => {
          if (!section) {
            return;
          }
          nextSectionMap[section.id] = section;
        });

        setGradeSectionsById(nextSectionMap);
      } finally {
        setIsGradeContextLoading(false);
      }

      setTabMessage(`Đã tải ${data.length} bản ghi điểm.`);
    });
  };

  const handleLoadAttendance = async () => {
    const authorization = requireSession();
    const studentId = getStudentIdValue();

    if (!authorization || !studentId) {
      return;
    }

    await runAction(async () => {
      const data = await getMyAttendance(studentId, authorization);
      setAttendanceItems(data);
      setTabMessage(`Đã tải ${data.length} bản ghi chuyên cần.`);
    });
  };

  const handleLoadStudentWeeklySchedule = async () => {
    const authorization = requireSession();
    const studentId = getStudentIdValue();

    if (!authorization || !studentId) {
      return;
    }

    setIsScheduleLoading(true);
    setTabError("");
    setTabMessage("");

    try {
      const reports = await getMyGradeReports(studentId, authorization);
      const reportSectionIds = reports
        .map((item) => item.sectionId)
        .filter(
          (value): value is number =>
            typeof value === "number" && Number.isInteger(value) && value > 0,
        );
      const localRegisteredSectionIds = registeredSections
        .map((item) => item.section.id)
        .filter((value): value is number => Number.isInteger(value) && value > 0);

      const sectionIds = Array.from(
        new Set([...reportSectionIds, ...localRegisteredSectionIds]),
      );

      if (sectionIds.length === 0) {
        setMyScheduleBlocks([]);
        setTabMessage(
          "Chưa tìm thấy lớp học phần của sinh viên để tạo thời khóa biểu.",
        );
        return;
      }

      const sectionResponses = await Promise.all(
        sectionIds.map((sectionId) =>
          getCourseSectionById(sectionId, authorization).catch(() => null),
        ),
      );

      const validSections = sectionResponses.filter(
        (section): section is CourseSectionResponse => Boolean(section),
      );

      const nextBlocks: WeeklyScheduleBlock[] = [];

      await Promise.all(
        validSections.map(async (section) => {
          const schedules = await getRecurringSchedulesBySection(
            section.id,
            authorization,
          ).catch(() => []);

          await Promise.all(
            schedules.map(async (schedule) => {
              const parsedStart = schedule.startPeriod || 0;
              const parsedEnd = schedule.endPeriod || 0;
              if (parsedStart <= 0 || parsedEnd <= 0) {
                return;
              }

              const sessions = schedule.id
                ? await getRecurringScheduleSessions(
                    schedule.id,
                    authorization,
                  ).catch(() => [])
                : [];

              if (sessions.length > 0) {
                sessions.forEach((session) => {
                  const dayIndex =
                    getDayIndexFromSessionDate(session.sessionDate) ??
                    normalizeDayIndex(schedule.dayOfWeek, schedule.dayOfWeekName);

                  if (dayIndex === null) {
                    return;
                  }

                  nextBlocks.push({
                    key: `session-${session.id || `${section.id}-${schedule.id || "x"}-${session.sessionDate || ""}-${parsedStart}-${parsedEnd}`}`,
                    sectionId: section.id,
                    courseName: getCourseDisplayName(section),
                    courseCode: section.courseCode,
                    sectionCode: section.sectionCode,
                    lecturerName: section.lecturerName,
                    classroomName: session.classroomName || schedule.classroomName,
                    startPeriod: session.startPeriod || parsedStart,
                    endPeriod: session.endPeriod || parsedEnd,
                    dayIndex,
                    sessionDate: session.sessionDate,
                    status: session.status,
                    semesterId: section.semesterId,
                    semesterNumber: section.semesterNumber,
                    academicYear: section.academicYear,
                  });
                });

                return;
              }

              const dayIndex = normalizeDayIndex(
                schedule.dayOfWeek,
                schedule.dayOfWeekName,
              );
              if (dayIndex === null) {
                return;
              }

              nextBlocks.push({
                key: `template-${section.id}-${schedule.id || `${dayIndex}-${parsedStart}-${parsedEnd}`}`,
                sectionId: section.id,
                courseName: getCourseDisplayName(section),
                courseCode: section.courseCode,
                sectionCode: section.sectionCode,
                lecturerName: section.lecturerName,
                classroomName: schedule.classroomName,
                startPeriod: parsedStart,
                endPeriod: parsedEnd,
                dayIndex,
                status: section.status,
                semesterId: section.semesterId,
                semesterNumber: section.semesterNumber,
                academicYear: section.academicYear,
              });
            }),
          );
        }),
      );

      const dedupedBlocks = Array.from(
        new Map(nextBlocks.map((block) => [block.key, block])).values(),
      );

      dedupedBlocks.sort((first, second) => {
        if ((first.sessionDate || "") === (second.sessionDate || "")) {
          if (first.dayIndex === second.dayIndex) {
            return first.startPeriod - second.startPeriod;
          }
          return first.dayIndex - second.dayIndex;
        }

        return (first.sessionDate || "").localeCompare(second.sessionDate || "");
      });

      setMyScheduleBlocks(dedupedBlocks);
      setTabMessage(`Đã tải thời khóa biểu cá nhân với ${dedupedBlocks.length} ca học.`);
    } catch (error) {
      setTabError(toErrorMessage(error));
      setMyScheduleBlocks([]);
    } finally {
      setIsScheduleLoading(false);
    }
  };

  const handleShiftScheduleWeek = (direction: -1 | 1) => {
    const baseWeekStart = selectedScheduleWeek.startDate;
    const nextWeekStart = addDays(
      parseIsoDateLocal(baseWeekStart),
      direction * 7,
    );
    setSelectedScheduleWeekKey(toLocalIsoDate(nextWeekStart));
  };

  const syncSelectedSection = (nextSections: CourseSectionResponse[]) => {
    setSelectedSectionId((currentSectionId) => {
      if (
        currentSectionId &&
        nextSections.some((section) => String(section.id) === currentSectionId)
      ) {
        return currentSectionId;
      }

      return nextSections.length > 0 ? String(nextSections[0].id) : "";
    });
  };

  const resolveRegistrationSectionsByFilters = async (
    authorization: string,
    courseIdValue: string,
    semesterIdValue: string,
    fallbackSections: CourseSectionResponse[],
  ): Promise<CourseSectionResponse[]> => {
    const courseId = parsePositiveInteger(courseIdValue);
    const semesterId = parsePositiveInteger(semesterIdValue);

    if (courseId) {
      const sectionsByCourse = await getCourseSectionsByCourse(
        courseId,
        authorization,
      );

      if (!semesterId) {
        return sectionsByCourse;
      }

      return sectionsByCourse.filter(
        (section) => section.semesterId === semesterId,
      );
    }

    if (semesterId) {
      return getCourseSectionsBySemester(semesterId, authorization);
    }

    return fallbackSections;
  };

  const handleLoadRegistrationSections = async (
    courseIdValue = selectedCourseId,
    semesterIdValue = selectedSemesterId,
  ) => {
    const authorization = requireSession();
    if (!authorization) {
      return;
    }

    await runAction(async () => {
      setRegistrationNotice(null);
      const allSections = await getCourseSections(authorization);
      setAllCourseSections(allSections);

      const filteredByBackend = await resolveRegistrationSectionsByFilters(
        authorization,
        courseIdValue,
        semesterIdValue,
        allSections,
      );

      setCourseSections(filteredByBackend);
      syncSelectedSection(filteredByBackend);
      setTabMessage(
        `Đã tải ${filteredByBackend.length} lớp học phần phù hợp bộ lọc.`,
      );
    });
  };

  const handleCourseFilterChange = (nextCourseId: string) => {
    setSelectedCourseId(nextCourseId);
    void handleLoadRegistrationSections(nextCourseId, selectedSemesterId);
  };

  const handleSemesterFilterChange = (nextSemesterId: string) => {
    setSelectedSemesterId(nextSemesterId);
    void handleLoadRegistrationSections(selectedCourseId, nextSemesterId);
  };

  const handleRegisterSection = async () => {
    const authorization = requireSession();
    if (!authorization) {
      return;
    }

    const parsedSectionId = Number(selectedSectionId);
    if (!Number.isInteger(parsedSectionId) || parsedSectionId <= 0) {
      const notice = {
        title: "Chưa chọn lớp học phần",
        message: "Vui lòng chọn một lớp học phần trước khi đăng ký.",
      };
      setRegistrationNotice(notice);
      toast.error(notice.message, notice.title);
      return;
    }

    const parsedStudentId = Number(studentIdInput);

    try {
      setIsWorking(true);
      setTabError("");
      setTabMessage("");
      setRegistrationNotice(null);

      const response = await registerCourseSection(
        {
          courseSectionId: parsedSectionId,
          studentId:
            Number.isInteger(parsedStudentId) && parsedStudentId > 0
              ? parsedStudentId
              : undefined,
        },
        authorization,
      );

      const registeredSectionSnapshot = selectedSectionDetails || selectedSection;

      if (registeredSectionSnapshot) {
        setRegisteredSections((currentItems) => {
          const nextItem: RegisteredCourseItem = {
            registrationId: response.id,
            registrationTime: response.registrationTime,
            status: response.status,
            section: registeredSectionSnapshot,
          };

          return [
            nextItem,
            ...currentItems.filter(
              (item) => item.section.id !== registeredSectionSnapshot.id,
            ),
          ];
        });
      }

      setTabMessage("Đăng ký học phần thành công.");
      toast.success("Đăng ký học phần thành công.", "Thành công");
    } catch (error) {
      const notice = parseRegistrationError(error);
      setRegistrationNotice(notice);
      toast.error(notice.message, notice.title);
    } finally {
      setIsWorking(false);
    }
  };

  useEffect(() => {
    if (activeTabKey !== "course-registration") {
      return;
    }

    const authorization = session?.authorization;
    const parsedSectionId = parsePositiveInteger(selectedSectionId);

    if (!authorization || !parsedSectionId) {
      setSectionDetail(null);
      setSectionSchedules([]);
      setSectionSessions([]);
      return;
    }

    let isCancelled = false;

    const loadSelectedSectionDetail = async () => {
      setIsSectionDetailLoading(true);

      try {
        const detail = await getCourseSectionById(parsedSectionId, authorization);
        if (isCancelled) {
          return;
        }
        setSectionDetail(detail);

        try {
          const schedules = await getRecurringSchedulesBySection(
            parsedSectionId,
            authorization,
          );
          if (isCancelled) {
            return;
          }
          setSectionSchedules(schedules);

          if (schedules.length === 0) {
            setSectionSessions([]);
            return;
          }

          const sessionGroups = await Promise.all(
            schedules.map((schedule) => {
              if (!schedule.id) {
                return Promise.resolve([]);
              }

              return getRecurringScheduleSessions(
                schedule.id,
                authorization,
              ).catch(() => []);
            }),
          );

          if (isCancelled) {
            return;
          }

          const mergedSessions = sessionGroups
            .flat()
            .sort((first, second) => {
              const firstTime = first.sessionDate
                ? new Date(first.sessionDate).getTime()
                : Number.MAX_SAFE_INTEGER;
              const secondTime = second.sessionDate
                ? new Date(second.sessionDate).getTime()
                : Number.MAX_SAFE_INTEGER;

              if (firstTime === secondTime) {
                return (
                  (first.startPeriod ?? Number.MAX_SAFE_INTEGER) -
                  (second.startPeriod ?? Number.MAX_SAFE_INTEGER)
                );
              }

              return firstTime - secondTime;
            });

          setSectionSessions(mergedSessions);
        } catch {
          if (isCancelled) {
            return;
          }
          setSectionSchedules([]);
          setSectionSessions([]);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }
        setTabError(toErrorMessage(error));
        setSectionDetail(null);
        setSectionSchedules([]);
        setSectionSessions([]);
      } finally {
        if (!isCancelled) {
          setIsSectionDetailLoading(false);
        }
      }
    };

    void loadSelectedSectionDetail();

    return () => {
      isCancelled = true;
    };
  }, [activeTabKey, selectedSectionId, session?.authorization]);

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const authorization = requireSession();
    if (!authorization) {
      return;
    }

    if (
      !passwordForm.oldPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setTabError("Vui lòng nhập đầy đủ thông tin đổi mật khẩu.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setTabError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }

    await runAction(async () => {
      await changeMyPassword(passwordForm, authorization);
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTabMessage("Đổi mật khẩu thành công.");
      toast.success("Đổi mật khẩu thành công.", "Thành công");
    });
  };

  return (
    <AuthGuard allowedRoles={["STUDENT"]}>
      <div className="min-h-screen bg-[#e9edf2]">
        <header className="flex h-[52px] items-center justify-between bg-[#0a6ca0] px-3 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-white/45 text-sm font-semibold">
              SG
            </div>
            <nav className="flex items-center gap-6 text-lg font-semibold">
              {studentTopHeaderTabs.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="text-base transition hover:text-[#d7f0ff]"
                >
                  {getTopHeaderDisplayLabel(item)}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-base font-bold">
              {(session?.username || "S").slice(0, 1).toUpperCase()}
            </div>
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold">{session?.username || "-"}</p>
              <p className="text-xs opacity-90">
                Mã sinh viên: {studentIdInput || "-"}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-[4px] border border-white/40 px-2 py-1 text-sm font-semibold transition hover:bg-white/15"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <div className="grid min-h-[calc(100vh-52px)] grid-cols-1 lg:grid-cols-[255px_minmax(0,1fr)]">
          <aside className="border-r border-[#b9cfe0] bg-[#f2f5f8]">
            <div className="border-b border-[#c7d8e5] px-4 py-3 text-[17px] font-semibold text-[#1c587f]">
              Menu sinh viên
            </div>
            <nav className="px-2 py-2">
              {studentFeatureTabs.map((item) => {
                const active = item.key === activeTabKey;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveTabKey(item.key);
                      setTabError("");
                      setTabMessage("");
                      if (item.key !== "course-registration") {
                        setRegistrationNotice(null);
                      }
                      if (item.key === "profile") {
                        void handleLoadProfile();
                      }
                      if (item.key === "course-registration") {
                        void handleLoadRegistrationSections();
                      }
                      if (item.key === "schedule") {
                        void handleLoadStudentWeeklySchedule();
                      }
                      if (item.key === "grades") {
                        void handleLoadGrades();
                      }
                    }}
                    className={`mb-1 flex w-full items-center justify-between rounded-[4px] px-3 py-2 text-left text-[17px] transition ${
                      active
                        ? "bg-[#d6e9f7] font-semibold text-[#0d517a]"
                        : "text-[#234d69] hover:bg-[#e5eef6]"
                    }`}
                  >
                    <span>{getStudentTabDisplayLabel(item)}</span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-5 border-t border-[#d0dce6] px-3 py-3 text-sm text-[#516b7f]">
              <p className="font-semibold text-[#2d5672]">Điều hướng nhanh</p>
              <p className="mt-2">
                <Link className="font-semibold text-[#0a5f92] hover:underline" href="/login">
                  Về trang đăng nhập
                </Link>
              </p>
            </div>
          </aside>

          <main className="space-y-4 p-3 sm:p-4">
            <section className={contentCardClass}>
              <div className={sectionTitleClass}>
                <h1>{getStudentTabDisplayLabel(activeTab)}</h1>
              </div>
              <div className="space-y-2 px-4 py-3 text-sm text-[#355970]">
                <p>{getStudentTabDescription(activeTab)}</p>
                {tabError ? (
                  <p className="rounded-[4px] border border-[#e8b2b2] bg-[#fff4f4] px-3 py-2 text-[#b03d3d]">
                    {tabError}
                  </p>
                ) : null}
                {tabMessage ? (
                  <p className="rounded-[4px] border border-[#b3dbc1] bg-[#f2fbf5] px-3 py-2 text-[#2f7b4f]">
                    {tabMessage}
                  </p>
                ) : null}
              </div>
            </section>

            {activeTab.key === "home" ? (
              <div className="space-y-4">
                <section className={contentCardClass}>
                  <div className={sectionTitleClass}>
                    <h2>Thông báo</h2>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#0a6aa1] hover:underline"
                    >
                      Xem tiep
                    </button>
                  </div>
                  <div className="grid gap-3 px-4 py-4 md:grid-cols-3">
                    {[
                      "Đăng ký môn học học kỳ moi",
                      "Lich cong bo ket qua hoc tap",
                      "Hướng dẫn cập nhật hồ sơ",
                    ].map((item, index) => (
                      <article
                        key={item}
                        className="rounded-[8px] border border-[#c0d8ea] bg-[#f4fbff] p-3"
                      >
                        <p className="text-base font-semibold text-[#1d5b82]">{item}</p>
                        <p className="mt-2 text-sm text-[#4b6a7f]">
                          Cập nhật {formatDateTime(new Date().toISOString())}
                        </p>
                        <p className="mt-2 text-sm text-[#4b6a7f]">
                          Danh muc #{index + 1}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className={contentCardClass}>
                  <div className={sectionTitleClass}>
                    <h2>Chuc nang sinh viên</h2>
                  </div>
                  <div className="overflow-x-auto px-4 py-3">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#cfdfec] text-[#305970]">
                          <th className="px-2 py-2">Tab</th>
                          <th className="px-2 py-2">Mo ta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentFeatureTabs
                          .filter((item) => item.key !== "home")
                          .map((item) => (
                            <tr
                              key={item.key}
                              className="border-b border-[#e0ebf4] text-[#3f6178]"
                            >
                              <td className="px-2 py-2 font-semibold text-[#1f567b]">
                                {item.label}
                              </td>
                              <td className="px-2 py-2">{item.description}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab.key === "profile" ? (
              <section className={contentCardClass}>
                <div className={sectionTitleClass}>
                  <h2>Ho so ca nhan sinh viên</h2>
                  <button
                    type="button"
                    onClick={() => {
                      void handleLoadProfile();
                    }}
                    disabled={isWorking}
                    className="rounded-[4px] bg-[#0d6ea6] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
                  >
                    Làm mới
                  </button>
                </div>
                <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-3">
                    <div className="rounded-[6px] border border-[#c8dceb] bg-[#f5fbff] p-3 text-sm text-[#335a72]">
                      {isWorking && !profile ? (
                        <p className="text-[#4c6e86]">Đang tải thông tin hồ sơ...</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-[4px] border border-[#d4e6f2] bg-white px-3 py-2">
                            <p className="text-xs text-[#6f8798]">Username</p>
                            <p className="font-semibold text-[#1c4f72]">
                              {profile?.username || "-"}
                            </p>
                          </div>
                          <div className="rounded-[4px] border border-[#d4e6f2] bg-white px-3 py-2">
                            <p className="text-xs text-[#6f8798]">Vai trò</p>
                            <p className="font-semibold text-[#1c4f72]">
                              {profile?.role || "-"}
                            </p>
                          </div>
                          <div className="rounded-[4px] border border-[#d4e6f2] bg-white px-3 py-2">
                            <p className="text-xs text-[#6f8798]">Student code</p>
                            <p className="font-semibold text-[#1c4f72]">
                              {profile?.studentCode || "-"}
                            </p>
                          </div>
                          <div className="rounded-[4px] border border-[#d4e6f2] bg-white px-3 py-2">
                            <p className="text-xs text-[#6f8798]">Major</p>
                            <p className="font-semibold text-[#1c4f72]">
                              {profile?.majorName || "-"}
                            </p>
                          </div>
                          <div className="rounded-[4px] border border-[#d4e6f2] bg-white px-3 py-2">
                            <p className="text-xs text-[#6f8798]">Email</p>
                            <p className="font-semibold text-[#1c4f72]">
                              {profile?.email || "-"}
                            </p>
                          </div>
                          <div className="rounded-[4px] border border-[#d4e6f2] bg-white px-3 py-2">
                            <p className="text-xs text-[#6f8798]">Phone</p>
                            <p className="font-semibold text-[#1c4f72]">
                              {profile?.phone || "-"}
                            </p>
                          </div>
                          <div className="rounded-[4px] border border-[#d4e6f2] bg-white px-3 py-2 sm:col-span-2">
                            <p className="text-xs text-[#6f8798]">Address</p>
                            <p className="font-semibold text-[#1c4f72]">
                              {profile?.address || "-"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <form className="space-y-2" onSubmit={handleSaveProfile}>
                    <input
                      className="h-10 w-full rounded-[4px] border border-[#c8d3dd] px-3 text-sm outline-none focus:border-[#6aa8cf]"
                      placeholder="Full name"
                      value={profileForm.fullName}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          fullName: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="h-10 w-full rounded-[4px] border border-[#c8d3dd] px-3 text-sm outline-none focus:border-[#6aa8cf]"
                      placeholder="Phone"
                      value={profileForm.phone}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          phone: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="h-10 w-full rounded-[4px] border border-[#c8d3dd] px-3 text-sm outline-none focus:border-[#6aa8cf]"
                      placeholder="Address"
                      value={profileForm.address}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          address: event.target.value,
                        }))
                      }
                    />
                    <input
                      type="date"
                      className="h-10 w-full rounded-[4px] border border-[#c8d3dd] px-3 text-sm outline-none focus:border-[#6aa8cf]"
                      value={profileForm.dateOfBirth}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          dateOfBirth: event.target.value,
                        }))
                      }
                    />
                    <button
                      type="submit"
                      disabled={isWorking}
                      className="rounded-[4px] bg-[#0d6ea6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
                    >
                      Cập nhật hồ sơ
                    </button>
                  </form>
                </div>
              </section>
            ) : null}

            {activeTab.key === "course-registration" ? (
              <section className="rounded-[10px] border border-[#6da8c9] bg-white shadow-[0_1px_2px_rgba(7,51,84,0.16)]">
                <div className="border-b border-[#c5dced] px-4 py-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3 text-[#185678]">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#8ebed9] bg-[#edf7fc] text-sm font-bold">
                        *
                      </span>
                      <div>
                        <h2 className="text-[24px] font-semibold tracking-[0.01em]">
                          {selectedSemesterLabel
                            ? `Đăng ký môn học - ${selectedSemesterLabel}`
                            : "Đăng ký môn học"}
                        </h2>
                        <p className="mt-1 text-sm text-[#5f7e93]">
                          Lọc theo môn học và học kỳ từ backend, sau đó chọn lớp học phần
                          để đăng ký.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void handleLoadRegistrationSections();
                        }}
                        disabled={isWorking}
                        className="h-10 rounded-[8px] border border-[#0d6ea6] bg-[#0d6ea6] px-4 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
                      >
                        Tải danh sách lớp
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCourseId("");
                          setSelectedSemesterId("");
                          setCourseKeyword("");
                          void handleLoadRegistrationSections("", "");
                        }}
                        disabled={isWorking}
                        className="h-10 rounded-[8px] border border-[#6da8c9] bg-white px-4 text-sm font-semibold text-[#0d6ea6] transition hover:bg-[#f4fbff] disabled:opacity-60"
                      >
                        Xóa bộ lọc
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 px-4 py-4">
                  {registrationNotice ? (
                    <div className="rounded-[8px] border border-[#efbcbc] bg-[#fff5f5] px-4 py-3 text-[#a94242]">
                      <p className="text-sm font-semibold">{registrationNotice.title}</p>
                      <p className="mt-1 text-sm">{registrationNotice.message}</p>
                      {registrationNotice.detail ? (
                        <p className="mt-1 text-xs text-[#b86a6a]">
                          Chi tiết: {registrationNotice.detail}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      className="h-11 rounded-[8px] border border-[#d4e2ec] bg-white px-4 text-sm text-[#214b66] outline-none focus:border-[#5fa7d0]"
                      placeholder="Tìm theo mã môn, tên môn, mã lớp, giảng viên..."
                      value={courseKeyword}
                      onChange={(event) => setCourseKeyword(event.target.value)}
                    />
                    <select
                      className="h-11 rounded-[8px] border border-[#d4e2ec] bg-white px-4 text-sm text-[#214b66] outline-none focus:border-[#5fa7d0]"
                      value={selectedCourseId}
                      onChange={(event) => handleCourseFilterChange(event.target.value)}
                    >
                      <option value="">Tất cả môn học</option>
                      {courseFilterOptions.map((option) => (
                        <option key={option.courseId} value={option.courseId}>
                          {option.courseCode
                            ? `${option.courseCode} - ${option.courseName}`
                            : option.courseName}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-11 rounded-[8px] border border-[#d4e2ec] bg-white px-4 text-sm text-[#214b66] outline-none focus:border-[#5fa7d0]"
                      value={selectedSemesterId}
                      onChange={(event) =>
                        handleSemesterFilterChange(event.target.value)
                      }
                    >
                      <option value="">Tất cả học kỳ</option>
                      {semesterFilterOptions.map((option) => (
                        <option key={option.semesterId} value={option.semesterId}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-[12px] border border-[#6da8c9]">
                    <div className="border-b border-[#c5dced] px-4 py-3">
                      <h3 className="text-[18px] font-semibold text-[#1a4f75]">
                        Danh sách môn học mở cho đăng ký
                      </h3>
                    </div>

                    <div className="max-h-[430px] overflow-auto">
                      <table className="min-w-[1080px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#2a7da9] text-[#2d5067]">
                            <th className="w-10 px-3 py-3">Chọn</th>
                            <th className="px-3 py-3">Mã MH</th>
                            <th className="px-3 py-3">Tên môn học</th>
                            <th className="px-3 py-3">Lớp</th>
                            <th className="px-3 py-3">Giảng viên</th>
                            <th className="px-3 py-3">Học kỳ</th>
                            <th className="px-3 py-3">Sĩ số tối đa</th>
                            <th className="px-3 py-3">Trạng thái</th>
                            <th className="px-3 py-3">Thời khóa biểu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSections.map((section) => {
                            const selected = String(section.id) === selectedSectionId;
                            const capacity = section.maxCapacity ?? "-";

                            return (
                              <tr
                                key={section.id}
                                className={`border-b border-[#d7e7f1] text-[#375d75] ${
                                  selected ? "bg-[#edf7fc]" : "bg-white"
                                }`}
                              >
                                <td className="px-3 py-3 align-top">
                                  <input
                                    type="radio"
                                    name="selected-course-section"
                                    checked={selected}
                                    onChange={() =>
                                      setSelectedSectionId(String(section.id))
                                    }
                                    className="mt-1 h-4 w-4 rounded border-[#a9c6d8] accent-[#0d6ea6]"
                                  />
                                </td>
                                <td className="px-3 py-3 align-top font-semibold text-[#1b547a]">
                                  {section.courseCode || "-"}
                                </td>
                                <td className="px-3 py-3 align-top">
                                  <p className="max-w-[260px] leading-5">
                                    {getCourseDisplayName(section)}
                                  </p>
                                </td>
                                <td className="px-3 py-3 align-top">
                                  {section.sectionCode || getSectionDisplayName(section)}
                                </td>
                                <td className="px-3 py-3 align-top">
                                  {section.lecturerName || "-"}
                                </td>
                                <td className="px-3 py-3 align-top">
                                  {getSemesterDisplayLabel(
                                    section.semesterNumber,
                                    section.academicYear,
                                  )}
                                </td>
                                <td className="px-3 py-3 align-top">{capacity}</td>
                                <td className="px-3 py-3 align-top">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRegistrationStatusClass(
                                      section.status,
                                    )}`}
                                  >
                                    {getRegistrationStatusLabel(section.status)}
                                  </span>
                                </td>
                                <td className="px-3 py-3 align-top text-[#58758a]">
                                  {getScheduleLabel(section)}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredSections.length === 0 ? (
                            <tr>
                              <td
                                colSpan={9}
                                className="px-3 py-8 text-center text-[#5d7b91]"
                              >
                                Chưa có học phần phù hợp với bộ lọc hiện tại.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-[12px] border border-[#6da8c9]">
                    <div className="border-b border-[#c5dced] px-4 py-3">
                      <h3 className="text-[18px] font-semibold text-[#1a4f75]">
                        Chi tiết lớp học phần đã chọn
                      </h3>
                    </div>

                    <div className="space-y-4 px-4 py-4">
                      {isSectionDetailLoading ? (
                        <p className="text-sm text-[#5d7b91]">
                          Đang tải thông tin chi tiết lớp học phần...
                        </p>
                      ) : null}

                      {selectedSectionDetails ? (
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-[8px] border border-[#d4e2ec] bg-[#f8fcff] px-3 py-2">
                            <p className="text-xs text-[#65839a]">Lớp học phần</p>
                            <p className="text-sm font-semibold text-[#1d4e71]">
                              {selectedSectionDetails.sectionCode ||
                                getSectionDisplayName(selectedSectionDetails)}
                            </p>
                          </div>
                          <div className="rounded-[8px] border border-[#d4e2ec] bg-[#f8fcff] px-3 py-2">
                            <p className="text-xs text-[#65839a]">Môn học</p>
                            <p className="text-sm font-semibold text-[#1d4e71]">
                              {getCourseDisplayName(selectedSectionDetails)}
                            </p>
                          </div>
                          <div className="rounded-[8px] border border-[#d4e2ec] bg-[#f8fcff] px-3 py-2">
                            <p className="text-xs text-[#65839a]">Giảng viên</p>
                            <p className="text-sm font-semibold text-[#1d4e71]">
                              {selectedSectionDetails.lecturerName || "-"}
                            </p>
                          </div>
                          <div className="rounded-[8px] border border-[#d4e2ec] bg-[#f8fcff] px-3 py-2">
                            <p className="text-xs text-[#65839a]">Học kỳ</p>
                            <p className="text-sm font-semibold text-[#1d4e71]">
                              {getSemesterDisplayLabel(
                                selectedSectionDetails.semesterNumber,
                                selectedSectionDetails.academicYear,
                              )}
                            </p>
                          </div>
                          <div className="rounded-[8px] border border-[#d4e2ec] bg-[#f8fcff] px-3 py-2">
                            <p className="text-xs text-[#65839a]">Sĩ số tối đa</p>
                            <p className="text-sm font-semibold text-[#1d4e71]">
                              {selectedSectionDetails.maxCapacity ?? "-"}
                            </p>
                          </div>
                          <div className="rounded-[8px] border border-[#d4e2ec] bg-[#f8fcff] px-3 py-2">
                            <p className="text-xs text-[#65839a]">Trạng thái</p>
                            <span
                              className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRegistrationStatusClass(
                                selectedSectionDetails.status,
                              )}`}
                            >
                              {getRegistrationStatusLabel(selectedSectionDetails.status)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-[#5d7b91]">
                          Chọn một lớp học phần để xem chi tiết.
                        </p>
                      )}

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-[#1a4f75]">
                          Lịch học định kỳ
                        </h4>
                        {sectionSchedules.length > 0 ? (
                          <div className="grid gap-2 md:grid-cols-2">
                            {sectionSchedules.map((schedule) => (
                              <div
                                key={schedule.id}
                                className="rounded-[8px] border border-[#d4e2ec] bg-white px-3 py-2 text-sm text-[#325b75]"
                              >
                                <p className="font-semibold text-[#1c4f72]">
                                  {schedule.dayOfWeekName ||
                                    (schedule.dayOfWeek
                                      ? `Thứ ${schedule.dayOfWeek}`
                                      : "Chưa rõ thứ")}
                                </p>
                                <p className="mt-1">
                                  {getPeriodRangeLabel(
                                    schedule.startPeriod,
                                    schedule.endPeriod,
                                  )}
                                </p>
                                <p className="mt-1 text-[#56758b]">
                                  Phòng: {schedule.classroomName || "-"}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[#5d7b91]">
                            Chưa có lịch học định kỳ cho lớp học phần này.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-[#1a4f75]">
                          Danh sách buổi học (tối đa 8 buổi gần nhất)
                        </h4>
                        {sectionSessions.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-[720px] text-left text-sm">
                              <thead>
                                <tr className="border-b border-[#d4e2ec] text-[#2d5067]">
                                  <th className="px-2 py-2">Ngày học</th>
                                  <th className="px-2 py-2">Tiết</th>
                                  <th className="px-2 py-2">Phòng</th>
                                  <th className="px-2 py-2">Trạng thái</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sectionSessions.slice(0, 8).map((sessionItem) => (
                                  <tr
                                    key={sessionItem.id}
                                    className="border-b border-[#e8f0f5] text-[#3b6078]"
                                  >
                                    <td className="px-2 py-2">
                                      {formatDate(sessionItem.sessionDate)}
                                    </td>
                                    <td className="px-2 py-2">
                                      {getPeriodRangeLabel(
                                        sessionItem.startPeriod,
                                        sessionItem.endPeriod,
                                      )}
                                    </td>
                                    <td className="px-2 py-2">
                                      {sessionItem.classroomName || "-"}
                                    </td>
                                    <td className="px-2 py-2">
                                      {sessionItem.status || "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-[#5d7b91]">
                            Chưa có dữ liệu buổi học được sinh ra từ lịch định kỳ.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[12px] border border-[#6da8c9]">
                    <div className="border-b border-[#c5dced] px-4 py-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <h3 className="text-[18px] font-semibold text-[#1a4f75]">
                          Danh sách môn học đã đăng ký: {registeredSections.length} môn
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void handleRegisterSection();
                            }}
                            disabled={isWorking || !selectedSectionId}
                            className="h-10 rounded-[8px] border border-[#0d6ea6] bg-[#0d6ea6] px-4 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
                          >
                            Đăng ký học phần đã chọn
                          </button>
                          <button
                            type="button"
                            className="h-10 rounded-[8px] border border-[#6da8c9] bg-white px-4 text-sm font-semibold text-[#0d6ea6] transition hover:bg-[#f4fbff]"
                          >
                            Xuất phiếu đăng ký
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-[980px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#2a7da9] text-[#2d5067]">
                            <th className="px-3 py-3">Xóa</th>
                            <th className="px-3 py-3">Mã MH</th>
                            <th className="px-3 py-3">Tên môn học</th>
                            <th className="px-3 py-3">Nhóm tổ</th>
                            <th className="px-3 py-3">Số TC</th>
                            <th className="px-3 py-3">Lớp</th>
                            <th className="px-3 py-3">Ngày đăng ký</th>
                            <th className="px-3 py-3">Trạng thái</th>
                            <th className="px-3 py-3">Thời khóa biểu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registeredSections.map((item) => (
                            <tr
                              key={item.registrationId}
                              className="border-b border-[#d7e7f1] text-[#375d75]"
                            >
                              <td className="px-3 py-3 align-top text-[#d16d6d]">x</td>
                              <td className="px-3 py-3 align-top font-semibold text-[#1b547a]">
                                {item.section.courseCode || "-"}
                              </td>
                              <td className="px-3 py-3 align-top">
                                {getCourseDisplayName(item.section)}
                              </td>
                              <td className="px-3 py-3 align-top">
                                {getGroupLabel(item.section)}
                              </td>
                              <td className="px-3 py-3 align-top">
                                {getCreditsLabel(item.section)}
                              </td>
                              <td className="px-3 py-3 align-top">
                                {item.section.sectionCode || getSectionDisplayName(item.section)}
                              </td>
                              <td className="px-3 py-3 align-top">
                                {formatDateTime(item.registrationTime)}
                              </td>
                              <td className="px-3 py-3 align-top">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRegistrationStatusClass(
                                    item.status,
                                  )}`}
                                >
                                  {getRegistrationStatusLabel(item.status)}
                                </span>
                              </td>
                              <td className="px-3 py-3 align-top text-[#58758a]">
                                {getScheduleLabel(item.section)}
                              </td>
                            </tr>
                          ))}
                          {registeredSections.length === 0 ? (
                            <tr>
                              <td
                                colSpan={9}
                                className="px-3 py-8 text-center text-[#5d7b91]"
                              >
                                Chưa có học phần nào được đăng ký trong phiên hiện tại.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab.key === "schedule" ? (
              <section className="rounded-[10px] border border-[#6da8c9] bg-white shadow-[0_1px_2px_rgba(7,51,84,0.16)]">
                <div className="border-b border-[#c5dced] px-4 py-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3 text-[#185678]">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#8ebed9] bg-[#edf7fc] text-sm font-bold">
                        ⚙
                      </span>
                      <div>
                        <h2 className="text-[22px] font-semibold tracking-[0.01em]">
                          THỜI KHÓA BIỂU DẠNG TUẦN
                        </h2>
                        <p className="mt-1 text-sm text-[#5f7e93]">
                          Dữ liệu lấy theo học phần của chính sinh viên đang đăng nhập.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        void handleLoadStudentWeeklySchedule();
                      }}
                      disabled={isScheduleLoading}
                      className="h-10 rounded-[8px] border border-[#0d6ea6] bg-[#0d6ea6] px-4 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
                    >
                      {isScheduleLoading ? "Đang tải..." : "Làm mới thời khóa biểu"}
                    </button>
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <select
                      className="h-11 rounded-[8px] border border-[#d4e2ec] bg-white px-4 text-sm text-[#214b66] outline-none focus:border-[#5fa7d0]"
                      value={selectedScheduleSemesterId}
                      onChange={(event) =>
                        setSelectedScheduleSemesterId(event.target.value)
                      }
                    >
                      {scheduleSemesterOptions.length === 0 ? (
                        <option value="">Chưa có dữ liệu học kỳ</option>
                      ) : null}
                      {scheduleSemesterOptions.map((option) => (
                        <option key={option.semesterId} value={option.semesterId}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <select
                      className="h-11 rounded-[8px] border border-[#d4e2ec] bg-white px-4 text-sm text-[#214b66] outline-none focus:border-[#5fa7d0]"
                      value={scheduleViewType}
                      onChange={(event) => setScheduleViewType(event.target.value)}
                    >
                      <option value="personal">Thời khóa biểu cá nhân</option>
                    </select>

                    <select
                      className="h-11 rounded-[8px] border border-[#d4e2ec] bg-white px-4 text-sm text-[#214b66] outline-none focus:border-[#5fa7d0]"
                      value={selectedScheduleWeek.startDate}
                      onChange={(event) => setSelectedScheduleWeekKey(event.target.value)}
                    >
                      {scheduleWeekSelectOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="h-11 rounded-[8px] border border-[#6da8c9] bg-white px-4 text-sm font-semibold text-[#0d6ea6] transition hover:bg-[#f4fbff]"
                    >
                      In
                    </button>
                  </div>

                  <div className="rounded-[8px] border border-[#d4e2ec] bg-[#f6fbff] px-3 py-2 text-sm text-[#355970]">
                    <p>
                      {selectedScheduleWeek
                        ? `${selectedScheduleWeek.label} - ${selectedScheduleSemesterLabel}`
                        : `Chưa có tuần học để hiển thị - ${selectedScheduleSemesterLabel}`}
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-[8px] border border-[#88aed4]">
                    <table className="min-w-[1180px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-[#f3f7fb] text-[#2f4f67]">
                          <th className="w-[70px] border border-[#cfdbe7] px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleShiftScheduleWeek(-1)}
                              className="rounded-[4px] px-2 py-1 text-sm font-semibold text-[#1f4f72] transition hover:bg-[#e8f0f8]"
                            >
                              ←
                            </button>
                          </th>
                          {scheduleDayLabels.map((dayLabel, dayIndex) => (
                            <th
                              key={`schedule-header-${dayLabel}`}
                              className="w-[155px] border border-[#cfdbe7] px-2 py-2 text-center"
                            >
                              <p className="font-semibold text-[#1f4562]">{dayLabel}</p>
                              <p className="mt-0.5 text-[#5a768b]">
                                {scheduleWeekDates[dayIndex]
                                  ? `(${formatDateShort(scheduleWeekDates[dayIndex])})`
                                  : ""}
                              </p>
                            </th>
                          ))}
                          <th className="w-[72px] border border-[#cfdbe7] px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleShiftScheduleWeek(1)}
                              className="rounded-[4px] px-2 py-1 text-sm font-semibold text-[#1f4f72] transition hover:bg-[#e8f0f8]"
                            >
                              →
                            </button>
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {Array.from({ length: 14 }, (_, index) => index + 1).map((period) => (
                          <tr key={`period-${period}`} className="h-[58px]">
                            <th className="border border-[#d4e0ea] bg-[#2f5f92] px-2 py-2 text-left text-sm font-semibold text-white">
                              Tiết {period}
                            </th>

                            {scheduleDayLabels.map((_, dayIndex) => {
                              const dayBlocks = scheduleBlocksByDay[dayIndex] || [];
                              const startingBlocks = dayBlocks.filter(
                                (block) => block.startPeriod === period,
                              );
                              const isCoveredByPreviousBlock = dayBlocks.some(
                                (block) =>
                                  block.startPeriod < period && block.endPeriod >= period,
                              );

                              if (isCoveredByPreviousBlock) {
                                return null;
                              }

                              if (startingBlocks.length === 0) {
                                return (
                                  <td
                                    key={`empty-${period}-${dayIndex}`}
                                    className="border border-[#d4e0ea] bg-white/70"
                                  />
                                );
                              }

                              const maxEndPeriod = Math.max(
                                ...startingBlocks.map((block) => block.endPeriod),
                              );
                              const rowSpan = Math.max(1, maxEndPeriod - period + 1);

                              return (
                                <td
                                  key={`event-${period}-${dayIndex}`}
                                  rowSpan={rowSpan}
                                  className="border border-[#d4e0ea] align-top p-1"
                                >
                                  <div className="flex h-full flex-col gap-1">
                                    {startingBlocks.map((block) => (
                                      <article
                                        key={block.key}
                                        className={`h-full rounded-[4px] border px-2 py-1 leading-4 ${getScheduleCardClassName(
                                          block.status,
                                          block.courseCode,
                                        )}`}
                                      >
                                        <p className="font-semibold">
                                          {block.courseName}
                                          {block.courseCode ? ` (${block.courseCode})` : ""}
                                        </p>
                                        <p className="mt-1">
                                          Nhóm: {getGroupLabel({ sectionCode: block.sectionCode, id: block.sectionId })}
                                        </p>
                                        <p>Phòng: {block.classroomName || "-"}</p>
                                        <p>GV: {block.lecturerName || "-"}</p>
                                        <p>{getPeriodClockRange(block.startPeriod, block.endPeriod)}</p>
                                      </article>
                                    ))}
                                  </div>
                                </td>
                              );
                            })}

                            <td className="border border-[#d4e0ea] bg-[#2f5f92] px-2 py-2 text-center text-sm font-semibold text-white">
                              {periodStartTimeMap[period] || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot>
                        <tr className="bg-[#f3f7fb] text-[#2f4f67]">
                          <th className="border border-[#cfdbe7] px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleShiftScheduleWeek(-1)}
                              className="rounded-[4px] px-2 py-1 text-sm font-semibold text-[#1f4f72] transition hover:bg-[#e8f0f8]"
                            >
                              ←
                            </button>
                          </th>
                          {scheduleDayLabels.map((dayLabel, dayIndex) => (
                            <th
                              key={`schedule-footer-${dayLabel}`}
                              className="border border-[#cfdbe7] px-2 py-2 text-center font-semibold text-[#1f4562]"
                            >
                              {dayLabel}
                              {scheduleWeekDates[dayIndex]
                                ? ` (${formatDateShort(scheduleWeekDates[dayIndex])})`
                                : ""}
                            </th>
                          ))}
                          <th className="border border-[#cfdbe7] px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleShiftScheduleWeek(1)}
                              className="rounded-[4px] px-2 py-1 text-sm font-semibold text-[#1f4f72] transition hover:bg-[#e8f0f8]"
                            >
                              →
                            </button>
                          </th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {isScheduleLoading ? (
                    <p className="text-sm text-[#5d7b91]">
                      Đang tổng hợp lịch học cá nhân từ học phần đã đăng ký...
                    </p>
                  ) : null}

                  {!isScheduleLoading && myScheduleBlocks.length === 0 ? (
                    <p className="rounded-[6px] border border-[#d8e4ee] bg-[#f8fbff] px-3 py-2 text-sm text-[#5d7b91]">
                      Chưa có dữ liệu lịch học cá nhân trong kỳ đã chọn.
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            {activeTab.key === "grades" ? (
              <section className={contentCardClass}>
                <div className={sectionTitleClass}>
                  <h2>Bảng điểm sinh viên</h2>
                  <div className="flex items-center gap-2">
                    <input
                      className="h-9 w-[180px] rounded-[4px] border border-[#c8d3dd] px-3 text-sm outline-none focus:border-[#6aa8cf]"
                      placeholder="Mã sinh viên"
                      value={studentIdInput}
                      onChange={(event) => setStudentIdInput(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void handleLoadGrades();
                      }}
                      disabled={isWorking}
                      className="h-9 rounded-[4px] bg-[#0d6ea6] px-3 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
                    >
                      Tải bảng điểm
                    </button>
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_190px_220px_240px_auto]">
                    <input
                      className="h-10 rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#244d67] outline-none focus:border-[#6aa8cf]"
                      placeholder="Tìm theo môn học, mã lớp, điểm chữ, học kỳ..."
                      value={gradeKeyword}
                      onChange={(event) => setGradeKeyword(event.target.value)}
                    />
                    <select
                      className="h-10 rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#244d67] outline-none focus:border-[#6aa8cf]"
                      value={gradeStatusFilter}
                      onChange={(event) => setGradeStatusFilter(event.target.value)}
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="PUBLISHED">Đã công bố</option>
                      <option value="LOCKED">Đã chốt</option>
                      <option value="DRAFT">Nháp</option>
                    </select>
                    <select
                      className="h-10 rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#244d67] outline-none focus:border-[#6aa8cf]"
                      value={gradeSemesterFilter}
                      onChange={(event) =>
                        setGradeSemesterFilter(event.target.value)
                      }
                    >
                      <option value="">Tất cả học kỳ</option>
                      {gradeSemesterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-10 rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#244d67] outline-none focus:border-[#6aa8cf]"
                      value={gradeCourseFilter}
                      onChange={(event) => setGradeCourseFilter(event.target.value)}
                    >
                      <option value="">Tất cả môn học</option>
                      {gradeCourseOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setGradeKeyword("");
                        setGradeStatusFilter("");
                        setGradeSemesterFilter("");
                        setGradeCourseFilter("");
                      }}
                      className="h-10 rounded-[6px] border border-[#6da8c9] bg-white px-3 text-sm font-semibold text-[#0d6ea6] transition hover:bg-[#f4fbff]"
                    >
                      Xóa lọc
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[8px] border border-[#d5e4ef] bg-[#f6fbff] px-3 py-2">
                      <p className="text-xs text-[#648095]">Tổng số môn</p>
                      <p className="mt-1 text-xl font-semibold text-[#1e4d6f]">
                        {gradeSummary.total}
                      </p>
                    </div>
                    <div className="rounded-[8px] border border-[#d5e4ef] bg-[#f6fbff] px-3 py-2">
                      <p className="text-xs text-[#648095]">Điểm trung bình</p>
                      <p className="mt-1 text-xl font-semibold text-[#1e4d6f]">
                        {gradeSummary.averageScore !== null
                          ? formatScore(gradeSummary.averageScore)
                          : "-"}
                      </p>
                    </div>
                    <div className="rounded-[8px] border border-[#d5e4ef] bg-[#f6fbff] px-3 py-2">
                      <p className="text-xs text-[#648095]">Đã công bố</p>
                      <p className="mt-1 text-xl font-semibold text-[#1e4d6f]">
                        {gradeSummary.publishedCount}
                      </p>
                    </div>
                    <div className="rounded-[8px] border border-[#d5e4ef] bg-[#f6fbff] px-3 py-2">
                      <p className="text-xs text-[#648095]">Đã chốt</p>
                      <p className="mt-1 text-xl font-semibold text-[#1e4d6f]">
                        {gradeSummary.lockedCount}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                    <div className="overflow-x-auto rounded-[8px] border border-[#d5e4ef]">
                      <table className="min-w-[860px] text-left text-sm">
                        <thead className="bg-[#f7fbff]">
                          <tr className="border-b border-[#d8e5ef] text-[#305970]">
                            <th className="px-3 py-2">Môn học</th>
                            <th className="px-3 py-2">Điểm</th>
                            <th className="px-3 py-2">Điểm chữ</th>
                            <th className="px-3 py-2">Học kỳ</th>
                            <th className="px-3 py-2">Trạng thái</th>
                            <th className="px-3 py-2">Cập nhật</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredGradeReports.map((item) => {
                            const selected = selectedGradeReport?.id === item.id;
                            const sectionInfo = item.sectionId
                              ? gradeSectionsById[item.sectionId]
                              : undefined;

                            return (
                              <tr
                                key={item.id}
                                onClick={() => setSelectedGradeReportId(item.id)}
                                className={`cursor-pointer border-b border-[#e0ebf4] text-[#3f6178] transition ${
                                  selected ? "bg-[#eaf4fb]" : "hover:bg-[#f5fbff]"
                                }`}
                              >
                                <td className="px-3 py-2">
                                  <p className="font-semibold text-[#1f567b]">
                                    {item.courseName || "-"}
                                  </p>
                                  <p className="text-xs text-[#5f7e93]">
                                    {sectionInfo?.sectionCode || "Chưa có mã lớp"}
                                  </p>
                                </td>
                                <td className="px-3 py-2">{formatScore(item.finalScore)}</td>
                                <td className="px-3 py-2">{item.letterGrade || "-"}</td>
                                <td className="px-3 py-2">
                                  {sectionInfo
                                    ? getSemesterDisplayLabel(
                                        sectionInfo.semesterNumber,
                                        sectionInfo.academicYear,
                                      )
                                    : "-"}
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeStatusClass(
                                      item.status,
                                    )}`}
                                  >
                                    {getGradeStatusLabel(item.status)}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  {formatDateTime(item.createdAt)}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredGradeReports.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-3 py-8 text-center text-[#577086]"
                              >
                                Chưa có dữ liệu điểm phù hợp với bộ lọc.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-3 rounded-[8px] border border-[#d5e4ef] bg-[#f9fcff] p-3">
                      <h3 className="text-base font-semibold text-[#1f567b]">
                        Chi tiết môn học
                      </h3>

                      {selectedGradeReport ? (
                        <>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-[6px] border border-[#dbe7f1] bg-white px-3 py-2">
                              <p className="text-xs text-[#69849a]">Môn học</p>
                              <p className="text-sm font-semibold text-[#1f567b]">
                                {selectedGradeReport.courseName || "-"}
                              </p>
                            </div>
                            <div className="rounded-[6px] border border-[#dbe7f1] bg-white px-3 py-2">
                              <p className="text-xs text-[#69849a]">Điểm tổng</p>
                              <p className="text-sm font-semibold text-[#1f567b]">
                                {formatScore(selectedGradeReport.finalScore)}
                              </p>
                            </div>
                            <div className="rounded-[6px] border border-[#dbe7f1] bg-white px-3 py-2">
                              <p className="text-xs text-[#69849a]">Điểm chữ</p>
                              <p className="text-sm font-semibold text-[#1f567b]">
                                {selectedGradeReport.letterGrade || "-"}
                              </p>
                            </div>
                            <div className="rounded-[6px] border border-[#dbe7f1] bg-white px-3 py-2">
                              <p className="text-xs text-[#69849a]">Trạng thái</p>
                              <span
                                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeStatusClass(
                                  selectedGradeReport.status,
                                )}`}
                              >
                                {getGradeStatusLabel(selectedGradeReport.status)}
                              </span>
                            </div>
                            <div className="rounded-[6px] border border-[#dbe7f1] bg-white px-3 py-2 sm:col-span-2">
                              <p className="text-xs text-[#69849a]">Lớp học phần</p>
                              <p className="text-sm font-semibold text-[#1f567b]">
                                {selectedGradeSection?.sectionCode ||
                                  selectedGradeSection?.displayName ||
                                  "-"}
                              </p>
                              <p className="mt-1 text-xs text-[#5f7e93]">
                                {selectedGradeSection
                                  ? `${getSemesterDisplayLabel(
                                      selectedGradeSection.semesterNumber,
                                      selectedGradeSection.academicYear,
                                    )} | GV ${selectedGradeSection.lecturerName || "-"}`
                                  : isGradeContextLoading
                                    ? "Đang tải thông tin lớp học phần..."
                                    : "Chưa có thông tin lớp học phần."}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-[6px] border border-[#dbe7f1] bg-white px-3 py-2">
                            <p className="text-sm font-semibold text-[#1f567b]">
                              Điểm thành phần
                            </p>
                            {isLoadingSelectedGradeComponents ? (
                              <p className="mt-2 text-sm text-[#5f7e93]">
                                Đang tải cấu hình trọng số môn học...
                              </p>
                            ) : selectedGradeComponentRows.length > 0 ? (
                              <div className="mt-2 overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                  <thead>
                                    <tr className="border-b border-[#e1ecf4] text-[#44657d]">
                                      <th className="px-2 py-1.5">Thành phần</th>
                                      <th className="px-2 py-1.5">Tỷ trọng</th>
                                      <th className="px-2 py-1.5">Điểm</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedGradeComponentRows.map((detail, index) => (
                                      <tr
                                        key={
                                          detail.id ||
                                          detail.componentId ||
                                          `grade-detail-${index}`
                                        }
                                        className="border-b border-[#edf3f8] text-[#3f6178]"
                                      >
                                        <td className="px-2 py-1.5">
                                          {detail.componentName || "-"}
                                        </td>
                                        <td className="px-2 py-1.5">
                                          {typeof detail.weightPercentage === "number"
                                            ? `${detail.weightPercentage}%`
                                            : "-"}
                                        </td>
                                        <td className="px-2 py-1.5">
                                          {typeof detail.score === "number"
                                            ? formatScore(detail.score)
                                            : "Chưa có"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : selectedGradeCourseId ? (
                              <p className="mt-2 text-sm text-[#5f7e93]">
                                Chưa có cấu hình điểm thành phần cho môn học này.
                              </p>
                            ) : (
                              <p className="mt-2 text-sm text-[#5f7e93]">
                                Chưa xác định được môn học để tải cấu trúc điểm.
                              </p>
                            )}

                            {selectedGradeComponentRows.length > 0 ? (
                              <div className="mt-2 grid gap-2 text-xs text-[#4e6e84] sm:grid-cols-3">
                                <div className="rounded-[6px] border border-[#e1ecf4] bg-[#f8fbff] px-2 py-1.5">
                                  Tổng tỷ trọng:{" "}
                                  <span className="font-semibold">
                                    {formatScore(selectedGradeComponentStats.totalWeight)}%
                                  </span>
                                </div>
                                <div className="rounded-[6px] border border-[#e1ecf4] bg-[#f8fbff] px-2 py-1.5">
                                  Đã có điểm:{" "}
                                  <span className="font-semibold">
                                    {formatScore(selectedGradeComponentStats.gradedWeight)}%
                                  </span>
                                </div>
                                <div className="rounded-[6px] border border-[#e1ecf4] bg-[#f8fbff] px-2 py-1.5">
                                  Điểm quy đổi:{" "}
                                  <span className="font-semibold">
                                    {formatScore(
                                      selectedGradeComponentStats.weightedScore,
                                    )}
                                  </span>
                                </div>
                              </div>
                            ) : null}

                            {hasSelectedGradeWeight && !isSelectedGradeWeightBalanced ? (
                              <p className="mt-2 rounded-[6px] border border-[#e4c089] bg-[#fff8ef] px-2 py-1.5 text-xs text-[#8b5b0c]">
                                Tổng tỷ trọng hiện là{" "}
                                {formatScore(selectedGradeComponentStats.totalWeight)}%.
                                Cấu hình chuẩn thường bằng 100%, vui lòng kiểm tra lại với
                                cố vấn học tập nếu thấy bất thường.
                              </p>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-[#5f7e93]">
                          Chọn một môn ở bảng bên trái để xem chi tiết điểm.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab.key === "attendance" ? (
              <section className={contentCardClass}>
                <div className={sectionTitleClass}>
                  <h2>Chuyên cần sinh viên</h2>
                  <div className="flex items-center gap-2">
                    <input
                      className="h-9 w-[180px] rounded-[4px] border border-[#c8d3dd] px-3 text-sm outline-none focus:border-[#6aa8cf]"
                      placeholder="Mã sinh viên"
                      value={studentIdInput}
                      onChange={(event) => setStudentIdInput(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void handleLoadAttendance();
                      }}
                      disabled={isWorking}
                      className="h-9 rounded-[4px] bg-[#0d6ea6] px-3 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
                    >
                      Tải chuyên cần
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto px-4 py-4">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#cfdfec] text-[#305970]">
                        <th className="px-2 py-2">Ngay hoc</th>
                        <th className="px-2 py-2">Session ID</th>
                        <th className="px-2 py-2">Trạng thái</th>
                        <th className="px-2 py-2">Ghi chu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-[#e0ebf4] text-[#3f6178]"
                        >
                          <td className="px-2 py-2">{formatDate(item.sessionDate)}</td>
                          <td className="px-2 py-2">{item.sessionId || "-"}</td>
                          <td className="px-2 py-2">{item.status || "-"}</td>
                          <td className="px-2 py-2">{item.note || "-"}</td>
                        </tr>
                      ))}
                      {attendanceItems.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-4 text-center text-[#577086]">
                            Chưa có dữ liệu chuyên cần.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {activeTab.key === "password" ? (
              <section className={contentCardClass}>
                <div className={sectionTitleClass}>
                  <h2>Đổi mật khẩu</h2>
                </div>
                <form
                  className="grid max-w-[520px] gap-2 px-4 py-4"
                  onSubmit={handleChangePassword}
                >
                  <input
                    type="password"
                    className="h-10 rounded-[4px] border border-[#c8d3dd] px-3 text-sm outline-none focus:border-[#6aa8cf]"
                    placeholder="Mật khẩu hiện tại"
                    value={passwordForm.oldPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        oldPassword: event.target.value,
                      }))
                    }
                  />
                  <input
                    type="password"
                    className="h-10 rounded-[4px] border border-[#c8d3dd] px-3 text-sm outline-none focus:border-[#6aa8cf]"
                    placeholder="Mật khẩu mới"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: event.target.value,
                      }))
                    }
                  />
                  <input
                    type="password"
                    className="h-10 rounded-[4px] border border-[#c8d3dd] px-3 text-sm outline-none focus:border-[#6aa8cf]"
                    placeholder="Xác nhận mật khẩu mới"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="submit"
                    disabled={isWorking}
                    className="mt-1 h-10 rounded-[4px] bg-[#0d6ea6] px-4 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
                  >
                    Lưu mật khẩu mới
                  </button>
                </form>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
