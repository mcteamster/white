import { useEffect, useState, useCallback } from 'react';
import type { Properties } from 'csstype';
import type { Card } from '@mcteamster/white-core';
import {
  fetchBoosters,
  purchaseBooster,
  checkPurchaseStatus,
  fulfillBooster,
  formatPrice,
  type BoosterPack,
  type FulfilledPayload,
} from '../lib/boosters';
import { Icon } from './Icons';

interface BoosterStoreProps {
  /** Whether the local player is the host (required for loadCards) */
  isHost: boolean;
  /** Called when a pack has been fulfilled and ready to load */
  onLoad: (cards: Card[]) => void;
  /** Close the store */
  onClose: () => void;
}

type StoreState =
  | { phase: 'loading' }
  | { phase: 'browse'; packs: BoosterPack[] }
  | { phase: 'purchasing'; pack: BoosterPack }
  | { phase: 'polling'; pack: BoosterPack; purchaseId: string; attempt: number }
  | { phase: 'fulfilling'; pack: BoosterPack; token: string }
  | { phase: 'done'; pack: BoosterPack; cardCount: number }
  | { phase: 'error'; message: string; recoverable: boolean }
  | { phase: 'empty' };

/** IDs of fulfillment tokens already loaded into this session — enforces load-once */
const loadedFulfillmentIds = new Set<string>();

/** Max status poll attempts before giving up (30 × 3s = 90s) */
const MAX_POLL_ATTEMPTS = 30;

export function BoosterStore({ isHost, onLoad, onClose }: BoosterStoreProps) {
  const [state, setState] = useState<StoreState>({ phase: 'loading' });

  // Load catalog on mount
  useEffect(() => {
    let cancelled = false;
    fetchBoosters().then(packs => {
      if (cancelled) return;
      if (packs.length === 0) {
        setState({ phase: 'empty' });
      } else {
        setState({ phase: 'browse', packs });
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Handle purchase initiation
  const startPurchase = useCallback(async (pack: BoosterPack) => {
    setState({ phase: 'purchasing', pack });
    try {
      const { purchaseId } = await purchaseBooster(pack.key);
      // In a real integration, redirect/open the payment provider UI here.
      // For sandbox: payment is auto-confirmed, so go straight to polling.
      setState({ phase: 'polling', pack, purchaseId, attempt: 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ phase: 'error', message: `Purchase failed: ${msg}`, recoverable: true });
    }
  }, []);

  // Payment polling effect
  useEffect(() => {
    if (state.phase !== 'polling') return;
    if (state.attempt >= MAX_POLL_ATTEMPTS) {
      setState({ phase: 'error', message: 'Payment confirmation timed out. If you were charged, contact support.', recoverable: false });
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const status = await checkPurchaseStatus(state.purchaseId);
        if (cancelled) return;
        if (status.status === 'paid' && status.fulfillmentToken) {
          setState({ phase: 'fulfilling', pack: state.pack, token: status.fulfillmentToken });
        } else {
          setState({ ...state, attempt: state.attempt + 1 });
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState({ phase: 'error', message: `Status check failed: ${msg}`, recoverable: true });
      }
    }, 3000);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [state]);

  // Fulfillment effect
  useEffect(() => {
    if (state.phase !== 'fulfilling') return;
    let cancelled = false;

    (async () => {
      try {
        const payload: FulfilledPayload = await fulfillBooster(state.token);
        if (cancelled) return;

        // Load-once idempotency: check if this pack was already loaded
        if (loadedFulfillmentIds.has(payload.purchaseId)) {
          setState({ phase: 'error', message: 'This pack has already been loaded into this match.', recoverable: false });
          return;
        }

        // Convert to game Card shape (IDs assigned by loadCards move)
        const cards: Card[] = payload.cards.map(c => ({
          id: 0,
          content: c.content,
          location: 'deck' as const,
        }));

        // Mark as loaded before calling onLoad (prevents double-load on re-render)
        loadedFulfillmentIds.add(payload.purchaseId);

        onLoad(cards);
        setState({ phase: 'done', pack: state.pack, cardCount: cards.length });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState({ phase: 'error', message: `Card delivery failed: ${msg}. You have not been charged.`, recoverable: true });
      }
    })();

    return () => { cancelled = true; };
  }, [state, onLoad]);

  const styles: { [key: string]: Properties<string | number> } = {
    overlay: {
      width: '90vw',
      maxWidth: '40em',
      maxHeight: '75vh',
      padding: '1em',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75em',
      alignItems: 'center',
    },
    title: {
      fontSize: '1.5em',
      fontWeight: 'bold',
    },
    grid: {
      width: '100%',
      overflowY: 'scroll',
      scrollbarWidth: 'none',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '0.75em',
      padding: '0.25em',
    },
    packCard: {
      width: '12em',
      padding: '0.75em',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.4em',
      backgroundColor: '#eee',
      borderRadius: '0.5em',
      cursor: 'pointer',
    },
    packIcon: {
      fontSize: '2em',
    },
    packName: {
      fontWeight: 'bold',
      textAlign: 'center',
      fontSize: '0.95em',
    },
    packDesc: {
      fontSize: '0.8em',
      textAlign: 'center',
      color: '#555',
      wordBreak: 'break-word',
    },
    packMeta: {
      fontSize: '0.8em',
      color: '#333',
      display: 'flex',
      gap: '0.5em',
    },
    packPrice: {
      fontWeight: 'bold',
      color: '#000',
    },
    buyButton: {
      marginTop: '0.25em',
      padding: '0.35em 0.75em',
      backgroundColor: '#ddd',
      borderRadius: '0.5em',
      fontWeight: 'bold',
      fontSize: '0.9em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    status: {
      textAlign: 'center',
      padding: '1em',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5em',
      alignItems: 'center',
    },
    statusIcon: {
      fontSize: '2.5em',
    },
    errorText: {
      color: 'red',
      textAlign: 'center',
      maxWidth: '30em',
    },
    empty: {
      color: 'grey',
      fontStyle: 'italic',
      textAlign: 'center',
    },
    closeButton: {
      height: '2.5em',
      width: '6em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ddd',
      borderRadius: '0.5em',
    },
  };

  const renderContent = () => {
    switch (state.phase) {
      case 'loading':
        return (
          <div style={styles.status}>
            <div className='spin' style={styles.statusIcon}><Icon name='loading' /></div>
            <div>Loading store…</div>
          </div>
        );

      case 'empty':
        return <div style={styles.empty}>No booster packs are available on this server.</div>;

      case 'browse':
        return (
          <div style={styles.grid}>
            {state.packs.map(pack => (
              <wired-card key={pack.key} style={styles.packCard} elevation={2}
                onClick={() => isHost ? startPurchase(pack) : undefined}
                aria-label={`Buy ${pack.name}`}
              >
                <div style={styles.packIcon} aria-hidden="true">{pack.icon}</div>
                <div style={styles.packName}>{pack.name}</div>
                <div style={styles.packDesc}>{pack.description}</div>
                <div style={styles.packMeta}>
                  <span>📦 {pack.cardCount} cards</span>
                </div>
                <div style={styles.packPrice}>{formatPrice(pack.price, pack.currency)}</div>
                {isHost && (
                  <wired-card style={styles.buyButton} elevation={1}>
                    <Icon name='done' /> Buy
                  </wired-card>
                )}
                {!isHost && (
                  <div style={{ ...styles.packDesc, color: '#999' }}>Host only</div>
                )}
              </wired-card>
            ))}
          </div>
        );

      case 'purchasing':
        return (
          <div style={styles.status}>
            <div className='spin' style={styles.statusIcon}><Icon name='loading' /></div>
            <div>Starting purchase for <strong>{state.pack.name}</strong>…</div>
          </div>
        );

      case 'polling':
        return (
          <div style={styles.status}>
            <div className='spin' style={styles.statusIcon}><Icon name='loading' /></div>
            <div>Waiting for payment confirmation…</div>
            <div style={{ fontSize: '0.8em', color: '#666' }}>
              ({state.attempt + 1}/{MAX_POLL_ATTEMPTS})
            </div>
          </div>
        );

      case 'fulfilling':
        return (
          <div style={styles.status}>
            <div className='spin' style={styles.statusIcon}><Icon name='loading' /></div>
            <div>Generating your <strong>{state.pack.name}</strong> cards…</div>
            <div style={{ fontSize: '0.8em', color: '#666' }}>This may take up to a minute</div>
          </div>
        );

      case 'done':
        return (
          <div style={styles.status}>
            <div style={styles.statusIcon}>🎉</div>
            <div><strong>{state.cardCount} cards</strong> added to the deck!</div>
            <div style={{ fontSize: '0.9em', color: '#555' }}>{state.pack.name} pack loaded successfully.</div>
          </div>
        );

      case 'error':
        return (
          <div style={styles.status}>
            <div style={styles.statusIcon}>⚠️</div>
            <div style={styles.errorText}>{state.message}</div>
            {state.recoverable && (
              <wired-card style={styles.buyButton} elevation={1}
                onClick={() => setState({ phase: 'loading' })}
              >
                <Icon name='shuffle' /> Try again
              </wired-card>
            )}
          </div>
        );
    }
  };

  return (
    <wired-dialog open={true} onClick={onClose}>
      <div style={styles.overlay} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>🛒 Booster Store</div>
        {renderContent()}
        <wired-card style={styles.closeButton} elevation={1} onClick={onClose}>
          <Icon name='exit' /> Close
        </wired-card>
      </div>
    </wired-dialog>
  );
}
