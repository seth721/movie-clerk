"use client";

import { useState, useEffect } from "react";
import MovieClerkMascot from "@/components/MovieClerkMascot";

const QUOTES = [
  "Man, I miss calling and bugging people about late fees.",
  "Tsk...but does the algorithm have a passion for true cinema?",
  "Excuse me...that section is for Adults Only!",
  "This was shot on film. You can just tell.",
  "Have you tried the Criterion section? ...No one ever tries the Criterion section.",
  "Be kind, rewind. It's not a suggestion.",
  "I've seen this one. You haven't lived.",
  "We only have it on VHS but honestly that's the superior format.",
  "The director's cut is three hours longer and worth every minute.",
  "Sorry, we don't carry anything with a 90% on Rotten Tomatoes.",
  "Streaming killed the video store. I have feelings about this.",
  "If you haven't seen the original, we can't be friends.",
  "Yes it has subtitles. Read them. It's called cinema.",
  "The book was different. I'm not saying better. I'm saying different.",
  "We do have that one. It's in the back. You seem like the type.",
  "Four stars from Ebert. That's all you need to know.",
  "Late fees were a public service, honestly.",
  "I will personally come to your house if you watch the colorized version.",
  "The sequel isn't bad. It's just... not the same.",
  "Some people put it on in the background. Those people are wrong.",
  "It's a slow burn. Emphasis on slow. Emphasis on burn.",
  "Nobody leaves the store without at least one thing they didn't plan to rent.",
  "Kubrick took three years to make that. Take the two hours to watch it.",
  "I'm not saying it'll change your life. I'm not not saying it either.",
];

export default function MascotSpeechBubble({ size = 110 }: { size?: number }) {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  return (
    <div className="flex items-end justify-center gap-3">
      <MovieClerkMascot size={size} />

      {quote && (
        <div className="relative mb-6 max-w-[220px]">
          {/* Bubble */}
          <div
            className="px-4 py-3 rounded-2xl text-sm leading-snug"
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              color: "#ccc",
              fontStyle: "italic",
            }}
          >
            &ldquo;{quote}&rdquo;
          </div>
          {/* Tail pointing left-down toward mascot */}
          <div
            className="absolute"
            style={{
              bottom: 10,
              left: -10,
              width: 0,
              height: 0,
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderRight: "10px solid #2a2a2a",
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: 11,
              left: -8,
              width: 0,
              height: 0,
              borderTop: "7px solid transparent",
              borderBottom: "7px solid transparent",
              borderRight: "9px solid #1a1a1a",
            }}
          />
        </div>
      )}
    </div>
  );
}
