"use client";

import { useEffect, useRef } from "react";
import jsQR from "jsqr";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }
}

const SCAN_INTERVAL_MS = 250;

/** Camera QR reader: native BarcodeDetector when available, jsQR on canvas frames otherwise. */
export function QrScanner({
  onResult,
  onError,
  label,
}: {
  onResult: (text: string) => void;
  onError: () => void;
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let done = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;

    async function scan() {
      const video = videoRef.current;
      if (done || !video || video.readyState < 2) {
        timer = setTimeout(scan, SCAN_INTERVAL_MS);
        return;
      }
      let text: string | null = null;
      try {
        if (detector) {
          text = (await detector.detect(video))[0]?.rawValue ?? null;
        } else if (ctx) {
          // Downscale to keep jsQR fast on low-end phones.
          const scale = Math.min(1, 480 / video.videoWidth);
          canvas.width = Math.floor(video.videoWidth * scale);
          canvas.height = Math.floor(video.videoHeight * scale);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          text = jsQR(image.data, image.width, image.height)?.data ?? null;
        }
      } catch {
        text = null;
      }
      if (text) {
        done = true;
        onResult(text);
        return;
      }
      timer = setTimeout(scan, SCAN_INTERVAL_MS);
    }

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
        scan();
      })
      .catch(onError);

    return () => {
      done = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onResult, onError]);

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-black">
      <video ref={videoRef} muted playsInline aria-label={label} className="aspect-square w-full object-cover" />
      <div aria-hidden="true" className="viewfinder pointer-events-none absolute inset-[15%]" />
    </div>
  );
}
