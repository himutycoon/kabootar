import { Link } from 'react-router-dom';
import { PLAY_STORE_URL } from '../../lib/links';

export function BrandLogo({ to = '/', size = 32, inverted = false }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-kb-500">
      <img src="/brand/logo-64.png" alt="" width={size} height={size}
        className="rounded-[9px]" style={{ width: size, height: size }} />
      <span className={`text-[19px] font-bold tracking-[-0.02em] ${inverted ? 'text-white' : 'text-slate-900'}`}>
        Kabutar
      </span>
    </Link>
  );
}

// Official Google Play badge (hosted locally). The PNG ships with Google's
// required clear-space padding baked in, so it renders slightly larger than its
// visible artwork.
export function PlayStoreBadge({ height = 56, className = '' }) {
  return (
    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
      className={`inline-block shrink-0 -ml-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-kb-500 ${className}`}
      aria-label="Get Kabutar on Google Play">
      <img src="/brand/google-play-badge.png" alt="Get it on Google Play"
        style={{ height, width: 'auto' }} loading="lazy" />
    </a>
  );
}
