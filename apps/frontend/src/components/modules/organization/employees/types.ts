export type EmployeeStatus = "active" | "inactive";

export type EmploymentType = "full_time" | "part_time" | "contract";

export type DeactivateReasonType =
  | "resignation"
  | "termination"
  | "end_of_contract"
  | "other";

export type EmployeeRecord = {
  id: string;
  fullName: string;
  designation: string;
  department: string;
  location: string;
  reportsToId: string | null;
  reportsToName: string | null;
  employmentType: EmploymentType;
  dateOfJoining: string;
  phone: string;
  email: string;
  status: EmployeeStatus;
  deactivateReasonType?: DeactivateReasonType;
  deactivateComment?: string;
  lastWorkingDay?: string;
  offboardNotes?: string;
  offboardedAt?: string;
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
};

export const DEACTIVATE_REASON_LABELS: Record<DeactivateReasonType, string> = {
  resignation: "Resignation",
  termination: "Termination",
  end_of_contract: "End of contract",
  other: "Other",
};
