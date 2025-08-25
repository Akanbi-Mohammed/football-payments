// src/lib/firebaseAdmin.ts (server-only)
import { getApps, initializeApp, cert, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let _app: App | undefined;
let _db: Firestore | undefined;
let _auth: Auth | undefined;

function getAdminApp(): App {
    if (!_app) {
        const b64 = process.env.FIREBASE_ADMIN_CREDENTIALS;
        if (b64) {
            const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
            if (!getApps().length) {
                _app = initializeApp({
                    credential: cert(json as any),
                    projectId: json.project_id, // pin to your Firebase project
                });
            }
        } else {
            // local fallback if you use GOOGLE_APPLICATION_CREDENTIALS
            if (!getApps().length) {
                _app = initializeApp({ credential: applicationDefault() });
            }
        }
        _app = _app ?? (getApps()[0] as App);
    }
    return _app!;
}

export function getDb(): Firestore {
    if (!_db) _db = getFirestore(getAdminApp());
    return _db;
}

export function getAdminAuth(): Auth {
    if (!_auth) _auth = getAuth(getAdminApp());
    return _auth;
}

export const db = getDb();
export const auth = getAdminAuth();
