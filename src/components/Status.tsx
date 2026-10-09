import { AlertCircle, LoaderCircle } from 'lucide-react';
import { Button } from './ui/button';

export function Loading({ text = 'Setting the table…' }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="animate-spin" size={24} />
      <p>{text}</p>
    </div>
  );
}
export function ErrorMessage({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-message" role="alert">
      <AlertCircle size={20} />
      <span>{message}</span>
      {retry && (
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
