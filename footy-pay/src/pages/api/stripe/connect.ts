import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const config = { runtime: "nodejs" };

function getDb() {
    try {
        if (!getApps().length) {
            const b64 = process.env.FIREBASE_ADMIN_CREDENTIALS;
            if (b64) {
                const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
                initializeApp({ credential: cert(json as any), projectId: json.project_id });
            }
        }
        return getFirestore();
    } catch {
        return undefined;
    }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-07-30.basil" });

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
        const { email, accountId: existing } = (req.body ?? {}) as { email?: string; accountId?: string };
        if (!email && !existing) return res.status(400).json({ error: "Provide organiser email or accountId" });

        let accountId = existing;
        if (!accountId) {
            const account = await stripe.accounts.create({ type: "express", email, business_type: "individual" });
            accountId = account.id;

            const db = getDb();
            if (db && email) {
                try {
                    await db
                        .collection("organisers")
                        .doc(email)
                        .set({ email, stripeAccountId: accountId, createdAt: new Date().toISOString() }, { merge: true });
                } catch {}
            }
        }

        const url = baseUrl(req);
        const link = await stripe.accountLinks.create({
            account: accountId!,
            type: "account_onboarding",
            refresh_url: `${url}/create?accountId=${accountId}`,
            return_url: `${url}/create?accountId=${accountId}`,
            collect: "currently_due",
        });

        return res.status(200).json({ url: link.url, accountId });
    } catch (err: any) {
        return res.status(500).json({ error: err?.raw?.message || err?.message || "Unknown error" });
    }
}
