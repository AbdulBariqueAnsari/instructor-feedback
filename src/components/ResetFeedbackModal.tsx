import React, {useEffect, useState} from 'react';
import {AlertTriangle, RotateCcw, X} from 'lucide-react';
import {apiFetch} from '../utils/api';

interface ResetFeedbackModalProps {
  open: boolean;
  submittedCount: number;
  draftCount: number;
  totalTrainees: number;
  onClose: () => void;
  onResetSuccess: (message: string) => Promise<void>;
}

export const ResetFeedbackModal: React.FC<ResetFeedbackModalProps> = ({
  open,
  submittedCount,
  draftCount,
  totalTrainees,
  onClose,
  onResetSuccess,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConfirmText('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const isConfirmed = confirmText.trim().toUpperCase() === 'RESET';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) {
      setError('Please type RESET in the box below to confirm.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{
        ok: boolean;
        clearedSubmitted: number;
        clearedDrafts: number;
        message: string;
      }>('/api/admin/feedback/reset', {
        method: 'POST',
        body: JSON.stringify({confirmText: 'RESET'}),
      });
      await onResetSuccess(res.message);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset trainee feedback data.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-feedback-title"
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
            <div>
              <h2 id="reset-feedback-title" className="font-display text-base font-bold text-slate-900">
                Reset All Trainee Feedback Data
              </h2>
              <p className="text-xs text-slate-500">Permanent action for all {totalTrainees} trainees</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reset confirmation dialog"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-1.5 text-xs text-red-900">
            <div className="font-semibold">This will permanently clear:</div>
            <ul className="list-disc pl-4 space-y-0.5 text-red-800">
              <li>
                <span className="font-mono font-semibold">{submittedCount}</span> submitted trainee
                evaluations and written remarks
              </li>
              <li>
                <span className="font-mono font-semibold">{draftCount}</span> in-progress trainee drafts
              </li>
              <li>
                All <span className="font-mono font-semibold">{totalTrainees}</span> trainees
                (STCLRC0001–STCLRC0920) will be set back to <span className="font-semibold">Pending</span>
              </li>
            </ul>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Preserved safely:</span> All 27 instructors
            (T1–T27), evaluation questions, IST schedule, and updated Admin/Trainee passwords will remain
            untouched.
          </div>

          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="reset-confirm-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Type <span className="font-mono text-red-700">RESET</span> to confirm
            </label>
            <input
              id="reset-confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESET"
              autoComplete="off"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-45 rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {submitting ? 'Resetting Data...' : 'Reset All Trainee Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
