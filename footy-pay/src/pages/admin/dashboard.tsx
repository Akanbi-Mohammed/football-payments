// pages/admin/dashboard.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PlayerList from "@/components/PlayerList";

type Game = {
    title: string;
    date?: string;   // ISO "YYYY-MM-DD"
    time?: string;   // "HH:mm"
    location?: string;
    price?: number;
    maxPlayers?: number;
    organiserEmail?: string;
    createdAt?: any;
    spotsTaken?: number; // optional (not used now; we compute live)
};

const DEFAULT_VISIBLE = 6; // number of cards to show before "Show all"

export default function AdminDashboard() {
    const [email, setEmail] = useState("");
    const [inputEmail, setInputEmail] = useState("");
    const [games, setGames] = useState<Array<{ id: string } & Game>>([]);
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [qText, setQText] = useState("");
    const [show, setShow] = useState<"upcoming" | "past" | "all">("all");
    const [showAll, setShowAll] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // init email from ?email= or localStorage
    useEffect(() => {
        const paramsEmail =
            typeof window !== "undefined"
                ? new URLSearchParams(window.location.search).get("email")
                : null;
        const stored =
            typeof window !== "undefined"
                ? localStorage.getItem("organiserEmail")
                : null;
        const current = paramsEmail || stored || "";
        if (current) {
            setEmail(current);
            setInputEmail(current);
        }
    }, []);

    // persist email
    useEffect(() => {
        if (email) localStorage.setItem("organiserEmail", email);
    }, [email]);

    // subscribe to games for this organiser (no auth)
    useEffect(() => {
        if (!email) {
            setGames([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const qy = query(collection(db, "games"), where("organiserEmail", "==", email));
        const unsub = onSnapshot(
            qy,
            (snap) => {
                const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Game) }));
                // sort: earliest first
                const sorted = data.sort((a, b) => {
                    const aDT = new Date(`${a.date ?? "2100-01-01"}T${a.time ?? "00:00"}`).getTime();
                    const bDT = new Date(`${b.date ?? "2100-01-01"}T${b.time ?? "00:00"}`).getTime();
                    return aDT - bDT;
                });
                setGames(sorted);
                setLoading(false);
                if (!selectedGameId && sorted.length) setSelectedGameId(sorted[0].id);
            },
            () => setLoading(false)
        );
        return () => unsub();
    }, [email, selectedGameId]);

    const saveEmail = () => {
        if (!inputEmail.trim()) return;
        setEmail(inputEmail.trim());
        setSelectedGameId(null);
    };

    const now = Date.now();
    const filtered = useMemo(() => {
        return games.filter((g) => {
            const matchesSearch =
                qText.trim().length === 0 ||
                (g.title || "").toLowerCase().includes(qText.toLowerCase()) ||
                (g.location || "").toLowerCase().includes(qText.toLowerCase());
            if (!matchesSearch) return false;

            if (show === "all") return true;
            const t = new Date(`${g.date ?? "1970-01-01"}T${g.time ?? "00:00"}`).getTime();
            return show === "upcoming" ? t >= now : t < now;
        });
    }, [games, qText, show]);

    const counts = useMemo(() => {
        const up = games.filter((g) => new Date(`${g.date ?? "1970-01-01"}T${g.time ?? "00:00"}`).getTime() >= now).length;
        const past = games.length - up;
        return { all: games.length, upcoming: up, past };
    }, [games, now]);

    const visible = showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE);

    const selectedGame = useMemo(
        () => games.find((g) => g.id === selectedGameId) || null,
        [games, selectedGameId]
    );

    function copyPublicLink(id: string) {
        const url = `${window.location.origin}/play/${id}`;
        navigator.clipboard?.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1100);
    }

    return (
        <main className="min-h-screen w-full text-white bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,.08),transparent_70%),linear-gradient(to_br,#0a0a0b,#0b0b0c)] px-4 py-10">
            <div className="mx-auto w-full max-w-7xl">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">Organiser Dashboard</h1>
                        <p className="text-sm text-zinc-400">View and manage your games — no sign-in required.</p>
                    </div>
                    {email ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-300">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Zm2 .5 8 5 8-5" />
              </svg>
                            {email}
            </span>
                    ) : null}
                </div>

                {/* Email selector */}
                <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur p-5">
                    <label className="block text-xs font-semibold tracking-wide text-zinc-400 mb-2">
                        ORGANISER EMAIL
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="email"
                            value={inputEmail}
                            onChange={(e) => setInputEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                        />
                        <button
                            onClick={saveEmail}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 font-semibold"
                        >
                            Use this email
                        </button>
                    </div>
                    {email && (
                        <p className="mt-2 text-xs text-zinc-500">
                            Showing games for <span className="text-zinc-300">{email}</span>
                        </p>
                    )}
                </div>

                {/* Search + tabs */}
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative">
                        <input
                            value={qText}
                            onChange={(e) => setQText(e.target.value)}
                            placeholder="Search title or location…"
                            className="w-80 max-w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9 pr-3 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                        />
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M21 20l-4.3-4.3m1.3-4A7 7 0 1 1 3 11a7 7 0 0 1 15 0Z" />
              </svg>
            </span>
                    </div>

                    <div className="inline-flex rounded-full border border-zinc-800 bg-zinc-900/50 p-1">
                        {(["all", "upcoming", "past"] as const).map((k) => (
                            <button
                                key={k}
                                onClick={() => { setShow(k); setShowAll(false); }}
                                className={`px-3 py-1.5 text-sm rounded-full transition ${
                                    show === k ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                                }`}
                            >
                                {k[0].toUpperCase() + k.slice(1)}
                                <span className="ml-1 text-[10px] text-zinc-500">
                  {k === "all" ? counts.all : k === "upcoming" ? counts.upcoming : counts.past}
                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-6">
                    {/* Games */}
                    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur">
                        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Your Games</h2>
                            <span className="text-[11px] text-zinc-500">
                {loading ? "…" : `${filtered.length} ${filtered.length === 1 ? "game" : "games"}`}
              </span>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-40 rounded-2xl border border-zinc-800 bg-zinc-900/30 animate-pulse" />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-6">
                                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center">
                                    <p className="text-sm text-zinc-400">No games match your filters.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                                    {visible.map((g) => (
                                        <GameCard
                                            key={g.id}
                                            game={g}
                                            selected={selectedGameId === g.id}
                                            onSelect={() => setSelectedGameId(g.id)}
                                            onCopy={() => copyPublicLink(g.id)}
                                            copied={copiedId === g.id}
                                        />
                                    ))}
                                </ul>

                                {/* Show all / Show less */}
                                {filtered.length > DEFAULT_VISIBLE && (
                                    <div className="px-4 pb-6 -mt-2">
                                        <button
                                            onClick={() => setShowAll((v) => !v)}
                                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 px-4 py-2.5 text-sm"
                                        >
                                            {showAll ? "Show less" : `Show all ${filtered.length} games`}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </section>

                    {/* Players */}
                    <section className="xl:sticky xl:top-6 h-fit rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur">
                        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Players</h2>
                            {selectedGame ? (
                                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                    <span className="truncate max-w-[200px]">{selectedGame.title || "Untitled game"}</span>
                                    <a href={`/play/${selectedGameId}`} target="_blank" rel="noreferrer" className="underline">
                                        Open ↗
                                    </a>
                                </div>
                            ) : null}
                        </div>
                        <div className="p-4">
                            {selectedGameId ? (
                                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
                                    <PlayerList gameId={selectedGameId} />
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center">
                                    <p className="text-sm text-zinc-400">Select a game to view its players.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}

/* ——— Card with live progress ——— */
function GameCard({
                      game,
                      selected,
                      onSelect,
                      onCopy,
                      copied,
                  }: {
    game: { id: string; title?: string; date?: string; time?: string; price?: number; location?: string; maxPlayers?: number; organiserEmail?: string; };
    selected: boolean;
    onSelect: () => void;
    onCopy: () => void;
    copied: boolean;
}) {
    const [taken, setTaken] = useState<number>(0);

    // Live sum of spots from players subcollection (only while card is mounted)
    useEffect(() => {
        const ref = collection(db, "games", game.id, "players");
        const unsub = onSnapshot(ref, (snap) => {
            let sum = 0;
            snap.forEach((d) => {
                const spots = Number((d.data() as any)?.spots ?? 1);
                sum += isFinite(spots) ? spots : 1;
            });
            setTaken(sum);
        });
        return () => unsub();
    }, [game.id]);

    const cap = Number(game.maxPlayers ?? 0);
    const pct = cap > 0 ? Math.min(100, Math.round((taken / cap) * 100)) : 0;
    const isFree = Number(game.price) === 0;

    return (
        <li className="group rounded-2xl border border-zinc-800/90 bg-zinc-950/40 hover:bg-zinc-950/70 transition shadow-[0_0_0_1px_rgba(24,24,27,0.6)]">
            <div className="p-4 sm:p-5">
                {/* header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold truncate">{game.title || "Untitled game"}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-zinc-400">
                            <DateChip date={game.date} time={game.time} />
                            {typeof game.price === "number" && <Pill>£{game.price.toFixed(2)}</Pill>}
                            {game.location && <Pill icon="pin">{game.location}</Pill>}
                            {isFree && <Pill tone="green">Free</Pill>}
                        </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900/70 px-2 py-0.5 text-[10px] text-zinc-300">
            {game.organiserEmail || "—"}
          </span>
                </div>

                {/* progress */}
                <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                        <span>{taken}/{cap || "—"} joined</span>
                        <span>{cap > 0 ? `${pct}%` : "—"}</span>
                    </div>
                    <div className="h-[6px] rounded-full bg-zinc-800 overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all"
                            style={{ width: cap > 0 ? `${pct}%` : "0%" }}
                        />
                    </div>
                </div>

                {/* actions */}
                <div className="mt-4 flex items-center gap-2">
                    <button
                        onClick={onSelect}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                            selected
                                ? "bg-indigo-600 hover:bg-indigo-700"
                                : "border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
                        }`}
                    >
                        {selected ? "Showing Players" : "View Players"}
                    </button>

                    <ActionMenu gameId={game.id} onCopy={onCopy} />

                    {copied && <span className="ml-1 text-[11px] text-zinc-400">Copied</span>}
                </div>
            </div>
        </li>
    );
}

/* ——— tiny UI helpers ——— */
function Pill({
                  children,
                  icon,
                  tone,
              }: {
    children: React.ReactNode;
    icon?: "pin";
    tone?: "green";
}) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                tone === "green"
                    ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
            }`}
        >
      {icon === "pin" && (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
              <path d="M12 22s7-5.4 7-12a7 7 0 1 0-14 0c0 6.6 7 12 7 12Zm0-10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/>
          </svg>
      )}
            {children}
    </span>
    );
}

function DateChip({ date, time }: { date?: string; time?: string }) {
    if (!date && !time) return null;
    const d = date ? new Date(`${date}T${time || "00:00"}`) : null;
    const nice = d
        ? d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) + (time ? ` • ${time}` : "")
        : `${date ?? ""}${time ? ` • ${time}` : ""}`;
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-zinc-300">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
        <path d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm14 8H3v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8Z" />
      </svg>
            {nice}
    </span>
    );
}

/** Minimal no-deps "more" menu */
function ActionMenu({
                        gameId,
                        onCopy,
                    }: {
    gameId: string;
    onCopy: () => void;
}) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            const target = e.target as HTMLElement;
            if (!target.closest?.(`[data-menu="${gameId}"]`)) setOpen(false);
        }
        if (open) document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, [open, gameId]);

    return (
        <div className="relative" data-menu={gameId}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 px-2.5 py-2 text-sm"
                aria-haspopup="menu"
                aria-expanded={open}
                title="More"
            >
                ⋯
            </button>

            {open && (
                <div
                    className="absolute z-10 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 shadow-lg backdrop-blur"
                    role="menu"
                >
                    <a
                        href={`/play/${gameId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/60"
                        role="menuitem"
                    >
                        Public page ↗
                    </a>
                    <a
                        href={`/admin/share/${gameId}`}
                        className="block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/60"
                        role="menuitem"
                    >
                        Share page
                    </a>
                    <button
                        onClick={() => {
                            onCopy();
                            setOpen(false);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/60"
                        role="menuitem"
                    >
                        Copy link
                    </button>
                </div>
            )}
        </div>
    );
}
