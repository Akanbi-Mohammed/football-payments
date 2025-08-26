// pages/api/games/pay.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/firebase"; // ok for now; prefer admin in API
import { doc, getDoc } from "firebase/firestore";

type Game = {
    title: string;
    price: number;
    organiserAccountId?: string;
    organiserEmail?: string;
};

function origin(req: NextApiRequest) {
    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
        (req.headers.origin as string) ||
        "http://localhost:3000"
    );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

    try {
        const { gameId, name } = req.body as { gameId?: string; name?: string };
        if (!gameId || !name) return res.status(400).json({ error: "Missing fields" });

        const snap = await getDoc(doc(db, "games", String(gameId)));
        if (!snap.exists()) return res.status(404).json({ error: "Game not found" });
        const game = snap.data() as Game;

        const amountPence = Math.round(Number(game.price) * 100);
        if (!Number.isFinite(amountPence) || amountPence <= 0) {
            return res.status(400).json({ error: "Invalid price" });
        }

        // Resolve organiser account id
        let organiserAccountId = game.organiserAccountId;
        if (!organiserAccountId && game.organiserEmail) {
            const orgSnap = await getDoc(doc(db, "organisers", String(game.organiserEmail)));
            organiserAccountId = (orgSnap.data() as any)?.stripeAccountId;
        }
        if (!organiserAccountId) {
            return res.status(409).json({
                error: "Organiser not onboarded",
                reason: "No stripeAccountId on game or organisers doc",
            });
        }

        // Check account status
        const acct = await stripe.accounts.retrieve(organiserAccountId);

        if (!acct.charges_enabled || !acct.payouts_enabled) {
            // Hand back an onboarding link so the UI can redirect
            const url = origin(req);
            const link = await stripe.accountLinks.create({
                account: organiserAccountId,
                type: "account_onboarding",
                refresh_url: `${url}/create?accountId=${organiserAccountId}`,
                return_url: `${url}/create?accountId=${organiserAccountId}`,
                collect: "currently_due",
            });

            return res.status(409).json({
                error: "Organiser account restricted or payouts disabled",
                accountId: organiserAccountId,
                charges_enabled: acct.charges_enabled,
                payouts_enabled: acct.payouts_enabled,
                currently_due: acct.requirements?.currently_due ?? [],
                onboardingUrl: link.url,
            });
        }

        // Create destination-charge Checkout session
        const session = await stripe.checkout.sessions.create(
            {
                mode: "payment",
                client_reference_id: String(gameId),
                metadata: { gameId: String(gameId), name: String(name) },
                line_items: [
                    {
                        price_data: {
                            currency: "gbp",
                            product_data: { name: game.title },
                            unit_amount: amountPence,
                        },
                        quantity: 1,
                    },
                ],
                payment_intent_data: {
                    on_behalf_of: organiserAccountId,
                    transfer_data: { destination: organiserAccountId },
                    transfer_group: `game_${gameId}`,
                    // application_fee_amount: 0, // set if you charge a fee
                },
                success_url: `${origin(req)}/play/${gameId}?success=1&name=${encodeURIComponent(
                    name
                )}&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${origin(req)}/play/${gameId}?canceled=1`,
            },
            { idempotencyKey: `pay:${gameId}:${name}:${amountPence}` }
        );

        return res.status(200).json({ checkoutUrl: session.url });
    } catch (err: any) {
        console.error("❌ /api/games/pay error:", err?.message || err);
        return res.status(500).json({ error: "Failed to create checkout session" });
    }
}
