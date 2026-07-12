import type { Metadata } from "next";
import { LimitDropGame } from "@/components/games/limit-drop-game";

export const metadata: Metadata = {
  title: "Limit Drop | Clascade",
  description: "Draw functions, drop the egg, and land it in the basket.",
};

export default function LimitDropPage() {
  return <LimitDropGame />;
}
