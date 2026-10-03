import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type {
  Request,
  Response,
  NextFunction
} from "express";
import { db } from "./db.js";

const COOKIE_NAME = "sgar_session";

const JWT_SECRET =
  process.env.JWT_SECRET || "";

if (
  !JWT_SECRET ||
  JWT_SECRET.length < 32
) {
  throw new Error(
    "JWT_SECRET must be configured and at least 32 characters long"
  );
}

export type Session = {
  userId: string;
  role: string;
  branchId: string | null;
};

export async function login(
  username: string,
  password: string,
  branchId?: string
) {

  const cleanUsername =
    String(username || "").trim();

  if (
    !cleanUsername ||
    !password
  ) {
    return null;
  }

  const user =
    await db.user.findUnique({
      where: {
        username: cleanUsername
      },
      include: {
        branch: true
      }
    });

  if (!user) {
    return null;
  }

  if (!user.active) {
    return null;
  }

  const passwordValid =
    await bcrypt.compare(
      password,
      user.passwordHash
    );

  if (!passwordValid) {
    return null;
  }

  if (
    branchId &&
    user.branchId &&
    user.branchId !== branchId
  ) {
    return null;
  }

  const token =
    jwt.sign(
      {
        userId: user.id,
        role: user.role,
        branchId: user.branchId
      },
      JWT_SECRET,
      {
        expiresIn: "12h"
      }
    );

  return {
    token,

    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
      branch: user.branch
    }
  };

}

export function setSession(
  res: Response,
  token: string
) {

  res.cookie(
    COOKIE_NAME,
    token,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.COOKIE_SECURE === "true",
      maxAge:
        12 * 60 * 60 * 1000,
      path: "/"
    }
  );

}

export function clearSession(
  res: Response
) {

  res.clearCookie(
    COOKIE_NAME,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.COOKIE_SECURE === "true",
      path: "/"
    }
  );

  res.clearCookie(
    "kr_session",
    {
      path: "/"
    }
  );

}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {

  const cookieToken =
    req.cookies?.[COOKIE_NAME];

  const authorization =
    req.headers.authorization || "";

  const bearerToken =
    authorization
      .replace(/^Bearer\s+/i, "")
      .trim();

  const token =
    cookieToken ||
    bearerToken;

  if (!token) {

    return res
      .status(401)
      .json({
        error:
          "Authentication required"
      });

  }

  try {

    const session =
      jwt.verify(
        token,
        JWT_SECRET
      ) as Session;

    (req as any).session =
      session;

    next();

  }
  catch {

    return res
      .status(401)
      .json({
        error:
          "Session expired"
      });

  }

}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {

  const role =
    (req as any).session?.role;

  if (
    ![
      "SUPER_ADMIN",
      "ADMIN",
      "MANAGER"
    ].includes(role)
  ) {

    return res
      .status(403)
      .json({
        error:
          "Admin access required"
      });

  }

  next();

}

export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {

  if(
    (req as any).session?.role !==
    "SUPER_ADMIN"
  ){

    return res
      .status(403)
      .json({
        error:
          "Main admin access required"
      });

  }

  next();

}

export function branchScope(
  req: Request
) {

  const session =
    (req as any).session as Session;

  const requested =
    String(
      req.query.branchId ||
      req.body?.branchId ||
      ""
    ).trim();

  if(
    session.role === "SUPER_ADMIN" ||
    session.role === "ADMIN"
  ){

    return (
      requested ||
      session.branchId ||
      undefined
    );

  }

  return (
    session.branchId ||
    undefined
  );

}

export async function hashPassword(
  password: string
) {

  return bcrypt.hash(
    password,
    12
  );

}
