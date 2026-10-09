import { useRef, useState, type FormEvent } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { ErrorMessage } from './Status';
import { friendlyError, pb, saveRating, withGuest } from '../lib/pocketbase';
import type { Beer, Rating } from '../lib/types';

export function RatingDialog({
  beer,
  rating,
  close,
  saved,
  removed,
}: {
  beer: Beer;
  rating?: Rating;
  close: () => void;
  saved: (rating: Rating) => void;
  removed: (id: string) => void;
}) {
  const [score, setScore] = useState<number | null>(rating?.score ?? null);
  const [notes, setNotes] = useState(rating?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const dirty = score !== (rating?.score ?? null) || notes !== (rating?.notes ?? '');
  function requestClose() {
    if (!busy && (!dirty || window.confirm('Discard your unsaved tasting changes?'))) close();
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (score === null || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      saved(await saveRating(beer.id, score, notes));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function clear() {
    if (
      !rating ||
      inFlight.current ||
      !window.confirm('Clear this rating and its notes? This beer will return to Not yet tasted.')
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await withGuest(async () => {
        try {
          await pb.collection('ratings').delete(rating.id);
        } catch (e) {
          if (!(e instanceof Error && 'status' in e && e.status === 404)) throw e;
        }
      });
      removed(rating.id);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <p className="eyebrow">{rating ? 'REVISIT YOUR POUR' : 'A MOMENT FOR YOUR POUR'}</p>
        <DialogTitle className="dialog-title">{beer.name}</DialogTitle>
        <DialogDescription className="muted">
          {[beer.brewery, beer.style, beer.abv ? `${beer.abv}% ABV` : '']
            .filter(Boolean)
            .join(' · ')}
        </DialogDescription>
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <legend>How’s the beer?</legend>
            <div className="score-grid">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  type="button"
                  className={score === n ? 'score selected' : 'score'}
                  aria-pressed={score === n}
                  aria-label={`Score ${n} out of 10`}
                  key={n}
                  onClick={() => setScore(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="scale">
              <span>1 · Not for me</span>
              <span>10 · Absolutely wunderbar</span>
            </div>
          </fieldset>
          <label htmlFor="tasting-notes">
            A little tasting note <span className="muted">(optional)</span>
          </label>
          <textarea
            id="tasting-notes"
            rows={3}
            maxLength={300}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Toasty, crisp, a hint of caramel…"
            disabled={busy}
          />
          <span className="character-count">{notes.length}/300</span>
          {error && <ErrorMessage message={error} />}
          <Button className="full-width" disabled={score === null || busy}>
            <Check size={18} />
            {busy ? 'Saving…' : rating ? 'Update rating' : 'Save my rating'}
          </Button>
          {rating && (
            <Button
              type="button"
              className="full-width clear-rating"
              variant="ghost"
              disabled={busy}
              onClick={clear}
            >
              <Trash2 size={15} />
              Clear this rating
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
