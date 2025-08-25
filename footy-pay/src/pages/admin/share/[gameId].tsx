import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { WhatsappShareButton, WhatsappIcon, FacebookShareButton, FacebookIcon, TwitterShareButton, TwitterIcon } from "react-share";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminSharePage() {
    const router = useRouter();
    const { gameId } = router.query;
    const [gameLink, setGameLink] = useState("");

    useEffect(() => {
        if (gameId) {
            const url = `${process.env.NEXT_PUBLIC_SITE_URL}/play/${gameId}`;
            setGameLink(url);

            // ✅ Automatically trigger WhatsApp share after redirect
            const whatsapp = document.getElementById("autoWhatsapp") as HTMLElement;
            setTimeout(() => whatsapp?.click(), 300);
        }
    }, [gameId]);

    const handleCopy = async () => {
        if (gameLink) {
            await navigator.clipboard.writeText(gameLink);
            toast.success("Link copied to clipboard! ✅");
        }
    };

    return (
        <main className="flex items-center justify-center min-h-screen bg-gray-100">
            <ToastContainer />
            <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 text-center">
                <h1 className="text-2xl font-bold mb-2">🎉 Game Created!</h1>
                <p className="mb-4">Share this link with your players to let them join:</p>

                <input
                    readOnly
                    value={gameLink}
                    className="w-full p-2 border rounded mb-2"
                />
                <button
                    onClick={handleCopy}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full p-2 rounded font-semibold mb-4"
                >
                    📋 Copy Link
                </button>

                <div className="flex justify-center gap-4">
                    <WhatsappShareButton url={gameLink} title="Join our football match! ⚽" id="autoWhatsapp">
                        <WhatsappIcon size={40} round />
                    </WhatsappShareButton>
                    <FacebookShareButton url={gameLink}>
                        <FacebookIcon size={40} round />
                    </FacebookShareButton>
                    <TwitterShareButton url={gameLink} title="Join our football match! ⚽">
                        <TwitterIcon size={40} round />
                    </TwitterShareButton>
                </div>
            </div>
        </main>
    );
}
