// pages/api/games/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
// Use Admin DB in API routes
import { getDb } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { title, date, price, maxPlayers, organiserEmail } = req.body as {
            title?: string;
            date?: string;
            price?: number | string;
            maxPlayers?: number | string;
            organiserEmail?: string;
        };

        if (!organiserEmail) return res.status(400).json({ error: "Missing organiser email" });
        if (!title) return res.status(400).json({ error: "Missing title" });

        const priceNum = Number(price);
        if (!Number.isFinite(priceNum) || priceNum <= 0) {
            return res.status(400).json({ error: "Invalid price" });
        }

        const maxPlayersNum = Number(maxPlayers ?? 10);
        if (!Number.isInteger(maxPlayersNum) || maxPlayersNum <= 0) {
            return res.status(400).json({ error: "Invalid maxPlayers" });
        }

        const db = getDb();
        const emailDocId = organiserEmail.toLowerCase();
        const organiserSnap = await db.collection("organisers").doc(emailDocId).get();
        if (!organiserSnap.exists) {
            return res.status(400).json({ error: "Organiser not found or not onboarded with Stripe" });
        }

        const { stripeAccountId } = organiserSnap.data() as { stripeAccountId?: string };
        if (!stripeAccountId) {
            return res.status(400).json({ error: "Stripe account not connected" });
        }

        // IMPORTANT: save organiserAccountId so /api/games/pay can route funds
        const gameRef = await db.collection("games").add({
            title,
            date: date ?? null,
            price: priceNum,
            maxPlayers: maxPlayersNum,
            organiserEmail: emailDocId,
            organiserAccountId: stripeAccountId,   // <— matches pay.ts
            createdAt: new Date().toISOString(),
        });

        // Optional: return a shareable link
        const origin =
            process.env.NEXT_PUBLIC_SITE_URL ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
            "http://localhost:3000";

        return res.status(200).json({
            gameId: gameRef.id,
            shareUrl: `${origin}/play/${gameRef.id}`,
        });
    } catch (err: any) {
        console.error("❌ /api/games/create error:", err?.message || err);
        return res.status(500).json({ error: "Failed to create game" });
    }
}
