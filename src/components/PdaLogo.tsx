import React from 'react';

export const PdaLogo: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => {
  return (
    <svg
      viewBox="0 0 800 800"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PDA Comercial"
      className={className}
    >
      <defs>
        <style>
          {`
            .azul { fill: #063568; }
            .laranja { fill: #ff5a00; }
            .linha-azul { stroke: #063568; stroke-width: 8; fill: none; stroke-linecap: round; }
            .linha-laranja { stroke: #ff5a00; stroke-width: 8; fill: none; stroke-linecap: round; }
          `}
        </style>
      </defs>

      {/* FUNDO BRANCO (ORIGINAL PDA COMERCIAL) */}
      <rect width="100%" height="100%" fill="#ffffff" rx="160" />

      {/* ÓRBITA SUPERIOR */}
      <path d="M205 205 C300 80 505 65 650 185" className="linha-azul" />
      <path d="M650 185 C690 220 715 255 730 290" className="linha-azul" />

      {/* Pontos da órbita */}
      <circle cx="285" cy="125" r="16" className="azul" />
      <circle cx="390" cy="100" r="23" className="laranja" />
      <circle cx="600" cy="145" r="16" className="azul" />
      <circle cx="185" cy="250" r="15" className="azul" />

      {/* CAMISA */}
      <path d="M325 155 L360 140 L420 140 L455 155 L475 245 L440 258 L440 335 L335 335 L335 258 L305 245 Z" className="azul" />
      <path d="M350 143 L365 173 L415 173 L430 143" fill="none" stroke="#ff5a00" strokeWidth="9" />
      <path d="M365 173 L390 198 L415 173" fill="#063568" stroke="#ff5a00" strokeWidth="5" />
      <path d="M365 174 L390 200 L415 174" fill="none" stroke="#ffffff" strokeWidth="4" />
      <path d="M307 225 L335 237" stroke="#ff5a00" strokeWidth="9" />
      <path d="M447 237 L475 225" stroke="#ff5a00" strokeWidth="9" />
      <circle cx="390" cy="208" r="3" fill="#ff5a00" />
      <circle cx="390" cy="222" r="3" fill="#ff5a00" />

      {/* CALÇAS */}
      <path d="M225 195 L290 183 L315 315 L280 325 L260 245 L250 325 L215 318 Z" className="azul" />
      <path d="M228 200 L292 188" stroke="#ffffff" strokeWidth="5" />
      <path d="M235 215 Q250 225 270 218" fill="none" stroke="#ffffff" strokeWidth="4" />
      <path d="M270 195 Q280 205 292 207" fill="none" stroke="#ffffff" strokeWidth="4" />

      {/* TÉNIS */}
      <path d="M190 300 Q215 290 235 310 L270 337 Q290 350 330 350 L335 370 L180 370 Q175 345 190 300 Z" className="azul" />
      <path d="M180 355 Q250 370 335 355 L335 372 L180 372 Z" className="laranja" />
      <path d="M220 315 L260 335 M215 325 L255 345 M210 335 L250 353" stroke="#ff5a00" strokeWidth="5" />

      {/* CHINELOS */}
      <path d="M345 315 Q370 285 390 320 Q410 285 440 315 L450 365 L335 365 Z" className="azul" />
      <path d="M390 320 Q375 335 365 360" stroke="#ff5a00" strokeWidth="7" fill="none" />
      <path d="M390 320 Q410 335 420 360" stroke="#ff5a00" strokeWidth="7" fill="none" />

      {/* COMPUTADOR PORTÁTIL */}
      <path d="M480 180 L570 185 L560 245 L465 238 Z" className="azul" />
      <path d="M465 238 L560 245 L585 260 L455 253 Z" className="azul" />
      <path d="M495 244 L535 247 L540 252 L500 249 Z" fill="#ffffff" />

      {/* SMARTPHONE */}
      <rect x="470" y="255" width="45" height="82" rx="6" className="azul" transform="rotate(8 492 296)" />
      <circle cx="486" cy="270" r="5" fill="#ffffff" />

      {/* AUSCULTADORES */}
      <path d="M550 240 C550 200 605 200 605 240" className="linha-azul" />
      <rect x="542" y="230" width="22" height="55" rx="10" className="azul" />
      <rect x="595" y="230" width="22" height="55" rx="10" className="azul" />

      {/* SETAS / ELEMENTO LARANJA */}
      <path d="M620 245 L720 275 L650 320 L705 320 L640 405 L600 405 L635 325 L580 325 Z" className="laranja" />
      <path d="M610 330 L665 330 L690 410 L625 410 Z" className="laranja" />

      {/* LETRA P */}
      <path d="M190 360 L370 360 Q420 360 420 420 Q420 475 370 475 L275 475 L275 535 L220 535 L220 415 L190 415 Z M275 410 L355 410 Q370 410 370 430 Q370 450 350 450 L275 450 Z" className="azul" fillRule="evenodd" />

      {/* LETRA D */}
      <path d="M360 360 L470 360 Q555 360 555 450 Q555 535 470 535 L360 535 Z M415 410 L460 410 Q500 410 500 450 Q500 490 460 490 L415 490 Z" className="azul" fillRule="evenodd" />

      {/* LETRA A */}
      <path d="M535 535 L585 360 L645 360 L700 535 L645 535 L635 495 L585 495 L575 535 Z M595 455 L625 455 L610 405 Z" className="laranja" fillRule="evenodd" />

      {/* LINHA INFERIOR DO LOGÓTIPO */}
      <path d="M215 555 L650 555" stroke="#ff5a00" strokeWidth="25" />

      {/* CARRINHO DE COMPRAS */}
      <path d="M35 220 Q80 225 120 240 L170 570 Q175 600 205 600 L670 600" fill="none" stroke="#063568" strokeWidth="35" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M180 520 L650 520 L680 600 L200 600 Z" fill="none" stroke="#063568" strokeWidth="25" />
      <circle cx="270" cy="640" r="35" className="azul" />
      <circle cx="580" cy="640" r="35" className="azul" />
      <circle cx="270" cy="640" r="12" fill="#ffffff" />
      <circle cx="580" cy="640" r="12" fill="#ffffff" />

      {/* PEQUENOS DETALHES ORBITAIS */}
      <circle cx="170" cy="270" r="13" className="azul" />
      <circle cx="670" cy="205" r="13" className="azul" />
    </svg>
  );
};
