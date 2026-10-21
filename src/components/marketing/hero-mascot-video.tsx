"use client";

import { useEffect, useRef, useState } from "react";

const POSTER_SRC = "/images/lessonova-mascot-poster.png";
const WEBM_SRC = "/videos/lessonova-mascot-transparent.webm";

function prefersReducedMotion() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function canPlayTransparentWebm() {
  if (typeof document === "undefined") {
    return false;
  }
  const video = document.createElement("video");
  const result = video.canPlayType('video/webm; codecs="vp9"');
  return result === "probably" || result === "maybe";
}

export function HeroMascotVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const webmOk = canPlayTransparentWebm();
    setShowVideo(!reduced && webmOk);

    if (reduced || !webmOk) {
      return;
    }

    const node = videoRef.current;
    if (!node) {
      return;
    }

    const play = () => {
      void node.play().catch(() => {
        // Autoplay blocked — poster remains visible.
      });
    };

    node.addEventListener("canplay", play);
    if (node.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      play();
    }

    return () => {
      node.removeEventListener("canplay", play);
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,28rem)] lg:max-w-none">
      <div className="relative aspect-square w-full bg-transparent">
        {/* eslint-disable-next-line @next/next/no-img-element -- transparent PNG fallback for Safari / reduced motion */}
        <img
          src={POSTER_SRC}
          alt={
            showVideo
              ? ""
              : "Lessonova AI teaching assistant mascot with headset and notebook"
          }
          aria-hidden={showVideo}
          className={
            showVideo
              ? "pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0"
              : "block h-full w-full object-contain"
          }
          width={960}
          height={960}
          decoding="async"
          fetchPriority="high"
        />
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={POSTER_SRC}
            aria-label="Animated Lessonova AI teaching assistant mascot"
            className="absolute inset-0 block h-full w-full bg-transparent object-contain"
          >
            <source src={WEBM_SRC} type="video/webm" />
          </video>
        ) : null}
      </div>
      <div
        className="pointer-events-none absolute -right-4 -bottom-4 -z-10 h-[85%] w-[85%] rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
    </div>
  );
}
