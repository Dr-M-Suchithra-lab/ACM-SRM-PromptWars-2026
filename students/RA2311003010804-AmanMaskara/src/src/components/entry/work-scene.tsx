import type { ReactNode } from "react";
import { SceneParallax } from "./scene-parallax";

/*
 * The shared background of the landing, language and login screens: workers from both
 * sectors at their jobs, in a hand-drawn flat SVG (a few KB, no images, no Lottie).
 * Loops are CSS keyframes on transform/opacity only (see `.scene-*` in globals.css); they
 * start once the page is loaded and idle, pause when the tab is hidden, and are static for
 * prefers-reduced-motion. Colours are the
 * palette at low contrast so text on top always stays readable.
 */

const SKIN = ["#c98b5e", "#a86b45", "#e0a47a"];
const C = {
  ground: "#ece3d3",
  far: "#ebe4d8",
  building: "#dcefe8",
  frame: "#b9d9cd",
  steel: "#c9bfae",
  vest: "#f7c46a",
  hat: "#f5a524",
  scrubs: "#9fd0c3",
  shirt: "#cfd9e6",
  overall: "#b8c7da",
  brick: "#e8b49a",
  cross: "#7fbfae",
};

interface PersonProps {
  shirt: string;
  skin: string;
  head?: "hardhat" | "cap" | "hair";
  legs?: "walk" | "still";
  arm?: ReactNode;
}

/** A friendly figure standing on y=0 (feet), about 104 units tall. */
function Person({ shirt, skin, head = "hardhat", legs = "still", arm }: PersonProps) {
  return (
    <g>
      <rect
        className={legs === "walk" ? "scene-leg scene-leg-a" : undefined}
        x="-10"
        y="-36"
        width="9"
        height="36"
        rx="4"
        fill="#8a7f70"
      />
      <rect
        className={legs === "walk" ? "scene-leg scene-leg-b" : undefined}
        x="1"
        y="-36"
        width="9"
        height="36"
        rx="4"
        fill="#9a8f80"
      />
      <rect x="-15" y="-82" width="30" height="50" rx="12" fill={shirt} />
      <circle cx="0" cy="-94" r="12" fill={skin} />
      {head === "hardhat" && (
        <g fill={C.hat}>
          <path d="M-13 -97 a13 12 0 0 1 26 0 z" />
          <rect x="-16" y="-98" width="32" height="4" rx="2" />
        </g>
      )}
      {head === "cap" && (
        <rect x="-9" y="-108" width="18" height="7" rx="3" fill="#ffffff" stroke={C.cross} strokeWidth="1.5" />
      )}
      {head === "hair" && <circle cx="-9" cy="-100" r="7" fill="#5b4636" />}
      {arm ?? <rect x="-4" y="-78" width="8" height="34" rx="4" fill={shirt} opacity="0.85" />}
    </g>
  );
}

export function WorkScene() {
  return (
    <div
      aria-hidden="true"
      className="work-scene pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[52vh] min-h-[320px] overflow-hidden opacity-60"
    >
      <SceneParallax>
        <svg viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
          {/* Far layer: sun, clouds, skyline */}
          <g className="scene-layer" style={{ ["--depth" as string]: 0.25 }}>
            <circle className="scene-sun" cx="1220" cy="110" r="46" fill="#fbd89a" opacity="0.7" />
            {[
              [180, 90, 1],
              [620, 60, 0.8],
              [980, 130, 1.1],
            ].map(([x, y, s], i) => (
              <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
                <g className="scene-cloud" style={{ animationDelay: `${i * -9}s` }}>
                  <ellipse cx="0" cy="0" rx="56" ry="18" fill="#ffffff" opacity="0.85" />
                  <ellipse cx="-22" cy="-12" rx="26" ry="18" fill="#ffffff" opacity="0.85" />
                  <ellipse cx="20" cy="-14" rx="30" ry="20" fill="#ffffff" opacity="0.85" />
                </g>
              </g>
            ))}
            {[60, 140, 330, 520, 700, 860, 1080, 1300].map((x, i) => (
              <rect
                key={x}
                x={x}
                y={300 - (i % 3) * 40}
                width={90 + (i % 2) * 30}
                height={200 + (i % 3) * 40}
                rx="6"
                fill={C.far}
              />
            ))}
          </g>

          {/* Middle layer: building under construction + crane, hospital, factory */}
          <g className="scene-layer" style={{ ["--depth" as string]: 0.55 }}>
            <g transform="translate(250 250)">
              <rect width="210" height="220" fill={C.building} rx="4" />
              {[0, 55, 110, 165].map((y) => (
                <rect key={y} y={y} width="210" height="6" fill={C.frame} />
              ))}
              {[0, 68, 136, 204].map((x) => (
                <rect key={x} x={x} width="6" height="220" fill={C.frame} />
              ))}
            </g>
            <g transform="translate(520 80)">
              <rect x="0" y="0" width="14" height="390" fill={C.steel} />
              <rect x="-90" y="-4" width="330" height="12" rx="3" fill={C.steel} />
              <rect x="-8" y="-24" width="30" height="22" rx="3" fill={C.hat} opacity="0.8" />
              <g className="scene-trolley">
                <g transform="translate(150 8)">
                  <g className="scene-load">
                    <rect x="-1" y="0" width="2" height="110" fill="#9a8f80" />
                    <rect x="-34" y="110" width="68" height="26" rx="3" fill={C.brick} />
                  </g>
                </g>
              </g>
            </g>
            <g transform="translate(860 230)">
              <rect width="250" height="240" rx="8" fill="#e6f0ee" />
              <rect x="100" y="-36" width="50" height="40" rx="6" fill="#e6f0ee" />
              <path d="M118 -28h14v10h10v14h-10v10h-14v-10h-10v-14h10z" fill={C.cross} />
              {[30, 90, 150].map((y) =>
                [30, 100, 170].map((x) => (
                  <rect key={`${x}-${y}`} x={x} y={y} width="44" height="32" rx="4" fill="#ffffff" opacity="0.8" />
                )),
              )}
            </g>
            <g transform="translate(1180 300)">
              <rect width="200" height="170" rx="6" fill="#ece6f2" />
              <path d="M0 0 l50 -40 v40 l50 -40 v40 l50 -40 v40" fill="#ece6f2" />
              <rect x="160" y="-110" width="22" height="110" fill={C.steel} />
              {[0, 1, 2].map((i) => (
                <circle
                  key={i}
                  className="scene-smoke"
                  style={{ animationDelay: `${i * 1.3}s` }}
                  cx="171"
                  cy="-122"
                  r="14"
                  fill="#ffffff"
                  opacity="0.7"
                />
              ))}
            </g>
          </g>

          {/* Near layer: ground and the people */}
          <g className="scene-layer" style={{ ["--depth" as string]: 1 }}>
            <rect x="-40" y="468" width="1520" height="80" fill={C.ground} />

            {/* Mason laying bricks */}
            <g transform="translate(250 470)">
              {[0, 1, 2].map((row) =>
                [0, 1, 2, 3].map((col) => (
                  <rect
                    key={`${row}-${col}`}
                    x={40 + col * 26 + (row % 2) * 13}
                    y={-14 - row * 14}
                    width="24"
                    height="12"
                    rx="2"
                    fill={C.brick}
                  />
                )),
              )}
              <rect className="scene-brick" x="92" y="-56" width="24" height="12" rx="2" fill={C.brick} />
              <Person
                shirt={C.vest}
                skin={SKIN[0]}
                arm={
                  <g className="scene-mason-arm">
                    <rect x="-4" y="-78" width="8" height="34" rx="4" fill={C.vest} />
                    <rect x="-6" y="-48" width="16" height="9" rx="2" fill={C.brick} />
                  </g>
                }
              />
            </g>

            {/* Worker in a hard hat walking across */}
            <g transform="translate(0 470)">
              <g className="scene-walker">
                <Person shirt={C.shirt} skin={SKIN[1]} legs="walk" />
              </g>
            </g>

            {/* Nurse pushing a cart */}
            <g transform="translate(900 470)">
              <g className="scene-nurse">
                <Person shirt={C.scrubs} skin={SKIN[2]} head="cap" />
                <g transform="translate(22 0)">
                  <rect x="0" y="-52" width="60" height="30" rx="5" fill="#ffffff" stroke={C.cross} strokeWidth="2" />
                  <rect x="4" y="-60" width="10" height="10" rx="2" fill={C.cross} opacity="0.6" />
                  {[10, 50].map((x) => (
                    <g key={x} transform={`translate(${x} -10)`}>
                      <g className="scene-wheel">
                        <circle r="9" fill="#9a8f80" />
                        <rect x="-1" y="-9" width="2" height="18" fill="#ffffff" />
                      </g>
                    </g>
                  ))}
                </g>
              </g>
            </g>

            {/* Factory worker at a machine */}
            <g transform="translate(1250 470)">
              <rect x="20" y="-70" width="80" height="70" rx="8" fill="#dad3e6" />
              <g className="scene-press">
                <rect x="44" y="-96" width="32" height="30" rx="4" fill={C.steel} />
              </g>
              <g transform="translate(60 -30)">
                <g className="scene-gear">
                  <circle r="14" fill="none" stroke="#b6abc8" strokeWidth="6" strokeDasharray="6 4" />
                </g>
              </g>
              <Person shirt={C.overall} skin={SKIN[0]} head="hair" />
            </g>
          </g>
        </svg>
      </SceneParallax>
      {/* Fade the top of the scene into the paper so headlines keep full contrast */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-paper to-transparent" />
    </div>
  );
}
