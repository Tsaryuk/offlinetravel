import { NextResponse } from "next/server";
import { handler, requireMember, ApiError } from "@/lib/api";
import { signedReceiptUrl, tripIdFromPath } from "@/lib/storage";

// Просмотр фото чека: проверяем, что просящий — участник поездки из пути файла,
// и перенаправляем на подписанную ссылку. Сами файлы наружу не торчат.
export const GET = handler(async (req) => {
  const path = new URL(req.url).searchParams.get("path") ?? "";
  const tripId = tripIdFromPath(path);
  if (!tripId) throw new ApiError(400, "Неверный путь файла");
  await requireMember(tripId);
  return NextResponse.redirect(await signedReceiptUrl(path), { status: 302 });
});
