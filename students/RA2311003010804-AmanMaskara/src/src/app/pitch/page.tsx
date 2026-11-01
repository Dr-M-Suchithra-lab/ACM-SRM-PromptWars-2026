import type { Metadata } from "next";
import { Deck } from "./deck";

export const metadata: Metadata = {
  title: "FairShift — Pitch",
  description: "FairShift: fair work, fair pay, your voice. Prompt Wars 2026 × ACM SRMIST, UN SDG 8.",
};

export default function PitchPage() {
  return <Deck />;
}
