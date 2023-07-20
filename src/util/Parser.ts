import { ApplicationStatus } from "@prisma/client";

export function parseApplicationStatus(status: string): ApplicationStatus {
  switch (status.toLowerCase()) {
    case "send":
      return ApplicationStatus.SEND;
    case "reviewing":
      return ApplicationStatus.REVIEWING;
    case "accpeted":
      return ApplicationStatus.ACCEPTED;
    case "declined":
      return ApplicationStatus.DECLIEND;
    default:
      return ApplicationStatus.SEND;
  }
}
