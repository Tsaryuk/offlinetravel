"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTripCtx } from "@/components/trip/TripContext";
import { useTripMutation } from "@/lib/client/hooks";
import { api } from "@/lib/client/api";
import { InviteSheet } from "@/components/trip/InviteSheet";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Sheet, Confirm } from "@/components/ui/Sheet";
import { FieldGroup, Input, Textarea } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";
import type { Member } from "@/lib/types";

export default function MembersPage() {
  const t = useTripCtx();
  const [sel, setSel] = useState<Member | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  return (
    <>
      <PageHeader title={`Участники`} sub={`${t.members.length} чел.`} right={<Button size="sm" variant="ghost" onClick={() => setInviteOpen(true)}>Пригласить</Button>} />
      <div className="flex flex-col gap-1.5">
        {t.members.map((m) => (
          <Card key={m.tg_id} className="flex cursor-pointer items-center gap-3.5 px-[18px] py-3.5 active:bg-surface-2" onClick={() => setSel(m)}>
            <Avatar member={m} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15.5px] font-medium tracking-[-0.01em]">
                {t.name(m.tg_id)}
                {m.tg_id === t.me.tg_id && <span className="ml-1.5 text-[12px] font-normal text-ink-2">(я)</span>}
                {m.role === "admin" && <span className="ml-2 rounded-pill bg-accent px-2 py-0.5 align-middle text-[10px] font-medium text-white">Организатор</span>}
              </div>
              <div className="mt-0.5 text-[12.5px] text-ink-2">{[m.user?.username && `@${m.user.username}`, m.user?.city].filter(Boolean).join(" · ")}</div>
            </div>
          </Card>
        ))}
      </div>
      {sel && <MemberSheet member={t.members.find((x) => x.tg_id === sel.tg_id) ?? sel} onClose={() => setSel(null)} />}
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}

function MemberSheet({ member: m, onClose }: { member: Member; onClose: () => void }) {
  const t = useTripCtx();
  const router = useRouter();
  const qc = useQueryClient();
  const isMe = m.tg_id === t.me.tg_id;
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState<"remove" | "leave" | null>(null);
  const role = useTripMutation(t.trip.id, (r: "admin" | "member") => api(`/api/trips/${t.trip.id}/members/${m.tg_id}`, { method: "PATCH", body: { role: r } }));
  const remove = useTripMutation(t.trip.id, () => api(`/api/trips/${t.trip.id}/members/${m.tg_id}`, { method: "DELETE" }));

  async function leave() {
    try {
      await api(`/api/trips/${t.trip.id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["me"] });
      router.replace("/trips");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (edit) return <ProfileEdit member={m} onClose={() => { setEdit(false); onClose(); }} />;

  const u = m.user;
  const rows = [
    ["Телефон", u?.phone ? <a href={`tel:${u.phone}`} className="underline underline-offset-4">{u.phone}</a> : null],
    ["Перевод", u?.pay_note],
    ["Город", u?.city],
    ["О себе", u?.bio],
    ["Питание", u?.dietary],
  ].filter(([, v]) => v);

  return (
    <Sheet open onClose={onClose}>
      <div className="flex flex-col items-center pb-2 pt-3">
        <Avatar member={m} size={72} />
        <div className="mt-3.5 text-[22px] font-medium tracking-[-0.02em]">{t.name(m.tg_id)}</div>
        {u?.username && <a href={`https://t.me/${u.username}`} target="_blank" rel="noopener" className="mt-1 text-[13.5px] text-ink-2 underline underline-offset-4">@{u.username}</a>}
        {m.role === "admin" && <span className="mt-2 rounded-pill bg-accent px-3 py-1 text-[11px] font-medium text-white">Организатор</span>}
      </div>

      {rows.length > 0 && (
        <div className="mt-3">
          {rows.map(([k, v]) => (
            <div key={String(k)} className="flex justify-between gap-4 border-b border-line py-3 text-[14.5px] last:border-b-0">
              <span className="text-ink-2">{k}</span>
              <span className="text-right font-medium">{v}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {isMe && <Button variant="ghost" onClick={() => setEdit(true)}>Редактировать профиль</Button>}
        {!isMe && u?.username && <Button variant="ghost" onClick={() => window.open(`https://t.me/${u.username}`, "_blank")}>Написать в Telegram</Button>}
        {t.isAdmin && !isMe && (
          <Button variant="ghost" onClick={() => role.mutate(m.role === "admin" ? "member" : "admin")} loading={role.isPending}>
            {m.role === "admin" ? "Снять организатора" : "Сделать организатором"}
          </Button>
        )}
        {t.isAdmin && !isMe && <Button variant="ghost" className="text-bad" onClick={() => setConfirm("remove")}>Удалить из поездки</Button>}
        {isMe && <Button variant="ghost" className="text-bad" onClick={() => setConfirm("leave")}>Покинуть поездку</Button>}
      </div>

      <Confirm open={confirm === "remove"} title={`Удалить ${t.name(m.tg_id)}?`} text="Расходы участника останутся в истории." danger confirmLabel="Удалить" onCancel={() => setConfirm(null)} onConfirm={async () => { setConfirm(null); try { await remove.mutateAsync(undefined); onClose(); } catch (e) { toast((e as Error).message, "error"); } }} />
      <Confirm open={confirm === "leave"} title="Покинуть поездку?" text="Вернуться можно будет по ссылке-приглашению." danger confirmLabel="Выйти" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); leave(); }} />
    </Sheet>
  );
}

function ProfileEdit({ member: m, onClose }: { member: Member; onClose: () => void }) {
  const t = useTripCtx();
  const qc = useQueryClient();
  const [name, setName] = useState(m.display_name ?? m.user?.first_name ?? "");
  const [phone, setPhone] = useState(m.user?.phone ?? "");
  const [city, setCity] = useState(m.user?.city ?? "");
  const [bio, setBio] = useState(m.user?.bio ?? "");
  const [dietary, setDietary] = useState(m.user?.dietary ?? "");
  const [payNote, setPayNote] = useState(m.user?.pay_note ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await Promise.all([
        api("/api/me", { method: "PATCH", body: { phone: phone || null, city: city || null, bio: bio || null, dietary: dietary || null, pay_note: payNote || null } }),
        api(`/api/trips/${t.trip.id}/members/${m.tg_id}`, { method: "PATCH", body: { display_name: name.trim() } }),
      ]);
      qc.invalidateQueries({ queryKey: ["trip", t.trip.id] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast("Сохранено");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title="Профиль">
      <FieldGroup label="Имя в поездке"><Input value={name} onChange={(e) => setName(e.target.value)} /></FieldGroup>
      <FieldGroup label="Телефон (для СБП)"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 …" /></FieldGroup>
      <FieldGroup label="Куда переводить"><Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Т-Банк по номеру, Сбер…" /></FieldGroup>
      <FieldGroup label="Город"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Откуда вы" /></FieldGroup>
      <FieldGroup label="О себе"><Textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Пару слов" /></FieldGroup>
      <FieldGroup label="Питание"><Input value={dietary} onChange={(e) => setDietary(e.target.value)} placeholder="Аллергии, вегетарианство…" /></FieldGroup>
      <Button size="lg" onClick={save} loading={busy} className="mt-2">Сохранить</Button>
    </Sheet>
  );
}
