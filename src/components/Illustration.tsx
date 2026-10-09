import type { CSSProperties } from 'react';

export function Stein({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 290" fill="none" aria-hidden="true">
      <g stroke="#DFBE79" strokeWidth="2" opacity=".6">
        <path d="M35 172C7 150 21 113 46 130M44 201C8 187 19 156 44 166M274 138c32-19 42 17 18 35M270 177c34-9 39 26 14 30" />
        <path d="M40 230C12 190 22 127 58 90M279 232c29-37 22-94-10-135M42 209l-21-6m16-15-19-12m18-7-16-18m24-1-7-23m7 6 9-19M281 215l23-8m-19-10 23-12m-25-5 17-17m-23-3 5-22" />
        <path d="M110 35l-3-13m17 16 8-11m-1 29 14-2M199 33l8-13m-1 31 17-3" />
      </g>
      <ellipse cx="160" cy="260" rx="85" ry="8" fill="#10291D" opacity=".4" />
      <path
        d="M210 105h29c26 0 26 25 26 42v32c0 25-14 39-46 39h-14"
        stroke="#E7D7AD"
        strokeWidth="16"
      />
      <path
        d="M84 92h136l-9 149c-1 13-13 19-31 19h-59c-18 0-29-8-30-19L84 92Z"
        fill="#F2DEAA"
        stroke="#F6E7C8"
        strokeWidth="5"
      />
      <path d="M96 106h112l-8 128c0 10-6 13-21 13h-54c-13 0-20-5-21-14L96 106Z" fill="#CB882F" />
      <path
        d="M108 130l6 99m24-102 2 107m25-107-1 106m26-107-5 100"
        stroke="#EBAF4A"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M86 113c-24-8-15-37 1-39-4-27 32-36 46-20 12-31 49-29 60-5 26-9 47 9 42 31 16 5 14 31-4 34-12 5-16-5-26-2-13 5-8 29-21 29-15 0-8-26-23-28-21-2-17 5-34-1-15-6-27 10-41 1Z"
        fill="#FAF1DC"
        stroke="#E9D8B0"
        strokeWidth="3"
      />
      <path
        d="M107 86c7-12 19-7 24-2m26-15c5-9 15-6 20 1m24 20c8-6 15-3 18 3"
        stroke="#E7D7B5"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g transform="translate(49 191) rotate(-15)">
        <path
          d="M16 51C-18 22 6-16 30 11c6 7 12 18 17 27 5-11 9-26 15-33 26-24 53 12 21 43C55 73 27 70 16 51Z"
          fill="#8A482B"
          stroke="#E0A458"
          strokeWidth="10"
        />
        <path
          d="M10 19c15 22 46 25 74 2M24 61 62 6"
          stroke="#E0A458"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="m6 20 4 2m10 27 4-1m5-30 3 2m21 40 4-1m18-35 3 3m-19-20 1 4"
          stroke="#FAEED1"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <path d="m63 66 4 7 8 2-6 5 1 8-7-4-7 4 1-8-6-5 8-2Z" fill="#D9B568" />
      <path d="m252 62 3 5 6 1-4 4 1 6-6-3-5 3 1-6-4-4 5-1Z" fill="#D9B568" />
    </svg>
  );
}
export function BeerLabel({ index, name }: { index: number; name: string }) {
  const colors = ['#244333', '#793C30', '#B57628', '#3A5260', '#63503D', '#566246'];
  return (
    <div
      className="beer-art"
      style={{ '--label-color': colors[index % colors.length] } as CSSProperties}
      aria-hidden="true"
    >
      <div className="label-ornament">✦ &nbsp; TRADITION &nbsp; ✦</div>
      <div className="bottle-label">
        <span className="label-top">BRAUHAUS</span>
        <span className="label-monogram">{name.charAt(0)}</span>
        <span className="label-bottom">FEIN • GEBRAUT</span>
      </div>
      <div className="art-number">No. {String(index + 1).padStart(2, '0')}</div>
    </div>
  );
}
