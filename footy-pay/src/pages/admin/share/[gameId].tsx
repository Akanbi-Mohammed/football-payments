// pages/admin/share/[gameId].tsx
import { useRouter } from "next/router";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PlayerList from "@/components/PlayerList";

type Game = {
    title: string;
    date: string;              // ISO date, e.g. "2025-08-25"
    time?: string;             // "HH:MM"
    location?: string;
    price: number;
    maxPlayers: number;
    organiserEmail: string;
};

export default function ShareGamePage() {
    const router = useRouter();
    const { gameId } = router.query;

    const [game, setGame] = useState<Game | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const shareUrl =
        typeof window !== "undefined" && gameId
            ? `${window.location.origin}/play/${gameId}`
            : "";

    useEffect(() => {
        if (!gameId || typeof gameId !== "string") return;
        (async () => {
            try {
                const ref = doc(db, "games", gameId);
                const snap = await getDoc(ref);
                if (!snap.exists()) {
                    setError("Game not found.");
                    return;
                }
                setGame(snap.data() as Game);
            } catch (e) {
                console.error(e);
                setError("Failed to fetch game.");
            }
        })();
    }, [gameId]);

    const displayDateTime = useMemo(() => {
        if (!game?.date) return "";
        try {
            const iso = game.time ? `${game.date}T${game.time}` : game.date;
            const d = new Date(iso);
            return new Intl.DateTimeFormat(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }).format(d);
        } catch {
            return `${game.date}${game?.time ? ` • ${game.time}` : ""}`;
        }
    }, [game?.date, game?.time]);

    const handleCopy = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleWhatsAppShare = () => {
        if (!game) return;
        const msg = [
            "⚽ Join my matchday!",
            "",
            game.title ? `📍 ${game.title}` : "",
            game.location ? `📌 ${game.location}` : "",
            displayDateTime ? `🗓️ ${displayDateTime}` : "",
            typeof game.price === "number" ? `💸 £${game.price.toFixed(2)}` : "",
            "",
            `Tap to join: ${shareUrl}`,
        ]
            .filter(Boolean)
            .join("\n");
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    };

    const handleOpenPlayPage = () => {
        if (!gameId) return;
        router.push(`/play/${gameId}`);
    };

    const handleCreateAnother = () => router.push("/create");
    const handleDashboard = () => router.push("/admin/dashboard");

    const handleAddToCalendar = () => {
        if (!game) return;
        const start = new Date(game.time ? `${game.date}T${game.time}` : game.date);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // +1h
        const ics = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//FiveASide//Booking//EN",
            "CALSCALE:GREGORIAN",
            "BEGIN:VEVENT",
            `UID:${gameId}@fiveaside`,
            `DTSTAMP:${toICS(new Date())}`,
            `DTSTART:${toICS(start)}`,
            `DTEND:${toICS(end)}`,
            `SUMMARY:${icsEscape(game.title || "Football match")}`,
            game.location ? `LOCATION:${icsEscape(game.location)}` : "",
            `DESCRIPTION:${icsEscape(`£${Number(game.price).toFixed(2)} • Join: ${shareUrl}`)}`,
            "END:VEVENT",
            "END:VCALENDAR",
        ]
            .filter(Boolean)
            .join("\r\n");
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(game.title || "match").replace(/\s+/g, "_")}.ics`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleQR = () => {
        const url = shareUrl || "";
        const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(
            url
        )}`;
        const w = window.open("", "qr", "width=260,height=280");
        if (w) {
            w.document.write(`
        <body style="margin:0;display:grid;place-items:center;background:#0b0b0c;">
          <img src="${qr}" alt="QR" style="border-radius:12px;margin:20px;" />
          <p style="font:12px system-ui;color:#9ca3af;margin:4px 0 12px;">Scan to join</p>
        </body>
      `);
        }
    };

    return (
        <>
            <Head>
                <title>Game Created | Share with Players</title>
            </Head>

            <main className="min-h-screen w-full bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.08),transparent_70%),linear-gradient(to_br,#0a0a0b,#0b0b0c)] text-white flex flex-col items-center px-4 py-12">
                {/* Wrap card + list in ONE column so list sits UNDER the card */}
                <div className="w-full max-w-2xl">
                    {/* Share Card */}
                    <div className="relative">
                        <div className="absolute -inset-5 -z-10 rounded-[32px] bg-gradient-to-tr from-blue-500/15 via-purple-500/15 to-emerald-500/15 blur-2xl" />
                        <div className="rounded-[28px] border border-zinc-800/90 bg-zinc-950/60 backdrop-blur-xl shadow-2xl">
                            {/* Header */}
                            <header className="px-7 sm:px-9 pt-8 pb-4 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                  Game Created <span>✅</span>
                </span>
                                <h1 className="mt-2 text-[22px] sm:text-2xl font-extrabold tracking-tight">
                                    Share your join link
                                </h1>
                                <p className="mt-1 text-sm text-zinc-400">
                                    Send to players, add to your calendar, or open the play page.
                                </p>
                            </header>

                            <div className="px-7 sm:px-9 pb-8 space-y-7">
                                {!game && !error && (
                                    <div className="text-center text-zinc-500 py-8">Loading game details…</div>
                                )}
                                {error && <div className="text-center text-red-500 py-8">{error}</div>}

                                {game && (
                                    <>
                                        {/* Summary */}
                                        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h2 className="text-lg font-semibold">{game.title}</h2>
                                                        <span className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800/70 px-2 py-0.5 text-[10px] text-zinc-300">
                              Public
                            </span>
                                                    </div>
                                                    <p className="mt-1 text-sm text-zinc-400">
                                                        {displayDateTime}
                                                        {game.location ? ` • ${game.location}` : ""}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-sm text-zinc-300">
                            <span className="font-semibold text-white">
                              £{Number(game.price).toFixed(2)}
                            </span>
                                                        <span className="text-zinc-600"> • </span>
                                                        <span>Max {game.maxPlayers}</span>
                                                    </div>
                                                    <div className="mt-2 h-2 rounded-xl bg-zinc-800 overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                                                            style={{ width: "0%" /* wire up to live % if you track count */ }}
                                                        />
                                                    </div>
                                                    <div className="mt-1 text-[11px] text-zinc-500">
                                                        Players appear here as they pay
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Share Row */}
                                        <section>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[11px] font-semibold tracking-wide text-zinc-400">
                                                    SHARE LINK
                                                </label>
                                                <span className="text-[11px] text-zinc-500">
                          Anyone with the link can join
                        </span>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input
                                                    readOnly
                                                    value={shareUrl}
                                                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2.5 text-white placeholder-zinc-500"
                                                />
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    <button
                                                        onClick={handleCopy}
                                                        className={`rounded-xl px-4 py-2.5 font-semibold text-white transition ${
                                                            copied ? "bg-emerald-600" : "bg-blue-600 hover:bg-blue-700"
                                                        }`}
                                                    >
                                                        {copied ? "Copied" : "Copy"}
                                                    </button>
                                                    <button
                                                        onClick={handleWhatsAppShare}
                                                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 font-semibold"
                                                    >
                                                        WhatsApp
                                                    </button>
                                                    <button
                                                        onClick={handleQR}
                                                        className="rounded-xl border border-zinc-700 bg-zinc-900/70 hover:bg-zinc-900 text-white px-4 py-2.5 font-semibold"
                                                    >
                                                        QR
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <button
                                                    onClick={handleAddToCalendar}
                                                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 font-semibold"
                                                >
                                                    Add to Calendar (.ics)
                                                </button>
                                                <button
                                                    onClick={handleOpenPlayPage}
                                                    className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 font-semibold"
                                                >
                                                    Open Play Page
                                                </button>
                                            </div>
                                        </section>

                                        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

                                        {/* Footer Actions */}
                                        <section className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={handleCreateAnother}
                                                className="rounded-xl border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 px-4 py-3 font-semibold"
                                            >
                                                Create Another
                                            </button>
                                            <button
                                                onClick={handleDashboard}
                                                className="rounded-xl border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 px-4 py-3 font-semibold"
                                            >
                                                Dashboard
                                            </button>
                                        </section>

                                        <p className="text-[11px] text-zinc-500 text-center">
                                            Payments add players to the list automatically.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Players UNDER the card */}
                    {gameId && typeof gameId === "string" && (
                        <section className="w-full mt-6">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-sm font-semibold text-zinc-300">
                                    Players <span className="text-zinc-500">(live)</span>
                                </h2>
                                <span className="text-[11px] text-zinc-500">0 / {game?.maxPlayers ?? 0}</span>
                            </div>
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 backdrop-blur-xl shadow-sm">
                                <PlayerList gameId={gameId as string} />
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}

/* helpers */
function toICS(d: Date) {
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function icsEscape(s: string) {
    return s
        .replace(/\\/g, "\\\\")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;")
        .replace(/\r?\n/g, "\\n");
}
