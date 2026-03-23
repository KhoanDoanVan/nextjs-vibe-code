// Snapshot từ docs/api/edums-openapi.json (2026-03-23)
export const apiDomains = [
  { tag: "Account", count: 6 },
  { tag: "Administrative Class", count: 5 },
  { tag: "Attendance", count: 6 },
  { tag: "Classroom", count: 5 },
  { tag: "Cohort", count: 5 },
  { tag: "Course", count: 6 },
  { tag: "Course Section", count: 8 },
  { tag: "Faculty", count: 5 },
  { tag: "Grade Component", count: 6 },
  { tag: "Grade Report", count: 6 },
  { tag: "Guardian Management", count: 5 },
  { tag: "Lecturer Management", count: 5 },
  { tag: "Major", count: 6 },
  { tag: "Recurring Schedule", count: 6 },
  { tag: "Role and permission", count: 6 },
  { tag: "Schedule Management", count: 1 },
  { tag: "Specialization", count: 6 },
  { tag: "Student Management", count: 6 },
  { tag: "admin-admission-config-controller", count: 14 },
  { tag: "admin-application-controller", count: 6 },
  { tag: "auth-controller", count: 1 },
  { tag: "course-registration-controller", count: 1 },
  { tag: "profile-controller", count: 3 },
  { tag: "public-admission-controller", count: 5 },
] as const;

export const totalApiEndpoints = apiDomains.reduce(
  (total, item) => total + item.count,
  0,
);
