// pages/api/stripe/add-player-from-session.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

    try {
        const { session_id, gameId } = req.body as { session_id?: string; gameId?: string };
        if (!session_id || !gameId) return res.status(400).json({ error: "Missing fields" });

        const session = await stripe.checkout.sessions.retrieve(session_id);
        if (!session || session.payment_status !== "paid") {
            return res.status(400).json({ error: "Session not paid" });
        }

        const name = String(session.metadata?.name || "").trim();
        const game = String(session.metadata?.gameId || gameId);
        if (!name || !game) return res.status(400).json({ error: "Invalid session metadata" });

        const playersRef = collection(db, "games", game, "players");

        // Idempotency: prevent duplicates by (name) and/or by session id
        const existingByName = await getDocs(query(playersRef, where("name", "==", name)));
        if (existingByName.empty) {
            await addDoc(playersRef, {
                name,
                sessionId: session.id,
                joinedAt: serverTimestamp(),
            });
        }

        return res.status(200).json({ ok: true });
    } catch (err: any) {
        console.error("❌ add-player-from-session error:", err?.message || err);
        return res.status(500).json({ error: "Failed to add player from session" });
    }
}
