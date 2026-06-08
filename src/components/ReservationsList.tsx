import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Grain } from './Grain';

interface InterestRow {
  id: string | number;
  full_name: string;
  email: string;
  phone: string;
  party_size: number;
  created_at: string | null;
}

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rows: InterestRow[] };

// Format an E.164-ish or digit-only phone string back into a readable form.
// We store digits only on submit, so we re-pretty-print for the table.
function formatPhone(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw || '—';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReservationsList() {
  const [state, setState] = useState<FetchState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase
          .from('interest_signups')
          .select('id, full_name, email, phone, party_size, created_at')
          .order('created_at', { ascending: false });

        if (cancelled) return;

        if (error) {
          console.error('[reservations-list] Supabase error:', error);
          setState({
            status: 'error',
            message:
              error.message ||
              'Could not load reservations. Check Supabase RLS policies for SELECT.',
          });
          return;
        }

        setState({ status: 'ready', rows: (data as InterestRow[]) ?? [] });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Unexpected error loading reservations.';
        console.error('[reservations-list] Unexpected error:', err);
        setState({ status: 'error', message });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalGuests = useMemo(() => {
    if (state.status !== 'ready') return 0;
    return state.rows.reduce((sum, r) => sum + (Number(r.party_size) || 0), 0);
  }, [state]);

  return (
    <div
      className="relative min-h-screen w-full"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background vignette + warm halo, matching the form page */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 100%, transparent 30%, #060606 100%),
            radial-gradient(ellipse 60% 40% at 50% 0%, rgba(184,153,104,0.06) 0%, transparent 70%)
          `,
          zIndex: 1,
        }}
      />

      <Grain />

      <div
        className="relative mx-auto w-full max-w-[1100px] px-6 py-16 md:py-24"
        style={{ zIndex: 10 }}
      >
        {/* Header block — same vocabulary as the form */}
        <header className="text-center">
          <p
            className="uppercase"
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.22em',
              color: 'var(--muted)',
            }}
          >
            A Private Supper Club
          </p>

          <h1
            className="mt-3"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
              fontWeight: 400,
              letterSpacing: '0.14em',
              lineHeight: 1.2,
              color: 'var(--ink)',
            }}
          >
            Reservations
          </h1>

          <div
            className="mx-auto mt-5"
            style={{
              width: 64,
              height: 1,
              backgroundColor: 'var(--accent)',
            }}
          />

          <p
            className="mt-5 mx-auto"
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: '0.875rem',
              lineHeight: 1.6,
              color: 'var(--muted)',
              maxWidth: 520,
            }}
          >
            Every name who has expressed interest in the next NONCHALANT supper
            club. Curated by Chef Marcos Juárez · Cocktails by Hao Ma.
          </p>
        </header>

        {/* Meta strip: counts + back link */}
        <div className="res-meta">
          <div className="res-meta-stats">
            {state.status === 'ready' && (
              <>
                <span className="res-stat">
                  <span className="res-stat-value">{state.rows.length}</span>
                  <span className="res-stat-label">Entries</span>
                </span>
                <span className="res-meta-divider" aria-hidden="true" />
                <span className="res-stat">
                  <span className="res-stat-value">{totalGuests}</span>
                  <span className="res-stat-label">Total Guests</span>
                </span>
              </>
            )}
          </div>

          <Link to="/" className="cta-link">
            ← back to the door
          </Link>
        </div>

        {/* Table / states */}
        <section className="res-card mt-8">
          {state.status === 'loading' && (
            <div className="res-state">
              <span className="res-state-dot" aria-hidden="true" />
              <p className="res-state-text">Gathering the list…</p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="res-state res-state--error">
              <p
                className="form-error"
                role="alert"
                style={{ marginTop: 0, fontSize: '0.875rem' }}
              >
                {state.message}
              </p>
            </div>
          )}

          {state.status === 'ready' && state.rows.length === 0 && (
            <div className="res-state">
              <p className="res-state-text">
                No reservations yet. The room is quiet.
              </p>
            </div>
          )}

          {state.status === 'ready' && state.rows.length > 0 && (
            <div className="res-table-wrap" role="region" aria-label="Reservations table">
              <table className="res-table">
                <thead>
                  <tr>
                    <th scope="col" className="res-th res-th--num">#</th>
                    <th scope="col" className="res-th">Full Name</th>
                    <th scope="col" className="res-th">Email</th>
                    <th scope="col" className="res-th">Phone</th>
                    <th scope="col" className="res-th res-th--center">Party</th>
                    <th scope="col" className="res-th">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map((row, idx) => (
                    <tr key={String(row.id) ?? `${row.email}-${idx}`} className="res-tr">
                      <td className="res-td res-td--num">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="res-td res-td--name">{row.full_name}</td>
                      <td className="res-td">
                        <a className="res-link" href={`mailto:${row.email}`}>
                          {row.email}
                        </a>
                      </td>
                      <td className="res-td res-td--mono">{formatPhone(row.phone)}</td>
                      <td className="res-td res-td--center">
                        <span className="res-party-pill">{row.party_size}</span>
                      </td>
                      <td className="res-td res-td--muted">
                        {formatDate(row.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
