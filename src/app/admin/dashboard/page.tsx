"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AccountManagementPanel } from "@/components/admin/account-management-panel";
import { DynamicCrudPanel } from "@/components/admin/dynamic-crud-panel";
import { RolePermissionPanel } from "@/components/admin/role-permission-panel";
import { useAuth } from "@/context/auth-context";
import {
  getAdmissionApplications,
  getAdmissionBenchmarks,
  getAdmissionBlocks,
  getAdmissionPeriods,
  getSectionGradeReports,
  getStudentAttendances,
} from "@/lib/admin/service";
import { adminFeatureTabs, adminTopHeaderTabs } from "@/lib/admin/tabs";
import type {
  AdminFeatureTab,
  AdminTabKey,
  ApplicationListItem,
  BenchmarkListItem,
  BlockListItem,
  DynamicRow,
  PagedRows,
  PeriodListItem,
} from "@/lib/admin/types";

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Thao tac that bai. Vui long thu lai.";
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

const toDisplayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.map((item) => toDisplayValue(item)).join(", ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  }

  return String(value);
};

const toColumnLabel = (field: string): string => {
  const spaced = field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();

  return spaced ? `${spaced[0].toUpperCase()}${spaced.slice(1)}` : field;
};

const buildColumns = (
  rows: DynamicRow[],
  priorityColumns: string[],
): string[] => {
  const keys = new Set<string>();

  for (const row of rows.slice(0, 50)) {
    for (const key of Object.keys(row)) {
      keys.add(key);
    }
  }

  const priority = priorityColumns.filter((key) => keys.has(key));
  const others = [...keys].filter((key) => !priorityColumns.includes(key)).sort();

  return [...priority, ...others];
};

const contentCardClass =
  "rounded-[8px] border border-[#8ab3d1] bg-white shadow-[0_1px_2px_rgba(7,51,84,0.16)]";

const sectionTitleClass =
  "flex items-center justify-between border-b border-[#c5dced] px-4 py-2 text-[18px] font-semibold text-[#1a4f75]";

type DynamicCrudTabConfig = {
  title: string;
  basePath: string;
  listQuery?: Record<string, string | number | undefined>;
  priorityColumns: string[];
  createTemplate: Record<string, unknown>;
  updateTemplate: Record<string, unknown>;
  statusPatch?: {
    fieldName: string;
    pathSuffix: string;
    options: string[];
  };
};

const dynamicCrudTabConfigs: Partial<Record<AdminTabKey, DynamicCrudTabConfig>> = {
  faculties: {
    title: "Danh sach khoa",
    basePath: "/api/v1/faculties",
    priorityColumns: ["id", "facultyCode", "facultyName", "status"],
    createTemplate: {
      facultyCode: "",
      facultyName: "",
    },
    updateTemplate: {
      facultyCode: "",
      facultyName: "",
    },
  },
  majors: {
    title: "Danh sach nganh",
    basePath: "/api/v1/majors",
    priorityColumns: ["id", "majorCode", "majorName", "facultyId", "status"],
    createTemplate: {
      facultyId: 1,
      majorCode: "",
      majorName: "",
    },
    updateTemplate: {
      facultyId: 1,
      majorCode: "",
      majorName: "",
    },
  },
  specializations: {
    title: "Danh sach chuyen nganh",
    basePath: "/api/v1/specializations",
    priorityColumns: ["id", "specializationName", "majorId", "status"],
    createTemplate: {
      majorId: 1,
      specializationName: "",
    },
    updateTemplate: {
      majorId: 1,
      specializationName: "",
    },
  },
  cohorts: {
    title: "Danh sach nien khoa",
    basePath: "/api/v1/cohorts",
    priorityColumns: ["id", "cohortName", "startYear", "endYear", "status"],
    createTemplate: {
      cohortName: "",
      startYear: 2026,
      endYear: 2030,
      status: "ACTIVE",
    },
    updateTemplate: {
      cohortName: "",
      startYear: 2026,
      endYear: 2030,
      status: "ACTIVE",
    },
  },
  courses: {
    title: "Danh sach mon hoc",
    basePath: "/api/v1/courses",
    priorityColumns: [
      "id",
      "courseCode",
      "courseName",
      "credits",
      "facultyId",
      "status",
    ],
    createTemplate: {
      courseCode: "",
      courseName: "",
      credits: 3,
      facultyId: 1,
      status: "ACTIVE",
    },
    updateTemplate: {
      courseCode: "",
      courseName: "",
      credits: 3,
      facultyId: 1,
      status: "ACTIVE",
    },
  },
  classrooms: {
    title: "Danh sach phong hoc",
    basePath: "/api/v1/classrooms",
    priorityColumns: ["id", "roomName", "capacity", "roomType"],
    createTemplate: {
      roomName: "",
      capacity: 40,
      roomType: "THEORY",
    },
    updateTemplate: {
      roomName: "",
      capacity: 40,
      roomType: "THEORY",
    },
  },
  "administrative-classes": {
    title: "Danh sach lop chu nhiem",
    basePath: "/api/v1/administrative-classes",
    priorityColumns: [
      "id",
      "className",
      "cohortId",
      "majorId",
      "headLecturerId",
      "maxCapacity",
    ],
    createTemplate: {
      className: "",
      headLecturerId: 1,
      cohortId: 1,
      majorId: 1,
      maxCapacity: 60,
    },
    updateTemplate: {
      className: "",
      headLecturerId: 1,
      cohortId: 1,
      majorId: 1,
      maxCapacity: 60,
    },
  },
  students: {
    title: "Quan ly sinh vien",
    basePath: "/api/v1/students",
    listQuery: {
      page: 0,
      size: 20,
    },
    priorityColumns: [
      "id",
      "studentCode",
      "fullName",
      "email",
      "phone",
      "status",
      "classId",
      "majorId",
    ],
    createTemplate: {
      classId: 1,
      majorId: 1,
      specializationId: 1,
      guardianId: 1,
      studentCode: "",
      fullName: "",
      email: "",
      nationalId: "",
      dateOfBirth: "2004-01-01",
      gender: true,
      phone: "",
      address: "",
      ethnicity: "",
      religion: "",
      placeOfBirth: "",
      nationality: "VN",
    },
    updateTemplate: {
      classId: 1,
      majorId: 1,
      specializationId: 1,
      guardianId: 1,
      fullName: "",
      email: "",
      nationalId: "",
      dateOfBirth: "2004-01-01",
      gender: true,
      phone: "",
      address: "",
      ethnicity: "",
      religion: "",
      placeOfBirth: "",
      nationality: "VN",
    },
    statusPatch: {
      fieldName: "status",
      pathSuffix: "/status",
      options: ["ACTIVE", "SUSPENDED", "GRADUATED", "DROPPED_OUT"],
    },
  },
  lecturers: {
    title: "Quan ly giang vien",
    basePath: "/api/v1/lecturers",
    listQuery: {
      page: 0,
      size: 20,
    },
    priorityColumns: ["id", "fullName", "email", "academicDegree", "phone"],
    createTemplate: {
      fullName: "",
      email: "",
      academicDegree: "",
      phone: "",
    },
    updateTemplate: {
      fullName: "",
      email: "",
      academicDegree: "",
      phone: "",
    },
  },
  guardians: {
    title: "Quan ly phu huynh",
    basePath: "/api/v1/guardians",
    listQuery: {
      page: 0,
      size: 20,
    },
    priorityColumns: ["id", "fullName", "phone", "relationship"],
    createTemplate: {
      fullName: "",
      phone: "",
      relationship: "",
    },
    updateTemplate: {
      fullName: "",
      phone: "",
      relationship: "",
    },
  },
  "course-sections": {
    title: "Quan ly lop hoc phan",
    basePath: "/api/v1/course-sections",
    priorityColumns: [
      "id",
      "sectionCode",
      "displayName",
      "courseId",
      "lecturerId",
      "semesterId",
      "maxCapacity",
      "status",
    ],
    createTemplate: {
      sectionCode: "",
      displayName: "",
      courseId: 1,
      lecturerId: 1,
      semesterId: 1,
      maxCapacity: 60,
      status: "DRAFT",
    },
    updateTemplate: {
      sectionCode: "",
      displayName: "",
      courseId: 1,
      lecturerId: 1,
      semesterId: 1,
      maxCapacity: 60,
      status: "DRAFT",
    },
    statusPatch: {
      fieldName: "status",
      pathSuffix: "/status",
      options: ["DRAFT", "OPEN", "ONGOING", "FINISHED", "CANCELLED"],
    },
  },
};

export default function AdminDashboardPage() {
  const { session, logout } = useAuth();

  const [activeTabKey, setActiveTabKey] = useState<AdminTabKey>("home");
  const [tabError, setTabError] = useState("");
  const [tabMessage, setTabMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const [admissionPeriods, setAdmissionPeriods] = useState<PagedRows<PeriodListItem>>({
    rows: [],
  });
  const [admissionBlocks, setAdmissionBlocks] = useState<BlockListItem[]>([]);
  const [admissionBenchmarks, setAdmissionBenchmarks] = useState<
    PagedRows<BenchmarkListItem>
  >({ rows: [] });
  const [admissionApplications, setAdmissionApplications] = useState<
    PagedRows<ApplicationListItem>
  >({ rows: [] });
  const [gradeRows, setGradeRows] = useState<DynamicRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<DynamicRow[]>([]);
  const [gradeSectionIdInput, setGradeSectionIdInput] = useState("");
  const [attendanceStudentIdInput, setAttendanceStudentIdInput] = useState("");

  const activeTab = useMemo(
    () =>
      adminFeatureTabs.find((item) => item.key === activeTabKey) ||
      adminFeatureTabs[0],
    [activeTabKey],
  );

  const gradeColumns = useMemo(
    () =>
      buildColumns(gradeRows, [
        "id",
        "courseName",
        "studentId",
        "studentCode",
        "finalScore",
        "letterGrade",
        "status",
      ]),
    [gradeRows],
  );

  const attendanceColumns = useMemo(
    () =>
      buildColumns(attendanceRows, [
        "id",
        "studentId",
        "sessionId",
        "sessionDate",
        "status",
        "note",
      ]),
    [attendanceRows],
  );

  const requireAuthorization = (): string | null => {
    if (!session?.authorization) {
      setTabError("Khong tim thay token dang nhap. Vui long dang nhap lai.");
      return null;
    }

    return session.authorization;
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

  const parsePositiveInteger = (
    rawValue: string,
    fieldLabel: string,
  ): number | null => {
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setTabError(`${fieldLabel} khong hop le.`);
      return null;
    }

    return parsed;
  };

  const loadTabData = async (tabKey: AdminTabKey) => {
    const authorization = requireAuthorization();
    if (!authorization) {
      return;
    }

    await runAction(async () => {
      switch (tabKey) {
        case "accounts": {
          setTabMessage("Su dung module Quan ly tai khoan de thao tac CRUD.");
          break;
        }
        case "roles": {
          setTabMessage(
            "Su dung module Vai tro & phan quyen de thao tac toan bo CRUD role.",
          );
          break;
        }
        case "faculties": {
          setTabMessage("Su dung module CRUD de quan ly du lieu khoa.");
          break;
        }
        case "majors": {
          setTabMessage("Su dung module CRUD de quan ly du lieu nganh.");
          break;
        }
        case "specializations": {
          setTabMessage("Su dung module CRUD de quan ly du lieu chuyen nganh.");
          break;
        }
        case "cohorts": {
          setTabMessage("Su dung module CRUD de quan ly du lieu nien khoa.");
          break;
        }
        case "courses": {
          setTabMessage("Su dung module CRUD de quan ly du lieu mon hoc.");
          break;
        }
        case "classrooms": {
          setTabMessage("Su dung module CRUD de quan ly du lieu phong hoc.");
          break;
        }
        case "administrative-classes": {
          setTabMessage("Su dung module CRUD de quan ly lop chu nhiem.");
          break;
        }
        case "students": {
          setTabMessage("Su dung module CRUD de quan ly sinh vien.");
          break;
        }
        case "lecturers": {
          setTabMessage("Su dung module CRUD de quan ly giang vien.");
          break;
        }
        case "guardians": {
          setTabMessage("Su dung module CRUD de quan ly phu huynh.");
          break;
        }
        case "course-sections": {
          setTabMessage("Su dung module CRUD de quan ly lop hoc phan.");
          break;
        }
        case "admissions": {
          const [periodRows, blockRows, benchmarkRows, applicationRows] =
            await Promise.all([
              getAdmissionPeriods(authorization),
              getAdmissionBlocks(authorization),
              getAdmissionBenchmarks(authorization),
              getAdmissionApplications(authorization),
            ]);

          setAdmissionPeriods(periodRows);
          setAdmissionBlocks(blockRows);
          setAdmissionBenchmarks(benchmarkRows);
          setAdmissionApplications(applicationRows);
          setTabMessage(
            `Da tai tuyen sinh: ${periodRows.rows.length} periods, ${blockRows.length} blocks, ${benchmarkRows.rows.length} benchmarks, ${applicationRows.rows.length} applications.`,
          );
          break;
        }
        case "grade-management": {
          setGradeRows([]);
          setTabMessage("Nhap section ID roi bam Tai diem theo lop hoc phan.");
          break;
        }
        case "attendance-management": {
          setAttendanceRows([]);
          setTabMessage("Nhap student ID roi bam Tai diem danh.");
          break;
        }
        case "home":
        default:
          break;
      }
    });
  };

  const handleTabChange = (tab: AdminFeatureTab) => {
    setActiveTabKey(tab.key);
    setTabError("");
    setTabMessage("");

    if (tab.key !== "home") {
      void loadTabData(tab.key);
    }
  };

  const handleLoadGradeReports = async () => {
    const authorization = requireAuthorization();
    const sectionId = parsePositiveInteger(gradeSectionIdInput, "Section ID");
    if (!authorization || !sectionId) {
      return;
    }

    await runAction(async () => {
      const data = await getSectionGradeReports(sectionId, authorization);
      setGradeRows(data);
      setTabMessage(`Da tai ${data.length} ban ghi diem cho section ${sectionId}.`);
    });
  };

  const handleLoadAttendances = async () => {
    const authorization = requireAuthorization();
    const studentId = parsePositiveInteger(
      attendanceStudentIdInput,
      "Student ID",
    );
    if (!authorization || !studentId) {
      return;
    }

    await runAction(async () => {
      const data = await getStudentAttendances(studentId, authorization);
      setAttendanceRows(data);
      setTabMessage(`Da tai ${data.length} ban ghi diem danh cho student ${studentId}.`);
    });
  };

  const renderDynamicTable = (
    title: string,
    rows: DynamicRow[],
    columns: string[],
  ) => {
    return (
      <section className={contentCardClass}>
        <div className={sectionTitleClass}>
          <h2>{title}</h2>
          <span className="text-sm font-medium text-[#396786]">{rows.length} records</span>
        </div>
        <div className="overflow-x-auto px-4 py-4">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#cfdfec] text-[#305970]">
                {columns.map((column) => (
                  <th key={column} className="px-2 py-2">
                    {toColumnLabel(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`dynamic-row-${index}`}
                  className="border-b border-[#e0ebf4] text-[#3f6178]"
                >
                  {columns.map((column) => (
                    <td key={`${index}-${column}`} className="max-w-[260px] px-2 py-2">
                      <span className="line-clamp-2">{toDisplayValue(row[column])}</span>
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(columns.length, 1)} className="px-2 py-4 text-center text-[#577086]">
                    Chua co du lieu.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const activeDynamicCrudConfig = dynamicCrudTabConfigs[activeTab.key];

  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <div className="min-h-screen bg-[#e9edf2]">
        <header className="flex h-[52px] items-center justify-between bg-[#0a6ca0] px-3 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-white/45 text-sm font-semibold">
              AD
            </div>
            <nav className="flex items-center gap-6 text-lg font-semibold">
              {adminTopHeaderTabs.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="text-base transition hover:text-[#d7f0ff]"
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-base font-bold">
              {(session?.username || "A").slice(0, 1).toUpperCase()}
            </div>
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold">{session?.username || "-"}</p>
              <p className="text-xs opacity-90">Role: {session?.role || "-"}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-[4px] border border-white/40 px-2 py-1 text-sm font-semibold transition hover:bg-white/15"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="grid min-h-[calc(100vh-52px)] grid-cols-1 lg:grid-cols-[275px_minmax(0,1fr)]">
          <aside className="border-r border-[#b9cfe0] bg-[#f2f5f8]">
            <div className="border-b border-[#c7d8e5] px-4 py-3 text-[17px] font-semibold text-[#1c587f]">
              Admin Menu
            </div>
            <nav className="px-2 py-2">
              {adminFeatureTabs.map((item) => {
                const active = item.key === activeTabKey;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleTabChange(item)}
                    className={`mb-1 flex w-full items-center justify-between rounded-[4px] px-3 py-2 text-left text-[17px] transition ${
                      active
                        ? "bg-[#d6e9f7] font-semibold text-[#0d517a]"
                        : "text-[#234d69] hover:bg-[#e5eef6]"
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-5 border-t border-[#d0dce6] px-3 py-3 text-sm text-[#516b7f]">
              <p className="font-semibold text-[#2d5672]">Dieu huong nhanh</p>
              <p className="mt-2">
                <Link className="font-semibold text-[#0a5f92] hover:underline" href="/dashboard">
                  Mo dashboard student
                </Link>
              </p>
            </div>
          </aside>

          <main className="space-y-4 p-3 sm:p-4">
            <section className={contentCardClass}>
              <div className={sectionTitleClass}>
                <h1>{activeTab.label}</h1>
              </div>
              <div className="space-y-2 px-4 py-3 text-sm text-[#355970]">
                <p>{activeTab.description}</p>
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
                    <h2>Tong quan nhanh</h2>
                  </div>
                  <div className="grid gap-3 px-4 py-4 md:grid-cols-3 xl:grid-cols-4">
                    {adminFeatureTabs
                      .filter((item) => item.key !== "home")
                      .map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleTabChange(item)}
                          className="rounded-[8px] border border-[#c0d8ea] bg-[#f4fbff] p-3 text-left transition hover:border-[#7eb3d9] hover:bg-[#eaf5ff]"
                        >
                          <p className="text-base font-semibold text-[#1d5b82]">{item.label}</p>
                          <p className="mt-2 text-xs text-[#6c8597]">Click de tai du lieu</p>
                        </button>
                      ))}
                  </div>
                </section>

                <section className={contentCardClass}>
                  <div className={sectionTitleClass}>
                    <h2>Danh sach chuc nang admin</h2>
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
                        {adminFeatureTabs
                          .filter((item) => item.key !== "home")
                          .map((item) => (
                            <tr key={item.key} className="border-b border-[#e0ebf4] text-[#3f6178]">
                              <td className="px-2 py-2 font-semibold text-[#1f567b]">{item.label}</td>
                              <td className="px-2 py-2">{item.description}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab.key === "accounts" ? (
              <AccountManagementPanel authorization={session?.authorization} />
            ) : null}

            {activeTab.key === "roles" ? (
              <RolePermissionPanel authorization={session?.authorization} />
            ) : null}

            {activeDynamicCrudConfig ? (
              <DynamicCrudPanel
                authorization={session?.authorization}
                title={activeDynamicCrudConfig.title}
                basePath={activeDynamicCrudConfig.basePath}
                listQuery={activeDynamicCrudConfig.listQuery}
                priorityColumns={activeDynamicCrudConfig.priorityColumns}
                createTemplate={activeDynamicCrudConfig.createTemplate}
                updateTemplate={activeDynamicCrudConfig.updateTemplate}
                statusPatch={activeDynamicCrudConfig.statusPatch}
              />
            ) : null}

            {activeTab.key === "grade-management" ? (
              <div className="space-y-4">
                <section className={contentCardClass}>
                  <div className={sectionTitleClass}>
                    <h2>Quan ly diem theo lop hoc phan</h2>
                  </div>
                  <div className="grid gap-2 px-4 py-4 sm:grid-cols-[220px_160px]">
                    <input
                      className="h-10 rounded-[4px] border border-[#c8d3dd] px-3 text-sm outline-none focus:border-[#6aa8cf]"
                      placeholder="Section ID"
                      value={gradeSectionIdInput}
                      onChange={(event) => setGradeSectionIdInput(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void handleLoadGradeReports();
                      }}
                      disabled={isWorking}
                      className="h-10 rounded-[4px] bg-[#0d6ea6] px-3 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
                    >
                      Tai diem theo lop
                    </button>
                  </div>
                </section>
                {renderDynamicTable(
                  "Bang diem theo lop hoc phan",
                  gradeRows,
                  gradeColumns,
                )}
              </div>
            ) : null}

            {activeTab.key === "attendance-management" ? (
              <div className="space-y-4">
                <section className={contentCardClass}>
                  <div className={sectionTitleClass}>
                    <h2>Quan ly diem danh theo sinh vien</h2>
                  </div>
                  <div className="grid gap-2 px-4 py-4 sm:grid-cols-[220px_160px]">
                    <input
                      className="h-10 rounded-[4px] border border-[#c8d3dd] px-3 text-sm outline-none focus:border-[#6aa8cf]"
                      placeholder="Student ID"
                      value={attendanceStudentIdInput}
                      onChange={(event) => setAttendanceStudentIdInput(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void handleLoadAttendances();
                      }}
                      disabled={isWorking}
                      className="h-10 rounded-[4px] bg-[#0d6ea6] px-3 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
                    >
                      Tai diem danh
                    </button>
                  </div>
                </section>
                {renderDynamicTable(
                  "Bang diem danh theo sinh vien",
                  attendanceRows,
                  attendanceColumns,
                )}
              </div>
            ) : null}


            {activeTab.key === "admissions" ? (
              <div className="space-y-4">
                <section className={contentCardClass}>
                  <div className={sectionTitleClass}>
                    <h2>Ky tuyen sinh (periods)</h2>
                    <button
                      type="button"
                      onClick={() => {
                        void loadTabData("admissions");
                      }}
                      disabled={isWorking}
                      className="rounded-[4px] bg-[#0d6ea6] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
                    >
                      Lam moi tat ca
                    </button>
                  </div>
                  <div className="overflow-x-auto px-4 py-4">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#cfdfec] text-[#305970]">
                          <th className="px-2 py-2">ID</th>
                          <th className="px-2 py-2">Ten ky</th>
                          <th className="px-2 py-2">Bat dau</th>
                          <th className="px-2 py-2">Ket thuc</th>
                          <th className="px-2 py-2">Status</th>
                          <th className="px-2 py-2">Tong ho so</th>
                          <th className="px-2 py-2">Da duyet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admissionPeriods.rows.map((item) => (
                          <tr key={item.id} className="border-b border-[#e0ebf4] text-[#3f6178]">
                            <td className="px-2 py-2">{item.id}</td>
                            <td className="px-2 py-2">{item.periodName || "-"}</td>
                            <td className="px-2 py-2">{formatDateTime(item.startTime)}</td>
                            <td className="px-2 py-2">{formatDateTime(item.endTime)}</td>
                            <td className="px-2 py-2">{item.status || "-"}</td>
                            <td className="px-2 py-2">{item.totalApplications ?? "-"}</td>
                            <td className="px-2 py-2">{item.approvedApplications ?? "-"}</td>
                          </tr>
                        ))}
                        {admissionPeriods.rows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-2 py-4 text-center text-[#577086]">
                              Chua co du lieu period.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className={contentCardClass}>
                  <div className={sectionTitleClass}>
                    <h2>Khoi xet tuyen (blocks)</h2>
                    <span className="text-sm font-medium text-[#396786]">{admissionBlocks.length} blocks</span>
                  </div>
                  <div className="overflow-x-auto px-4 py-4">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#cfdfec] text-[#305970]">
                          <th className="px-2 py-2">ID</th>
                          <th className="px-2 py-2">Block</th>
                          <th className="px-2 py-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admissionBlocks.map((item) => (
                          <tr key={item.id} className="border-b border-[#e0ebf4] text-[#3f6178]">
                            <td className="px-2 py-2">{item.id}</td>
                            <td className="px-2 py-2">{item.blockName || "-"}</td>
                            <td className="px-2 py-2">{item.description || "-"}</td>
                          </tr>
                        ))}
                        {admissionBlocks.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-2 py-4 text-center text-[#577086]">
                              Chua co du lieu blocks.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className={contentCardClass}>
                  <div className={sectionTitleClass}>
                    <h2>Diem chuan (benchmarks)</h2>
                    <span className="text-sm font-medium text-[#396786]">{admissionBenchmarks.rows.length} benchmarks</span>
                  </div>
                  <div className="overflow-x-auto px-4 py-4">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#cfdfec] text-[#305970]">
                          <th className="px-2 py-2">ID</th>
                          <th className="px-2 py-2">Nganh</th>
                          <th className="px-2 py-2">Block</th>
                          <th className="px-2 py-2">Period</th>
                          <th className="px-2 py-2">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admissionBenchmarks.rows.map((item) => (
                          <tr key={item.id} className="border-b border-[#e0ebf4] text-[#3f6178]">
                            <td className="px-2 py-2">{item.id}</td>
                            <td className="px-2 py-2">{item.majorName || "-"}</td>
                            <td className="px-2 py-2">{item.blockName || "-"}</td>
                            <td className="px-2 py-2">{item.periodName || "-"}</td>
                            <td className="px-2 py-2">{item.score ?? "-"}</td>
                          </tr>
                        ))}
                        {admissionBenchmarks.rows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-2 py-4 text-center text-[#577086]">
                              Chua co du lieu benchmark.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className={contentCardClass}>
                  <div className={sectionTitleClass}>
                    <h2>Ho so du tuyen</h2>
                    <span className="text-sm font-medium text-[#396786]">{admissionApplications.rows.length} applications</span>
                  </div>
                  <div className="overflow-x-auto px-4 py-4">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#cfdfec] text-[#305970]">
                          <th className="px-2 py-2">ID</th>
                          <th className="px-2 py-2">Ho ten</th>
                          <th className="px-2 py-2">Nganh</th>
                          <th className="px-2 py-2">Block</th>
                          <th className="px-2 py-2">Period</th>
                          <th className="px-2 py-2">Tong diem</th>
                          <th className="px-2 py-2">Trang thai</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admissionApplications.rows.map((item) => (
                          <tr key={item.id} className="border-b border-[#e0ebf4] text-[#3f6178]">
                            <td className="px-2 py-2">{item.id}</td>
                            <td className="px-2 py-2">{item.fullName || "-"}</td>
                            <td className="px-2 py-2">{item.majorName || "-"}</td>
                            <td className="px-2 py-2">{item.blockName || "-"}</td>
                            <td className="px-2 py-2">{item.periodName || "-"}</td>
                            <td className="px-2 py-2">{item.totalScore ?? "-"}</td>
                            <td className="px-2 py-2">{item.status || "-"}</td>
                          </tr>
                        ))}
                        {admissionApplications.rows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-2 py-4 text-center text-[#577086]">
                              Chua co du lieu application.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
