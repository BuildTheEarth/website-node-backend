import { ApplicationStatus } from "@prisma/client";

export function parseApplicationStatus(
  status: string,
  isTrial?: boolean,
): ApplicationStatus {
  switch (status.toLowerCase()) {
    case "send":
      return ApplicationStatus.SEND;
    case "reviewing":
      return ApplicationStatus.REVIEWING;
    case "accepted":
      if (isTrial) return ApplicationStatus.TRIAL;
      return ApplicationStatus.ACCEPTED;
    case "declined":
      return ApplicationStatus.DECLINED;
    case "trial":
      return ApplicationStatus.TRIAL;
    default:
      return ApplicationStatus.SEND;
  }
}
