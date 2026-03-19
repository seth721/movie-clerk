export default function MovieClerkMascot({ size = 80 }: { size?: number }) {
  const W = 162;
  const H = 132;
  return (
    <svg
      width={size}
      height={Math.round(size * (H / W))}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated" as const }}
    >
      {/*
        16-bit SNES Final Fantasy–style pixel art.
        All shapes snap to a 4px grid.
        Palette: skin=#f8c070  hair=#180800  blue=#2868b0  darkblue=#0c2c60
                 lens=#a8d8f0  navy=#0a1838  outline=#101010  vhs=#181818  red=#e50914
      */}

      {/* ── HAIR ── */}
      <rect x="24" y="0"  width="40" height="12" fill="#180800"/>
      <rect x="16" y="6"  width="8"  height="16" fill="#180800"/>  {/* left side */}
      <rect x="64" y="6"  width="8"  height="16" fill="#180800"/>  {/* right side */}
      {/* small tuft */}
      <rect x="36" y="0"  width="4"  height="4"  fill="#2e1200"/>
      <rect x="52" y="0"  width="4"  height="4"  fill="#2e1200"/>

      {/* ── FACE ── */}
      <rect x="16" y="12" width="56" height="38" fill="#f8c070"/>
      {/* hair continues down sides of face */}
      <rect x="16" y="12" width="8"  height="10" fill="#180800"/>
      <rect x="64" y="12" width="8"  height="10" fill="#180800"/>
      {/* face shadow under chin */}
      <rect x="20" y="46" width="48" height="4"  fill="#d4a050"/>

      {/* ── EYEBROWS ── */}
      <rect x="22" y="16" width="12" height="2"  fill="#180800"/>
      <rect x="54" y="16" width="12" height="2"  fill="#180800"/>

      {/* ── GLASSES — left lens ── */}
      <rect x="20" y="20" width="16" height="10" fill="#a8d8f0"/>
      <rect x="20" y="20" width="16" height="2"  fill="#101010"/>
      <rect x="20" y="28" width="16" height="2"  fill="#101010"/>
      <rect x="20" y="20" width="2"  height="10" fill="#101010"/>
      <rect x="34" y="20" width="2"  height="10" fill="#101010"/>
      <rect x="22" y="22" width="4"  height="3"  fill="#d4f0ff"/>  {/* highlight */}

      {/* ── GLASSES — right lens ── */}
      <rect x="52" y="20" width="16" height="10" fill="#a8d8f0"/>
      <rect x="52" y="20" width="16" height="2"  fill="#101010"/>
      <rect x="52" y="28" width="16" height="2"  fill="#101010"/>
      <rect x="52" y="20" width="2"  height="10" fill="#101010"/>
      <rect x="66" y="20" width="2"  height="10" fill="#101010"/>
      <rect x="54" y="22" width="4"  height="3"  fill="#d4f0ff"/>  {/* highlight */}

      {/* bridge + temples */}
      <rect x="36" y="23" width="16" height="2"  fill="#101010"/>
      <rect x="14" y="23" width="6"  height="2"  fill="#101010"/>
      <rect x="68" y="23" width="6"  height="2"  fill="#101010"/>

      {/* ── MOUTH (narrower smile) ── */}
      <rect x="34" y="40" width="20" height="2"  fill="#b06030"/>
      <rect x="32" y="42" width="4"  height="2"  fill="#b06030"/>
      <rect x="52" y="42" width="4"  height="2"  fill="#b06030"/>

      {/* ── NECK ── */}
      <rect x="32" y="50" width="24" height="12" fill="#f8c070"/>
      <rect x="30" y="50" width="2"  height="12" fill="#101010"/>
      <rect x="56" y="50" width="2"  height="12" fill="#101010"/>

      {/* ── BODY ── */}
      <rect x="10" y="60" width="68" height="38" fill="#2868b0"/>
      {/* Side shading */}
      <rect x="10" y="60" width="6"  height="38" fill="#0c2c60"/>
      <rect x="72" y="60" width="6"  height="38" fill="#0c2c60"/>
      {/* Center seam */}
      <rect x="40" y="72" width="4"  height="26" fill="#0c2c60"/>
      {/* V-neck + collar */}
      <rect x="36" y="60" width="16" height="12" fill="#f8c070"/>
      <rect x="34" y="60" width="6"  height="16" fill="#0c2c60"/>
      <rect x="48" y="60" width="6"  height="16" fill="#0c2c60"/>
      {/* Name tag */}
      <rect x="14" y="68" width="14" height="8"  fill="#e8e8d0"/>
      <rect x="14" y="68" width="14" height="2"  fill="#ccccb0"/>
      <rect x="15" y="70" width="8"  height="1"  fill="#888"/>
      <rect x="15" y="72" width="5"  height="1"  fill="#888"/>

      {/* ── LEFT ARM (hanging down) ── */}
      <rect x="0"  y="62" width="12" height="28" fill="#2868b0"/>
      <rect x="0"  y="62" width="2"  height="28" fill="#0c2c60"/>
      {/* Left hand */}
      <rect x="0"  y="88" width="12" height="10" fill="#f8c070"/>
      <rect x="0"  y="96" width="12" height="2"  fill="#101010"/>
      <rect x="0"  y="88" width="2"  height="10" fill="#101010"/>

      {/* ── RIGHT ARM (extended, holding VHS) ── */}
      <rect x="76" y="68" width="30" height="10" fill="#2868b0"/>
      <rect x="76" y="66" width="30" height="2"  fill="#0c2c60"/>
      <rect x="76" y="78" width="30" height="2"  fill="#0c2c60"/>
      {/* Right hand/fist */}
      <rect x="102" y="64" width="12" height="14" fill="#f8c070"/>
      <rect x="102" y="62" width="12" height="2"  fill="#101010"/>
      <rect x="114" y="64" width="2"  height="14" fill="#101010"/>
      <rect x="102" y="78" width="14" height="2"  fill="#101010"/>

      {/* ── VHS TAPE ── */}
      {/* Outline */}
      <rect x="108" y="52" width="50" height="2"  fill="#101010"/>
      <rect x="106" y="54" width="2"  height="30" fill="#101010"/>
      <rect x="156" y="54" width="2"  height="30" fill="#101010"/>
      <rect x="106" y="82" width="52" height="2"  fill="#101010"/>
      {/* Body */}
      <rect x="108" y="54" width="48" height="28" fill="#181818"/>
      {/* Window area */}
      <rect x="110" y="56" width="44" height="16" fill="#252525"/>
      {/* Left spool */}
      <rect x="112" y="57" width="16" height="14" fill="#1a1a1a"/>
      <rect x="114" y="59" width="12" height="10" fill="#2a2a2a"/>
      <rect x="117" y="62" width="6"  height="4"  fill="#404040"/>
      <rect x="119" y="63" width="2"  height="2"  fill="#666"/>
      {/* Right spool */}
      <rect x="132" y="57" width="16" height="14" fill="#1a1a1a"/>
      <rect x="134" y="59" width="12" height="10" fill="#2a2a2a"/>
      <rect x="137" y="62" width="6"  height="4"  fill="#404040"/>
      <rect x="139" y="63" width="2"  height="2"  fill="#666"/>
      {/* Red label strip */}
      <rect x="110" y="72" width="44" height="8"  fill="#e50914"/>
      <rect x="111" y="73" width="18" height="2"  fill="#ff666640"/>

      {/* ── LEGS ── */}
      <rect x="16" y="98"  width="22" height="22" fill="#0a1838"/>
      <rect x="50" y="98"  width="22" height="22" fill="#0a1838"/>
      {/* Gap shadow */}
      <rect x="38" y="98"  width="12" height="10" fill="#060c20"/>
      {/* Outlines */}
      <rect x="14" y="98"  width="2"  height="22" fill="#101010"/>
      <rect x="38" y="98"  width="2"  height="22" fill="#101010"/>
      <rect x="48" y="98"  width="2"  height="22" fill="#101010"/>
      <rect x="72" y="98"  width="2"  height="22" fill="#101010"/>

      {/* ── SHOES ── */}
      <rect x="10" y="118" width="30" height="12" fill="#101010"/>
      <rect x="48" y="118" width="30" height="12" fill="#101010"/>
      {/* Sole highlight */}
      <rect x="10" y="118" width="30" height="2"  fill="#1e1e1e"/>
      <rect x="48" y="118" width="30" height="2"  fill="#1e1e1e"/>
      {/* Toe cap */}
      <rect x="8"  y="118" width="2"  height="12" fill="#101010"/>
      <rect x="40" y="118" width="2"  height="12" fill="#101010"/>
      <rect x="46" y="118" width="2"  height="12" fill="#101010"/>
      <rect x="78" y="118" width="2"  height="12" fill="#101010"/>
      {/* Bottom of shoes */}
      <rect x="8"  y="128" width="34" height="2"  fill="#101010"/>
      <rect x="46" y="128" width="34" height="2"  fill="#101010"/>
    </svg>
  );
}
