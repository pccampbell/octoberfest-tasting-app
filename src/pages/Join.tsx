import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Beer, Check, PencilLine, Trophy } from 'lucide-react';
import { Stein } from '../components/Illustration';
import { Button } from '../components/ui/button';
import { ErrorMessage, Loading } from '../components/Status';
import { useSession } from '../lib/session';
import { friendlyError, joinGuest } from '../lib/pocketbase';

const steps = [
  {
    Icon: Beer,
    title: 'Find your next pour',
    text: 'Explore the lineup, from golden festbiers to rich, malty märzens.',
  },
  {
    Icon: PencilLine,
    title: 'Give it your honest score',
    text: 'Pick a number from 1 to 10. A little tasting note? Even better.',
  },
  {
    Icon: Trophy,
    title: 'Crown your favorites',
    text: 'Revisit your rankings and see what’s winning over the room.',
  },
];
export function Join() {
  const { guest, loading, error: sessionError, retry, setGuest } = useSession();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const navigate = useNavigate();
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const joined = await joinGuest(name);
      setGuest(joined);
      navigate('/taste');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="page join-page">
      <section className="welcome-hero">
        <div className="hero-copy">
          <p className="eyebrow light">✦ &nbsp; WELCOME TO THE BEER HALL &nbsp; ✦</p>
          <h1>
            Good friends.
            <br />
            Great beer.
            <br />
            <em>Let’s raise a glass.</em>
          </h1>
          <p>
            A little sip, a little score, a new favorite.
            <br />
            Your Oktoberfest tasting adventure starts here.
          </p>
          <span className="hero-signoff">EIN PROSIT DER GEMÜTLICHKEIT</span>
        </div>
        <Stein className="hero-stein" />
        <div className="hero-corner top-left" />
        <div className="hero-corner bottom-right" />
      </section>
      <section className="join-section">
        <div className="join-card">
          <p className="eyebrow">YOUR SEAT AT THE TABLE</p>
          <h2>{guest ? 'Welcome back!' : 'Come on in. Prost!'}</h2>
          <p className="muted">
            {guest
              ? 'Your tasting notes and favorites are right where you left them.'
              : 'Just your name, and you’re in. We’ll keep track of the good stuff.'}
          </p>
          {loading ? (
            <Loading text="Finding your seat…" />
          ) : sessionError ? (
            <ErrorMessage message={sessionError} retry={retry} />
          ) : guest ? (
            <Button asChild className="full-width">
              <Link to="/taste">
                Continue as {guest.display_name}
                <ArrowRight size={18} />
              </Link>
            </Button>
          ) : (
            <form onSubmit={submit}>
              <label htmlFor="guest-name">What should we call you?</label>
              <input
                id="guest-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your first name or nickname"
                required
                maxLength={40}
                autoComplete="given-name"
                disabled={busy}
              />
              {error && <ErrorMessage message={error} />}
              <Button className="full-width" disabled={busy || !name.trim()}>
                {busy ? 'Saving your seat…' : 'Join the Tasting'}
                <ArrowRight size={18} />
              </Button>
            </form>
          )}
          <p className="storage-note">
            <Check size={14} /> Your tasting stays saved on this browser.
          </p>
          <p className="small muted">
            Using a new device or cleared browser? Ask the host about your previous ratings.
          </p>
        </div>
        <div className="how-it-works">
          <p className="eyebrow">THE RECIPE FOR A GOOD EVENING</p>
          <h2>Sip. Score. Discover.</h2>
          {steps.map(({ Icon, title, text }, i) => (
            <div className="how-step" key={title}>
              <span className="step-icon">
                <Icon size={23} strokeWidth={1.5} />
              </span>
              <div>
                <small>STEP 0{i + 1}</small>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
