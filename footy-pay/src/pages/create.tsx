// pages/create.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

/* --- tiny inline icons --- */
function Icon({ d, className = "w-5 h-5" }: { d: string; className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
            <path d={d} />
        </svg>
    );
}

function StripeMark({ className = "h-4" }) {
    return (
        <svg viewBox="0 0 28 11" className={className} aria-hidden>
            <path fill="currentColor" d="M1.7 8.7c0 1.8 1.5 2.3 3 2.3.7 0 1.3-.1 1.9-.3V9.3c-.6.2-1.2.3-1.8.3-.5 0-1.1-.1-1.1-.7 0-1.4 3.5-.6 3.5-3.1 0-1.6-1.4-2.3-2.9-2.3-.8 0-1.5.1-2.2.3v1.6C2.6 5.2 3.2 5 3.9 5c.5 0 1.1.1 1.1.7 0 1.3-3.3.5-3.3 3Z"/>
            <path fill="currentColor" d="M11.1 1.9 9 2.5v7.9l2.1-.5V1.9Z"/>
            <path fill="currentColor" d="M14.4 6.3c0-1 .9-1.4 1.8-1.4.6 0 1.1.1 1.7.3V3.7c-.6-.2-1.2-.3-1.8-.3-2 0-3.7 1.1-3.7 3.5 0 2.3 1.6 3.4 3.6 3.4.6 0 1.3-.1 1.9-.3V8.2c-.5.2-1.1.3-1.6.3-1 0-1.9-.4-1.9-1.6Z"/>
            <path fill="currentColor" d="M23.5 3.5c-.6 0-1.3.1-1.8.3V1.9l-2.1.5v8l2.1.5V5.6c.3-.2.8-.3 1.2-.3.7 0 1 .3 1 .9v4.7l2.1.5V6.3c0-1.9-1.1-2.8-2.5-2.8Z"/>
        </svg>
    );
}

/* --- page --- */
export default function CreateGamePage() {
    const router = useRouter();

    // Stripe state
    const [stripeConnected, setStripeConnected] = useState(false);
    const [lockedEmail, setLockedEmail] = useState<string>("");

    // Form state
    const [organiserEmail, setOrganiserEmail] = useState("");
    const [form, setForm] = useState({
        title: "",
        location: "",
        date: "",
        time: "",
        price: 5,
        maxPlayers: 10,
    });

    // UI state
    const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
    const emailLocked = stripeConnected && !!lockedEmail;

    /* ---------- bootstrap from query/localStorage ---------- */
    useEffect(() => {
        const qs = new URLSearchParams(window.location.search);
        const connected = qs.get("accountId");

        const storedEmail = localStorage.getItem("organiserEmail") || "";
        if (storedEmail) setOrganiserEmail(storedEmail);

        const storedStripe = localStorage.getItem("stripeConnected") === "true";
        const storedStripeEmail = localStorage.getItem("stripeEmail") || "";

        if (connected) {
            setStripeConnected(true);
            localStorage.setItem("stripeConnected", "true");

            const emailToLock = storedEmail || organiserEmail;
            if (emailToLock) {
                localStorage.setItem("stripeEmail", emailToLock);
                setLockedEmail(emailToLock);
                setOrganiserEmail(emailToLock);
            }

            // clean the query
            window.history.replaceState({}, "", "/create");
        } else if (storedStripe) {
            setStripeConnected(true);
            if (storedStripeEmail) {
                setLockedEmail(storedStripeEmail);
                setOrganiserEmail(storedStripeEmail);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---------- handlers ---------- */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        if (name === "organiserEmail") {
            if (emailLocked) return; // locked after connect
            setOrganiserEmail(value);
            localStorage.setItem("organiserEmail", value);
        } else {
            setForm((p) => ({ ...p, [name]: type === "number" ? Number(value) : value }));
        }
    };

    const handleStripeConnect = async () => {
        if (!organiserEmail) return alert("Please enter organiser email before connecting.");
        localStorage.setItem("organiserEmail", organiserEmail);

        const res = await fetch("/api/stripe/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: organiserEmail }),
        });
        const data = await res.json();
        if (!data.url) return alert("Stripe URL is undefined. Check backend.");
        window.location.href = data.url;
    };

    const handleStripeRefresh = async () => {
        const res = await fetch("/api/stripe/refresh-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: organiserEmail }),
        });
        const data = await res.json();
        if (!data.url) return alert("Refresh link failed. Try again.");
        window.location.href = data.url;
    };

    const confirmUseDifferentEmail = () => setShowUnlockConfirm(true);
    const cancelUseDifferentEmail = () => setShowUnlockConfirm(false);
    const doUseDifferentEmail = () => {
        localStorage.removeItem("stripeConnected");
        localStorage.removeItem("stripeEmail");
        setStripeConnected(false);
        setLockedEmail("");
        setShowUnlockConfirm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripeConnected) return alert("Please connect your bank with Stripe first.");

        const res = await axios.post("/api/games/create", { ...form, organiserEmail });
        const gameId = res.data?.gameId;
        if (!gameId) throw new Error("No gameId returned");
        router.push(`/admin/share/${gameId}`);
    };

    /* ---------- UI ---------- */
    return (
        <main className="min-h-screen w-full text-white bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,.10),transparent_70%),linear-gradient(to_br,#0a0a0b,#0b0b0c)] flex items-center justify-center px-4 py-12">
            <div className="relative w-full max-w-2xl">
                {/* ambient glow */}
                <div className="absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-tr from-blue-500/15 via-purple-500/15 to-emerald-500/15 blur-2xl" />

                <div className="rounded-[28px] border border-zinc-800/90 bg-zinc-950/60 backdrop-blur-xl shadow-2xl">
                    {/* header */}
                    <header className="px-7 sm:px-9 pt-8 pb-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                <span className="inline-grid place-items-center w-11 h-11 rounded-2xl bg-blue-600 shadow">
                  <Icon
                      d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.3 6.4-2.2-.8-1.1-2.1c1.3.1 2.6.6 3.6 1.5.1.5-.1 1-.3 1.4ZM9 5.6 7.9 7.6l-2.2.8c-.2-.4-.4-.9-.4-1.4A6.9 6.9 0 0 1 9 5.6Zm-3.7 9.8c-.7-1-.1-2.6 1.4-3.2l1.9-.8 1-1.9c.6-.2 1.4-.2 2 0l1 1.9 2 .8c1.5.6 2.1 2.2 1.4 3.2-.9 1.4-3.1 2.7-4.9 2.7-1.9 0-4-1.3-4.8-2.7Z"
                      className="w-6 h-6 text-white"
                  />
                </span>
                                <div>
                                    <h1 className="text-2xl font-extrabold tracking-tight">Create Game</h1>
                                    <p className="text-sm text-zinc-400">Set the details, connect Stripe, and share your join link.</p>
                                </div>
                            </div>


                        </div>
                    </header>

                    {/* body */}
                    <div className="px-7 sm:px-9 pb-9 space-y-6">
                        {/* payouts + organiser email */}
                        <section
                            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/55 p-5 sm:p-6 shadow-inner backdrop-blur-sm">
                            {/* Top row: title + status */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
        <span className="inline-grid place-items-center w-6 h-6 rounded-lg bg-emerald-600/15 text-emerald-300">
          {/* shield/lock glyph */}
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path
                d="M12 2 5 5v6c0 5 3.1 8.3 7 9 3.9-.7 7-4 7-9V5l-7-3Zm0 4 5 2v3c0 3.9-2.1 6.6-5 7.4-2.9-.8-5-3.5-5-7.4V8l5-2Z"/></svg>
        </span>
                                        <h3 className="text-[15px] font-semibold">Payouts & organiser email</h3>
                                    </div>
                                    <p className="text-[13px] leading-relaxed text-zinc-400 max-w-lg">
                                        Link your <span className="text-zinc-200 font-medium">bank account</span> via
                                        Stripe. This email ties payouts and your organiser dashboard together.
                                    </p>
                                </div>

                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border
        ${stripeConnected
                                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                                        : "border-zinc-700 bg-zinc-800/70 text-zinc-300"}`}
                                >
      {stripeConnected ? (
          <>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M9 12.8 6.7 10.5l-1.4 1.4L9 15.6l9-9-1.4-1.4z"/>
              </svg>
              Connected
          </>
      ) : (
          <>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                  <path
                      d="M12 2a5 5 0 0 1 5 5v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v2h6V7a3 3 0 0 0-3-3Z"/>
              </svg>
              Not connected
          </>
      )}
    </span>
                            </div>

                            {/* Email field */}
                            <div className="mt-4">
                                <label className="block text-[11px] font-semibold tracking-wide text-zinc-400 mb-1">Organiser
                                    email</label>
                                <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="currentColor">
          <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Zm2 .5 8 5 8-5"/>
        </svg>
      </span>
                                    <input
                                        type="email"
                                        name="organiserEmail"
                                        value={organiserEmail}
                                        onChange={handleChange}
                                        placeholder="you@example.com"
                                        className={`w-full pl-10 pr-28 sm:pr-32 py-2.5 rounded-xl border text-sm bg-zinc-900/70 placeholder-zinc-500 text-white
          focus:outline-none focus:ring-2 focus:ring-emerald-500 transition
          ${emailLocked ? "border-emerald-400/50 opacity-90 cursor-not-allowed" : "border-zinc-700"}`}
                                        disabled={emailLocked}
                                        autoComplete="email"
                                        required
                                    />
                                    {emailLocked && (
                                        <span
                                            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-400/30">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path
              d="M12 2 5 5v6c0 5 3.1 8.3 7 9 3.9-.7 7-4 7-9V5l-7-3Z"/></svg>
          Locked to Stripe
        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {stripeConnected ? (
                                        <>
                                            <button
                                                onClick={handleStripeRefresh}
                                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold transition"
                                                title="Update your bank in Stripe"
                                            >
                                                Update bank
                                            </button>
                                            <button
                                                onClick={confirmUseDifferentEmail}
                                                className="rounded-xl border border-zinc-700 bg-zinc-900/70 hover:bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition"
                                            >
                                                Use different email
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleStripeConnect}
                                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold transition"
                                        >
                                            Connect bank with Stripe
                                        </button>
                                    )}
                                </div>

                                {/* security note */}
                                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                    {/* Stripe mark substitute */}
                                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                                        <circle cx="12" cy="12" r="10"/>
                                    </svg>
                                    <span>
        {stripeConnected
            ? "Your bank is securely linked via Stripe"
            : "You’ll be redirected to Stripe to connect your account"}
      </span>
                                </div>
                            </div>

                            {/* subtle divider + dashboard link */}
                            <div className="mt-4 pt-3 border-t border-zinc-800/70">
                                {organiserEmail ? (
                                    <p className="text-[11px] text-zinc-500">
                                        View your games at{" "}
                                        <a href={`/admin/dashboard?email=${encodeURIComponent(organiserEmail)}`}
                                           className="underline underline-offset-4 hover:text-zinc-300">
                                            your organiser dashboard ↗
                                        </a>
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-zinc-500">Enter your email to see your organiser
                                        dashboard link.</p>
                                )}
                            </div>
                        </section>


                        {/* game form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold tracking-wide text-zinc-400 mb-2">GAME
                                    TITLE</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="5-a-side at Kelvinhall"
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label
                                    className="block text-xs font-semibold tracking-wide text-zinc-400 mb-2">LOCATION</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={form.location}
                                    onChange={handleChange}
                                    placeholder="GHA — Kelvinhall, Glasgow"
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        className="block text-xs font-semibold tracking-wide text-zinc-400 mb-2">DATE</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={form.date}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-xs font-semibold tracking-wide text-zinc-400 mb-2">TIME</label>
                                    <input
                                        type="time"
                                        name="time"
                                        value={form.time}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold tracking-wide text-zinc-400 mb-2">PRICE
                                        (GBP)</label>
                                    <input
                                        type="number"
                                        name="price"
                                        min={0}
                                        value={form.price}
                                        onChange={handleChange}
                                        placeholder="5"
                                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold tracking-wide text-zinc-400 mb-2">MAX
                                        PLAYERS</label>
                                    <input
                                        type="number"
                                        name="maxPlayers"
                                        min={1}
                                        value={form.maxPlayers}
                                        onChange={handleChange}
                                        placeholder="10"
                                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={!stripeConnected}
                                    className={`w-full rounded-2xl px-4 py-3 font-semibold shadow-lg transition ${
                                        stripeConnected
                                            ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                            : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                    }`}
                                    title={!stripeConnected ? "Connect Stripe to continue" : "Create game"}
                                >
                                    Create & Get Link
                                </button>
                                <p className="mt-2 text-[11px] text-zinc-500 text-center">
                                    We’ll generate a shareable join link. Players pay with Stripe Checkout and are added
                                    to your list
                                    automatically.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>

                {/* custom confirm modal */}
                {showUnlockConfirm && (
                    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
                        <div
                            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 shadow-2xl">
                            <h3 className="text-lg font-semibold mb-2">Use a different email?</h3>
                            <p className="text-sm text-zinc-400">
                                This will unlink your current Stripe connection on this device. You’ll need to connect
                                again with the new
                                email.
                            </p>
                            <div className="mt-5 flex gap-3 justify-end">
                                <button
                                    onClick={cancelUseDifferentEmail}
                                    className="rounded-xl border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 px-4 py-2.5 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={doUseDifferentEmail}
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 font-semibold"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
