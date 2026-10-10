import type { CSSProperties } from 'react';

export function BeerPoster({ className = '' }: { className?: string }) {
  return (
    <figure className={`beer-poster ${className}`} aria-hidden="true">
      <div className="poster-kicker">FEIN GEBRAUT · MIT LIEBE</div>
      <img src="/beer-hall-print.webp" alt="" width={960} height={960} />
      <figcaption>
        GUT BIER.
        <br />
        GUTE ZEITEN.
      </figcaption>
    </figure>
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
      <div className="bottle-label">
        <span className="label-top">FEIN GEBRAUT</span>
        <span className="label-monogram">{name.charAt(0).toUpperCase()}</span>
        <span className="label-bottom">EIN PROSIT</span>
      </div>
      <div className="art-number">POUR No. {String(index + 1).padStart(2, '0')}</div>
    </div>
  );
}
