import { User } from "@prisma/client";

interface kAuth {
  grant: any;
}

declare global {
  namespace Express {
    interface Request {
      kauth: kAuth;
      user: User;
    }
  }
}
