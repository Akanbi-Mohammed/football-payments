// pages/api/stripe/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// Stripe needs the raw body to verify the signature
export const config = { api: { bodyParser: false } };

function buffer(readable: any) {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        readable.on("data", (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        readable.on("end", () => resolve(Buffer.concat(chunks)));
        readable.on("error", reject);
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const sig = req.headers["stripe-signature"] as string | undefined;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
        console.error("Missing STRIPE_WEBHOOK_SECRET");
        return res.status(500).send("Server not configured");
    }

    let event;
    try {
        const buf = await buffer(req);
        event = stripe.webhooks.constructEvent(buf, sig!, endpointSecret);
    } catch (err: any) {
        console.error("⚠️  Webhook signature verification failed:", err?.message || err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as any; // Stripe.Checkout.Session
                const sessionId = session.id as string;

                // you put these in metadata when creating the Checkout Session
                const { gameId, name, spots } = (session.metadata || {}) as {
                    gameId?: string;
                    name?: string;
                    spots?: string;
                };

                if (!gameId) {
                    console.warn("checkout.session.completed without gameId metadata");
                    break;
                }

                const playerDoc = doc(db, "games", String(gameId), "players", sessionId);
                await setDoc(
                    playerDoc,
                    {
                        name: name ?? session.customer_details?.name ?? "Anonymous",
                        email: session.customer_details?.email ?? null,
                        spots: Number(spots ?? 1),
                        joinedAt: serverTimestamp(),
                        paidAt: serverTimestamp(), // ← the key bit
                        // keep a breadcrumb if you like
                        stripeSessionId: sessionId,
                    },
                    { merge: true } // idempotent: safe on retries
                );
                break;
            }

            // (optional) handle refunds, payment_failed, etc. as needed

            default:
                // ignore other events
                break;
        }

        return res.json({ received: true });
    } catch (err: any) {
        console.error("❌ Webhook handler error:", err?.message || err);
        return res.status(500).json({ error: "Webhook handler failed" });
    }
}
