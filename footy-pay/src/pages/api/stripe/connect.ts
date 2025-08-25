// pages/api/stripe/create-or-onboard.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const config = { runtime: "nodejs" };

function getDb() {
    if (!getApps().length) {
        const b64 = process.env.FIREBASE_ADMIN_CREDENTIALS;
        if (b64) {
            const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
            initializeApp({ credential: cert(json as any), projectId: json.project_id });
        }
    }
    return getFirestore();
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function baseUrl(req: NextApiRequest) {
    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
        (req.headers.origin as string) ||
        "http://localhost:3000"
    );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { email, accountId: provided } = (req.body ?? {}) as { email?: string; accountId?: string };
        if (!email && !provided) return res.status(400).json({ error: "Provide organiser email or accountId" });

        const db = getDb();

        // Reuse existing account if we have it stored
        let accountId = provided;
        if (!accountId && email) {
            const snap = await db.collection("organisers").doc(email).get();
            accountId = (snap.data() as any)?.stripeAccountId;
        }

        // Create only if none exists
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: "express",
                email,
                business_type: "individual",
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });
            accountId = account.id;

            if (email) {
                await db.collection("organisers").doc(email).set(
                    {
                        email,
                        stripeAccountId: accountId,
                        createdAt: new Date().toISOString(),
                    },
                    { merge: true },
                );
            }
        }

        // Always return an onboarding link (to complete any remaining requirements)
        const url = baseUrl(req);
        const link = await stripe.accountLinks.create({
            account: accountId!,
            type: "account_onboarding",
            refresh_url: `${url}/create?accountId=${accountId}`,
            return_url: `${url}/create?accountId=${accountId}`,
            collect: "currently_due",
        });

        // Also return status so UI can show if restricted/enabled
        const acct = await stripe.accounts.retrieve(accountId!);

        return res.status(200).json({
            accountId,
            url: link.url,
            status: {
                charges_enabled: acct.charges_enabled,
                payouts_enabled: acct.payouts_enabled,
                currently_due: acct.requirements?.currently_due ?? [],
                disabled_reason: acct.requirements?.disabled_reason ?? null,
            },
        });
    } catch (err: any) {
        console.error("create-or-onboard error:", err);
        return res.status(500).json({ error: err?.raw?.message || err?.message || "Unknown error" });
    }
}
