// lib/firebaseAdmin.ts
import * as admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: serviceAccount.project_id,
    });
}

export const db = admin.firestore();
export const auth = admin.auth();
