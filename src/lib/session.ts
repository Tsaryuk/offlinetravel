import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

export const SESSION_COOKIE = "ot_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 90; // 90 дней

export interface Session {
  tgId: number;
}

function secret(): Uint8Array {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ tgId: s.tgId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const tgId = Number(payload.tgId);
    return Number.isFinite(tgId) && tgId > 0 ? { tgId } : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(s: Session): Promise<void> {
  const store = await cookies();
  store.set({
    name: SESSION_COOKIE,
    value: await signSession(s),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Mini App открывается внутри WebView Telegram — first-party контекст, Lax достаточно.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}
