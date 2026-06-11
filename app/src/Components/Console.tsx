import type { BoardProps } from 'boardgame.io/react';
import type { GameState, Message } from '@mcteamster/white-core';
import type { Properties } from 'csstype';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import { discordSdk } from '../lib/discord';
import { useWindowDimensions } from '../lib/hooks';

interface ConsoleProps extends BoardProps<GameState> {
  playerName?: string;
}

export function Console({ moves, playerID, playerName, plugins }: ConsoleProps) {
  const messages: Message[] = (plugins as any)?.chat?.data?.messages ?? [];
  const dimensions = useWindowDimensions();
  const headerHeight = (discordSdk && dimensions.upright) ? '4.75em' : '2em';
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, open]);

  // Track unread when closed
  useEffect(() => {
    if (!open && messages.length > prevLenRef.current) {
      setUnread(u => u + (messages.length - prevLenRef.current));
    }
    prevLenRef.current = messages.length;
  }, [messages.length, open]);

  const sendMessage = () => {
    const el = document.getElementById('consoleInput') as HTMLInputElement & { value: string };
    const text = el?.value?.trim();
    if (!text || !playerID) return;
    moves.postMessage(text, playerName);
    el.value = '';
  };

  // Attach Enter key listener to the wired-input's shadow DOM input
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const inp = document.getElementById('consoleInput')?.shadowRoot?.querySelector('input');
      if (!inp) return;
      const handler = (e: Event) => { if ((e as KeyboardEvent).key === 'Enter') sendMessage(); };
      inp.addEventListener('keydown', handler);
      return () => inp.removeEventListener('keydown', handler);
    }, 50);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
    // Scroll to bottom after opening
    setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, 0);
  };

  const styles: { [key: string]: Properties<string | number> } = {
    toggle: {
      position: 'fixed',
      top: headerHeight,
      left: '0',
      zIndex: 40,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    toggleIcon: {
      backgroundColor: 'white',
      padding: '0.25em 0.5em',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '0.25em',
      borderRadius: '0 0 1em 1em',
      cursor: 'pointer',
      userSelect: 'none' as const,
      fontSize: '0.9em',
    },
    badge: {
      position: 'absolute',
      top: '-0.5em',
      right: '-0.5em',
      background: '#e74c3c',
      color: 'white',
      borderRadius: '50%',
      width: '1.2em',
      height: '1.2em',
      fontSize: '0.7em',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
    },
    panel: {
      position: 'fixed',
      top: `calc(${headerHeight} + 2.5em)`,
      left: '0',
      zIndex: 40,
      width: '320px',
      maxHeight: '40vh',
      display: 'flex',
      flexDirection: 'column',
      border: '2px solid #333',
      borderRadius: '0.5em',
      background: 'white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    },
    list: {
      overflowY: 'auto',
      flex: 1,
      padding: '0.5em',
      fontSize: '0.8em',
    },
    inputRow: {
      display: 'flex',
      borderTop: '1px solid #ccc',
      padding: '0.25em',
      gap: '0.25em',
    },
    chatMsg: {
      marginBottom: '0.3em',
    },
    eventMsg: {
      marginBottom: '0.3em',
      fontStyle: 'italic',
      color: '#888',
    },
  };

  return (
    <>
      {/* Toggle button */}
      <div style={styles.toggle} onClick={open ? () => setOpen(false) : handleOpen}>
        <div style={styles.toggleIcon}>
          <Icon name='chat' />
          Chat
          {!open && unread > 0 && (
            <span style={styles.badge}>{unread > 9 ? '9+' : unread}</span>
          )}
        </div>
      </div>

      {/* Panel */}
      {open && (
        <div style={styles.panel}>
          <div ref={listRef} style={styles.list}>
            {messages.length === 0 && (
              <div style={{ color: '#aaa', fontStyle: 'italic' }}>No messages yet</div>
            )}
            {messages.map(msg => (
              <div key={msg.id} style={msg.type === 'chat' ? styles.chatMsg : styles.eventMsg}>
                {msg.type === 'chat' ? (
                  <><strong>{msg.playerName || `Player ${msg.playerID}`}:</strong> {msg.text}</>
                ) : (
                  <>{msg.text}</>
                )}
              </div>
            ))}
          </div>
          <div style={styles.inputRow}>
            <wired-input
              id="consoleInput"
              placeholder="Say something..."
              maxlength={500}
              style={{ flex: 1, fontSize: '0.8em' }}
            ></wired-input>
            <wired-button
              onClick={sendMessage}
              style={{ fontSize: '0.8em' }}
            >Send</wired-button>
          </div>
        </div>
      )}
    </>
  );
}
