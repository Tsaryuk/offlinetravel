import type { Member } from "@/lib/types";

const COLORS = ["#ff5a00", "#1e1e1e", "#3d3d3d", "#575757", "#6b6b6b", "#8a8a8a"];

export function avatarColor(tgId: number): string {
  let h = 0;
  for (const ch of String(tgId)) h = (h * 31 + ch.charCodeAt(0)) & 0xffffff;
  return COLORS[h % COLORS.length];
}

export function memberName(m: Pick<Member, "display_name" | "user"> | undefined): string {
  if (!m) return "?";
  return m.display_name || m.user?.first_name || m.user?.username || "?";
}

export function Avatar({ member, size = 36, ring }: { member: Pick<Member, "tg_id" | "display_name" | "user"> | undefined; size?: number; ring?: boolean }) {
  const name = memberName(member);
  const photo = member?.user?.photo_url;
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4), background: member ? avatarColor(member.tg_id) : "#ccc" };
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium text-white ${ring ? "ring-2 ring-bg" : ""}`}
      style={style}
      aria-label={name}
    >
      {photo ? <img src={photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : name.charAt(0).toUpperCase()}
    </div>
  );
}

export function AvatarStack({ members, size = 28, max = 5 }: { members: Member[]; size?: number; max?: number }) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <div key={m.tg_id} style={{ marginLeft: i ? -size * 0.3 : 0 }}>
          <Avatar member={m} size={size} ring />
        </div>
      ))}
      {rest > 0 && (
        <div className="flex items-center justify-center rounded-full bg-surface-2 text-[11px] font-medium text-ink-2 ring-2 ring-bg" style={{ width: size, height: size, marginLeft: -size * 0.3 }}>
          +{rest}
        </div>
      )}
    </div>
  );
}
