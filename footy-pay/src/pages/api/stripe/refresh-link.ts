import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { db } from "@/lib/firebaseAdmin"; // Admin SDK import (NOT client SDK)

// Initialise Stripe with correct version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {

});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Missing organiser email" });
    }

    try {
        // Fetch organiser document from Firestore
        const doc = await db.collection("organisers").doc(email).get();
        console.log("📄 Fetched organiser doc:", doc.exists);

        if (!doc.exists) {
            return res.status(404).json({ error: "Organiser not found" });
        }

        const data = doc.data();
        console.log("📦 Organiser data:", data);

        if (!data?.stripeAccountId) {
            return res.status(404).json({ error: "Stripe account ID not found" });
        }

        // Generate a new onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: data.stripeAccountId,
            refresh_url: "http://localhost:3000/create", // Change in production
            return_url: `http://localhost:3000/create?accountId=${data.stripeAccountId}`,
            type: "account_onboarding",
        });

        console.log("✅ Stripe link created:", accountLink.url);

        return res.status(200).json({ url: accountLink.url });
    } catch (error: any) {
        console.error("❌ Stripe Refresh Error:", error.message, error);
        return res.status(500).json({ error: "Stripe link refresh failed" });
    }
}
