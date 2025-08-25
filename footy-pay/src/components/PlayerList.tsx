// components/PlayerList.tsx
import { useEffect, useMemo, useState } from "react";
import {
    collection,
    onSnapshot,
    orderBy,
    query as fsQuery,
    updateDoc,
    doc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Player = {
    id: string;
    name: string;
    spots?: number;
    paidAt?: Date | null;
    joinedAt?: Date | null;

    // optional flags
    paid?: boolean;
    status?: string;
    paymentStatus?: string;
};

// tiny “• joined 2d ago”
const SHOW_RELATIVE_JOINED = false;

// unified “is this paid?” check
function isPaid(p: Player) {
    return Boolean(
        p.paidAt ||
        p.paid === true ||
        p.status === "paid" ||
        p.paymentStatus === "paid"
    );
}

export default function PlayerList({ gameId }: { gameId: string }) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!gameId) return;
        setLoading(true);

        const playersRef = collection(db, "games", gameId, "players");
        const q = fsQuery(playersRef, orderBy("joinedAt", "asc"));

        const unsub = onSnapshot(
            q,
            async (snap) => {
                const rows: Player[] = [];
                const toBackfill: Promise<any>[] = [];

                snap.forEach((d) => {
                    const data = d.data() as any;

                    const coerceDate = (v: any): Date | null => {
                        if (v?.toDate) return v.toDate();                 // Firestore Timestamp
                        if (typeof v?.seconds === "number") return new Date(v.seconds * 1000);
                        if (typeof v === "string") {
                            const t = new Date(v);
                            return isNaN(t.getTime()) ? null : t;
                        }
                        return null;
                    };

                    const player: Player = {
                        id: d.id,
                        name: data.name ?? "Anonymous",
                        spots: Number(data.spots ?? 1),
                        paidAt: coerceDate(data.paidAt),
                        joinedAt: coerceDate(data.joinedAt),
                        paid: data.paid ?? undefined,
                        status: data.status ?? undefined,
                        paymentStatus: data.paymentStatus ?? undefined,
                    };

                    // If they’re on the list but have no paid signal, backfill paidAt
                    if (
                        !player.paidAt &&
                        player.paid !== true &&
                        player.status !== "paid" &&
                        player.paymentStatus !== "paid"
                    ) {
                        toBackfill.push(
                            updateDoc(doc(db, "games", gameId, "players", d.id), {
                                paidAt: serverTimestamp(),
                                joinedAt: data.joinedAt ?? serverTimestamp(),
                            })
                        );
                    }

                    rows.push(player);
                });

                // backfill in the background; no need to block UI
                if (toBackfill.length) await Promise.allSettled(toBackfill);

                setPlayers(rows);
                setLoading(false);
            },
            (err) => {
                console.error("PlayerList snapshot error:", err);
                setPlayers([]);
                setLoading(false);
            }
        );

        return () => unsub();
    }, [gameId]);

    const totalSpots = useMemo(
        () => players.reduce((s, p) => s + (p.spots ?? 1), 0),
        [players]
    );
    const paidCount = useMemo(
        () => players.filter((p) => isPaid(p)).length,
        [players]
    );

    return (
        <div className="w-full">
            {/* Header with chips */}
            <div className="flex items-center justify-between px-4 py-3">
                <h3 className="text-sm font-semibold text-zinc-300">Players</h3>
                <div className="flex items-center gap-2">
                    <Chip>{players.length} player{players.length !== 1 ? "s" : ""}</Chip>
                    <Chip>{totalSpots} spot{totalSpots !== 1 ? "s" : ""}</Chip>
                    <Chip tone="green">{paidCount} paid</Chip>
                </div>
            </div>

            {/* Body */}
            {loading ? (
                <ul className="divide-y divide-zinc-800">
                    {[...Array(3)].map((_, i) => (
                        <li key={i} className="px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
                                <div className="flex-1">
                                    <div className="h-3 w-40 rounded bg-zinc-800 animate-pulse mb-2" />
                                    <div className="h-2 w-56 rounded bg-zinc-900 animate-pulse" />
                                </div>
                                <div className="w-12 h-6 rounded bg-zinc-800 animate-pulse" />
                            </div>
                        </li>
                    ))}
                </ul>
            ) : players.length === 0 ? (
                <div className="px-4 pb-4">
                    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-400">
                        No players have joined yet.
                    </div>
                </div>
            ) : (
                <ul className="divide-y divide-zinc-800 max-h-[420px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-800/70">
                    {players.map((p) => (
                        <li key={p.id} className="px-4 py-3">
                            <div className="flex items-center gap-3">
                                <Avatar name={p.name} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-zinc-200 font-medium truncate">{p.name}</div>

                                    {/* meta: Paid chip + optional relative joined time */}
                                    <div className="mt-0.5 flex items-center gap-2 text-xs">
                                        {isPaid(p) ? (
                                            <Chip tone="green" title={p.paidAt ? titleFromDate(p.paidAt) : undefined}>
                                                Paid
                                            </Chip>
                                        ) : (
                                            <Chip title="Not paid yet">Unpaid</Chip>
                                        )}
                                        {SHOW_RELATIVE_JOINED && p.joinedAt ? (
                                            <span className="text-zinc-500" title={titleFromDate(p.joinedAt)}>
                        • joined {relativeTime(p.joinedAt)}
                      </span>
                                        ) : null}
                                    </div>
                                </div>

                                <span className="text-xs rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-1 text-zinc-300 shrink-0">
                  {p.spots ?? 1} spot{(p.spots ?? 1) > 1 ? "s" : ""}
                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* helpers */

function initials(name: string) {
    const parts = (name || "").trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || "U";
}

function Avatar({ name }: { name: string }) {
    return (
        <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-700/30 flex items-center justify-center text-[11px] text-indigo-200">
            {initials(name)}
        </div>
    );
}

function Chip({
                  children,
                  tone,
                  title,
              }: {
    children: React.ReactNode;
    tone?: "green";
    title?: string;
}) {
    return (
        <span
            title={title}
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
                tone === "green"
                    ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-300"
                    : "border-zinc-700 bg-zinc-900/60 text-zinc-300"
            }`}
        >
      {children}
    </span>
    );
}

function titleFromDate(d?: Date | null) {
    return d ? d.toLocaleString() : undefined;
}

function relativeTime(d: Date) {
    const diff = d.getTime() - Date.now(); // negative for past
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

    const mins = Math.round(diff / 60000);
    if (Math.abs(mins) < 60) return rtf.format(mins, "minute");

    const hours = Math.round(mins / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, "hour");

    const days = Math.round(hours / 24);
    if (Math.abs(days) < 7) return rtf.format(days, "day");

    const weeks = Math.round(days / 7);
    if (Math.abs(weeks) < 5) return rtf.format(weeks, "week");

    const months = Math.round(days / 30);
    if (Math.abs(months) < 12) return rtf.format(months, "month");

    const years = Math.round(days / 365);
    return rtf.format(years, "year");
}
