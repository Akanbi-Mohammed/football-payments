import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import {
    doc,
    onSnapshot,
    collection,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import axios from "axios";

export default function GamePage() {
    const router = useRouter();
    const { gameId, success, name: queryName, session_id } = router.query;

    const [game, setGame] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [name, setName] = useState("");
    const [justJoined, setJustJoined] = useState(false);
    const isSuccess =
        success === "1" || success === "true" || success === "yes";

    // Subscribe to game + players in real-time
    useEffect(() => {
        if (!gameId || typeof gameId !== "string") return;

        const gameRef = doc(db, "games", gameId);
        const unsubGame = onSnapshot(gameRef, (snap) => {
            if (snap.exists()) setGame(snap.data());
        });

        const playersRef = collection(db, "games", gameId, "players");
        const unsubPlayers = onSnapshot(playersRef, (snap) => {
            setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubGame();
            unsubPlayers();
        };
    }, [gameId]);

    // After Stripe redirect: verify the session server-side and add player (idempotent)
    useEffect(() => {
        if (!router.isReady) return;
        if (!gameId || typeof gameId !== "string") return;
        if (!isSuccess || !session_id) return;

        const run = async () => {
            try {
                await fetch("/api/stripe/add-player-from-session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id, gameId }),
                });
                setJustJoined(true);
                // Optional: clean the URL so refresh doesn't re-trigger
                // router.replace(`/play/${gameId}`, undefined, { shallow: true });
            } catch (e) {
                console.error("Failed to verify session/add player", e);
            }
        };
        run();
    }, [router.isReady, gameId, isSuccess, session_id]);

    const handleJoin = async () => {
        if (!name) return;
        const res = await axios.post("/api/games/pay", { gameId, name });
        router.push(res.data.checkoutUrl);
    };

    // Nice date/time string
    const displayDate = useMemo(() => {
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
            return `${game.date}${game.time ? ` • ${game.time}` : ""}`;
        }
    }, [game?.date, game?.time]);

    if (!game) {
        return (
            <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black px-4 py-10 text-white">
                <p className="text-zinc-400">Loading…</p>
            </main>
        );
    }

    const max = Math.max(1, Number(game.maxPlayers) || 1);
    const pct = Math.min(100, Math.max(0, Math.round((players.length / max) * 100)));
    const soldOut = players.length >= max;

    return (
        <main className="min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-black flex items-center justify-center px-4 py-12 text-white">
            <div className="relative w-full max-w-lg">
                {/* subtle glow */}
                <div className="absolute -inset-3 -z-10 rounded-[28px] bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-emerald-500/20 blur-2xl" />

                {/* card */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl shadow-2xl p-7">
                    {/* header row */}
                    <div className="flex items-start justify-between gap-3">
                        <h1 className="text-2xl font-extrabold tracking-tight">{game.title}</h1>
                    </div>

                    {/* meta */}
                    <div className="mt-3 space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-zinc-300">
                            <span className="opacity-80">🗓️</span>
                            <span>{displayDate}</span>
                        </div>
                        {game.location && (
                            <div className="flex items-center gap-2 text-zinc-300">
                                <span className="opacity-80">📍</span>
                                <span>{game.location}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-zinc-300">
                            <span className="opacity-80">💰</span>
                            <span>£{Number(game.price).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* divider */}
                    <div className="my-5 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

                    {/* capacity */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                            <span>Spots</span>
                            <span>{players.length} / {max}</span>
                        </div>
                        <div className="h-2 rounded-xl bg-zinc-800 overflow-hidden">
                            <div
                                className="h-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 transition-[width] duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>

                    {/* “you’re in” banner */}
                    {justJoined && queryName && (
                        <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 text-sm px-3 py-2 text-center">
                            🎉 <strong>{decodeURIComponent(String(queryName))}</strong>, you’re in the game!
                        </div>
                    )}

                    {/* name + CTA */}
                    <div className="mt-4">
                        <label className="block text-xs font-semibold tracking-wide text-zinc-400 mb-2">
                            YOUR NAME
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Mohammed"
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/70 px-3 py-2.5 pr-12 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">👤</span>
                        </div>

                        <button
                            onClick={handleJoin}
                            disabled={!name || soldOut}
                            className={`mt-4 w-full rounded-xl px-4 py-3 font-semibold shadow-lg transition ${
                                soldOut
                                    ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                    : name
                                        ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
                                        : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                            }`}
                        >
                            {soldOut ? "Sold out" : "Pay & Join"}
                        </button>
                    </div>

                    {/* players */}
                    <div className="mt-6">
                        <h2 className="text-sm font-semibold text-zinc-200 mb-2">Confirmed Players</h2>
                        {players.length === 0 ? (
                            <p className="text-sm text-zinc-500">No players yet.</p>
                        ) : (
                            <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/40">
                                {players.map((p: any) => (
                                    <li key={p.id || p.name} className="px-4 py-2.5 text-sm text-zinc-200">
                                        {p.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
