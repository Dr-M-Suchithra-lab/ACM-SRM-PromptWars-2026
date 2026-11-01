import { useEffect, useRef, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { Button } from "./ui/button";
import type { Language } from "../i18n";
import { selectSpeechVoice, speechLocale } from "../lib/speech";

const messages = {
  en: {
    stop: "Stop speech",
    unavailable:
      "Speech is unavailable in this browser. You can continue reading the text.",
    missing:
      "No English voice is available yet. Enable an English voice in your device settings, then try again.",
    ready:
      "Read aloud uses your browser's English voice. Your device controls voice processing.",
    playing: "Reading aloud…",
    stopped: "Speech stopped.",
    finished: "Reading finished.",
    failed:
      "Speech could not play. Check your device voice and sound settings, then try again.",
  },
  ta: {
    stop: "வாசிப்பை நிறுத்து",
    unavailable:
      "இந்த உலாவியில் குரல் வசதி இல்லை. உரையைத் தொடர்ந்து படிக்கலாம்.",
    missing:
      "தமிழ் குரல் இன்னும் கிடைக்கவில்லை. சாதன அமைப்புகளில் தமிழ் குரலை இயக்கி மீண்டும் முயலவும்.",
    ready:
      "உலாவியின் தமிழ் குரல் பயன்படுத்தப்படும். குரல் செயலாக்கத்தை உங்கள் சாதனம் கட்டுப்படுத்துகிறது.",
    playing: "வாசிக்கிறது…",
    stopped: "வாசிப்பு நிறுத்தப்பட்டது.",
    finished: "வாசிப்பு முடிந்தது.",
    failed:
      "குரலை இயக்க முடியவில்லை. சாதனத்தின் குரல் மற்றும் ஒலி அமைப்புகளைச் சரிபார்த்து மீண்டும் முயலவும்.",
  },
  hi: {
    stop: "पढ़ना रोकें",
    unavailable:
      "इस ब्राउज़र में आवाज़ उपलब्ध नहीं है। आप पाठ पढ़ना जारी रख सकते हैं।",
    missing:
      "हिंदी की आवाज़ अभी उपलब्ध नहीं है। डिवाइस की सेटिंग में हिंदी आवाज़ चालू करें और फिर कोशिश करें।",
    ready:
      "ब्राउज़र की हिंदी आवाज़ का उपयोग होगा। आवाज़ की प्रोसेसिंग आपका डिवाइस नियंत्रित करता है।",
    playing: "पढ़ा जा रहा है…",
    stopped: "पढ़ना रोक दिया गया।",
    finished: "पढ़ना पूरा हुआ।",
    failed:
      "आवाज़ नहीं चल सकी। डिवाइस की आवाज़ और ध्वनि सेटिंग जाँचें और फिर कोशिश करें।",
  },
};

export function ReadAloud({
  text,
  language,
  label,
}: {
  text: string;
  language: Language;
  label: string;
}) {
  const copy = messages[language];
  const [available, setAvailable] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("");
  // Retain the utterance while speaking; some browsers otherwise stop early.
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setPlaying(false);
    setStatus("");
    let synth: SpeechSynthesis;
    try {
      if (
        !window.speechSynthesis ||
        typeof window.SpeechSynthesisUtterance !== "function"
      ) {
        setAvailable(false);
        return;
      }
      synth = window.speechSynthesis;
      setAvailable(true);
    } catch {
      setAvailable(false);
      return;
    }
    const updateVoices = () => {
      try {
        setHasVoice(!!selectSpeechVoice(synth.getVoices(), language));
      } catch {
        setHasVoice(false);
      }
    };
    updateVoices();
    synth.addEventListener("voiceschanged", updateVoices);
    return () => {
      synth.removeEventListener("voiceschanged", updateVoices);
      const utterance = current.current;
      current.current = null;
      if (utterance) {
        utterance.onend = utterance.onerror = utterance.onstart = null;
        try {
          synth.cancel();
        } catch {
          /* Text remains available. */
        }
      }
    };
  }, [language, text]);

  function stop() {
    const utterance = current.current;
    current.current = null;
    if (utterance)
      utterance.onend = utterance.onerror = utterance.onstart = null;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* Clear the UI even if the browser's speech service failed. */
    }
    setPlaying(false);
    setStatus(copy.stopped);
  }

  function play() {
    try {
      const synth = window.speechSynthesis;
      const voice = selectSpeechVoice(synth.getVoices(), language);
      setHasVoice(!!voice);
      if (!voice) {
        setStatus(copy.missing);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLocale[language];
      utterance.voice = voice;
      current.current = utterance;
      utterance.onstart = () => {
        if (current.current === utterance) setStatus(copy.playing);
      };
      utterance.onend = () => {
        if (current.current !== utterance) return;
        current.current = null;
        setPlaying(false);
        setStatus(copy.finished);
      };
      utterance.onerror = () => {
        if (current.current !== utterance) return;
        current.current = null;
        setPlaying(false);
        setStatus(copy.failed);
      };
      synth.cancel();
      setStatus(copy.playing);
      setPlaying(true);
      synth.speak(utterance);
    } catch {
      current.current = null;
      setPlaying(false);
      setStatus(copy.failed);
    }
  }

  return (
    <div className="speech-controls">
      {available && (
        <Button variant="outline" onClick={playing ? stop : play}>
          {playing ? <Square size={16} /> : <Volume2 size={16} />}
          {playing ? copy.stop : label}
        </Button>
      )}
      <p className="muted" role="status" aria-live="polite">
        {status ||
          (!available
            ? copy.unavailable
            : hasVoice
              ? copy.ready
              : copy.missing)}
      </p>
    </div>
  );
}
