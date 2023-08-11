import {ApplicationStatus} from "@prisma/client";

export function parseApplicationStatus(
    status: string,
    isTrial: boolean
): ApplicationStatus {
    switch (status.toLowerCase()) {
        case "send":
            return ApplicationStatus.SEND;
        case "reviewing":
            return ApplicationStatus.REVIEWING;
        case "accpeted":
            if (isTrial) return ApplicationStatus.TRIAL;
            return ApplicationStatus.ACCEPTED;
        case "declined":
            return ApplicationStatus.DECLINED;
        default:
            return ApplicationStatus.SEND;
    }
}
