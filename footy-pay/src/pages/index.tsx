import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/create"); // or "/play/123", "/admin/dashboard", etc.
  }, [router]);
  return null;
}
