import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Stein } from '../components/Illustration';
import { Button } from '../components/ui/button';
import { ErrorMessage, Loading } from '../components/Status';
import { pb, friendlyError } from '../lib/pocketbase';
import { joinUrl } from '../lib/utils';

export function Qr() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    pb.send<{ publicUrl: string }>('/api/tasting/config', {})
      .then((config) => {
        const destination = joinUrl(config.publicUrl, window.location.origin);
        if (active) {
          setUrl(destination);
          if (!destination)
            setError(
              'Set PUBLIC_APP_URL to a network address your guests can reach, then restart PocketBase.',
            );
        }
      })
      .catch((e) => {
        if (active) setError(friendlyError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <main className="page qr-page">
      <section className="qr-welcome">
        <div className="qr-copy">
          <p className="eyebrow light">✦ &nbsp; YOU’RE IN GOOD COMPANY &nbsp; ✦</p>
          <h1>
            Oktoberfest
            <br />
            <em>Beer Tasting</em>
          </h1>
          <p>
            Pull up a chair.
            <br />
            Find a favorite.
            <br />
            Raise a glass.
          </p>
          <Stein className="qr-stein" />
          <div className="hero-signoff">GUT BIER. GUTE ZEITEN.</div>
        </div>
        <div className="qr-card">
          <p className="eyebrow">YOUR EVENING STARTS HERE</p>
          <h2>
            Scan to join
            <br />
            the tasting.
          </h2>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            url && (
              <>
                <div className="qr-code">
                  <QRCodeSVG
                    value={url}
                    size={248}
                    level="M"
                    marginSize={4}
                    title="Scan to join the Oktoberfest tasting"
                  />
                </div>
                <p>
                  Open your phone’s camera.
                  <br />
                  Point, tap, and tell us your name.
                </p>
                <a className="qr-destination" href={url}>
                  {url}
                </a>
              </>
            )
          )}
          <Button asChild className="full-width">
            <Link to="/join">
              Join on this device
              <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
