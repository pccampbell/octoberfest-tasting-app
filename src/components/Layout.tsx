import { Beer, ClipboardList, QrCode, Trophy, ArrowUpRight } from 'lucide-react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { useSession } from '../lib/session';

export function Layout() {
  const { guest } = useSession();
  return (
    <>
      <div className="festival-strip">
        GUT BIER. GUTE FREUNDE. GUTE ZEITEN. <span>GOOD BEER. GOOD COMPANY.</span>
      </div>
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Beer size={25} strokeWidth={1.5} />
          </span>
          <span>
            Oktoberfest<small>THE TASTING TABLE</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/taste">
            <ClipboardList size={17} />
            <span>The tasting</span>
          </NavLink>
          <NavLink to="/results">
            <Trophy size={17} />
            <span>Live results</span>
          </NavLink>
          <NavLink to="/qr">
            <QrCode size={17} />
            <span>Invite friends</span>
          </NavLink>
        </nav>
        <Link className="guest-chip" to="/join">
          {guest ? (
            <>
              <span className="avatar">{guest.display_name.charAt(0).toUpperCase()}</span>
              <span>{guest.display_name}</span>
            </>
          ) : (
            <>
              Join the table <ArrowUpRight size={16} />
            </>
          )}
        </Link>
      </header>
      <Outlet />
      <footer className="site-footer">
        <span>✦</span>
        <p>A little Bavaria. A lot of good company.</p>
        <span>PROST!</span>
      </footer>
    </>
  );
}
