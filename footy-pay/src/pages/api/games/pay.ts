// pages/api/games/pay.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

    try {
        const { gameId, name } = req.body as { gameId?: string; name?: string };
        if (!gameId || !name) return res.status(400).json({ error: "Missing fields" });

        // Load game (to get price/title)
        const snap = await getDoc(doc(db, "games", String(gameId)));
        if (!snap.exists()) return res.status(404).json({ error: "Game not found" });

        const game = snap.data() as { title: string; price: number };
        const amountPence = Math.round(Number(game.price) * 100);

        const session = await stripe.checkout.sessions.create(
            {
                mode: "payment",
                payment_method_types: ["card"],
                client_reference_id: String(gameId),
                metadata: {
                    gameId: String(gameId),
                    name: String(name),
                },
                line_items: [
                    {
                        price_data: {
                            currency: "gbp",
                            product_data: { name: game.title },
                            unit_amount: amountPence, // integer pence
                        },
                        quantity: 1,
                    },
                ],
                success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/play/${gameId}?success=1&name=${encodeURIComponent(
                    name
                )}&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/play/${gameId}?canceled=1`,
            },
            // Optional but useful to avoid accidental duplicate sessions per name+game
            { idempotencyKey: `pay:${gameId}:${name}` }
        );

        return res.status(200).json({ checkoutUrl: session.url });
    } catch (err: any) {
        console.error("❌ /api/games/pay error:", err?.message || err);
        return res.status(500).json({ error: "Failed to create checkout session" });
    }
}
