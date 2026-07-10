import type { BoardProps } from '@mcteamster/white-engine/react';
import type { GameState, Message, Rule } from '@mcteamster/white-core';
import type { Properties } from 'csstype';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import { discordSdk } from '../lib/discord';
import { useWindowDimensions } from '../lib/hooks';

interface ConsoleProps extends BoardProps<GameState> {
  playerName?: string;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Console({ G, moves, playerID, playerName, plugins, matchData, open: openProp, setOpen: setOpenProp }: ConsoleProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: Message[] = (plugins as any)?.chat?.data?.messages ?? [];
  const rules: Rule[] = G?.rules ?? [];
  const dimensions = useWindowDimensions();
  const headerHeight = (discordSdk && dimensions.upright) ? '4.75em' : '2em';
  const [localOpen, setLocalOpen] = useState(false);
  const open = openProp ?? localOpen;
  const setOpen = setOpenProp ?? setLocalOpen;
  const [unread, setUnread] = useState(0);
  const [filters, setFilters] = useState({ chat: true, events: true, rules: true });
  const [rulesExpanded, setRulesExpanded] = useState(true);
  const [ruleMode, setRuleMode] = useState(false);
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

  const resolveName = (id?: string) => matchData?.find(p => p.id === Number(id))?.name || `Player ${id}`;

  const sendMessage = () => {
    const el = document.getElementById('consoleInput') as HTMLInputElement & { value: string };
    const text = el?.value?.trim();
    if (!text || !playerID) return;
    if (ruleMode) {
      moves.declareRule(text, playerName);
      setRuleMode(false);
      if (!filters.rules) setFilters(f => ({ ...f, rules: true }));
    } else {
      moves.postMessage(text, playerName);
      if (!filters.chat) setFilters(f => ({ ...f, chat: true }));
    }
    el.value = '';
  };

  const sendRef = useRef(sendMessage);
  sendRef.current = sendMessage;

  // Attach Enter key listener to the wired-input's shadow DOM input
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const inp = document.getElementById('consoleInput')?.shadowRoot?.querySelector('input');
      if (!inp) return;
      inp.focus();
      const handler = (e: Event) => { if ((e as KeyboardEvent).key === 'Enter') sendRef.current(); };
      inp.addEventListener('keydown', handler);
      return () => inp.removeEventListener('keydown', handler);
    }, 50);
    return () => clearTimeout(timer);
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
    // Scroll to bottom and focus input after opening
    setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      const inp = document.getElementById('consoleInput')?.shadowRoot?.querySelector('input');
      if (inp) inp.focus();
    }, 50);
  };

  const styles: { [key: string]: Properties<string | number> } = {
    toggle: {
      position: 'fixed',
      top: headerHeight,
      left: '0',
      zIndex: 60,
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
      borderRadius: '0 0 1em 0',
      border: '1px solid #ccc',
      borderTop: '1px solid black',
      borderLeft: 'none',
      cursor: 'pointer',
      userSelect: 'none' as const,
      fontSize: '0.9em',
    },
    unreadCount: {
      position: 'absolute',
      top: '40%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '0.75em',
      fontWeight: 'bold',
    },
    previewText: {
      maxWidth: '240px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    panel: {
      position: 'fixed',
      top: `calc(${headerHeight} + 2.5em)`,
      left: '0.5em',
      zIndex: 60,
      width: 'calc(100vw - 1.25em)',
      maxWidth: '480px',
      height: '70vh',
      display: 'flex',
      flexDirection: 'column',
      border: '2px solid #333',
      borderRadius: '0.5em',
      background: 'white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      overscrollBehavior: 'contain',
      overflow: 'hidden',
    },
    list: {
      overflowY: 'scroll',
      overscrollBehavior: 'contain',
      scrollbarWidth: 'none',
      touchAction: 'pan-y',
      flex: 1,
      padding: '0.5em 0.5em 0.5em 0.75em',
      display: 'flex',
      flexDirection: 'column',
    },
    inputRow: {
      display: 'flex',
      alignItems: 'center',
      borderTop: '1px solid #ccc',
      padding: '0.25em 0.5em',
      gap: '0.25em',
    },
    chatMsg: {
      marginBottom: '0.3em',
      overflowWrap: 'break-word',
    },
    eventMsg: {
      marginBottom: '0.3em',
      fontStyle: 'italic',
      color: '#888',
      overflowWrap: 'break-word',
    },
    ruleMsg: {
      marginBottom: '0.3em',
      overflowWrap: 'break-word',
      color: 'red',
    },
    pinnedRules: {
      borderBottom: '1px solid #e5e7eb',
      padding: '0.4em 0.5em',
      fontSize: '0.85em',
      maxHeight: '30%',
      overflowY: 'auto' as const,
    },
    pinnedRule: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.25em',
      marginBottom: '0.2em',
    },
    pinnedRuleText: {
      flex: 1,
      color: 'red',
    },
    revokeBtn: {
      fontSize: '1em',
      cursor: 'pointer',
      color: '#999',
      flexShrink: 0,
      padding: '0 0.3em',
    },
    rulesCollapsed: {
      padding: '0.3em 0.5em',
      borderBottom: '1px solid #e5e7eb',
      fontSize: '0.8em',
      color: 'red',
      cursor: 'pointer',
      userSelect: 'none' as const,
    },
  };

  return (
    <>
      {/* Toggle button */}
      <div style={styles.toggle} onClick={open ? () => setOpen(false) : handleOpen}>
        <div style={styles.toggleIcon}>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Icon name='chat' />
            {!open && unread > 0 && (
              <span style={styles.unreadCount}>{unread > 9 ? '9+' : unread}</span>
            )}
          </span>
          {open
            ? 'Close Console'
            : !open && messages.length > 0
            ? <span style={{ ...styles.previewText, ...(messages[messages.length - 1].type === 'event' ? { fontStyle: 'italic', color: '#888' } : {}) }}>
                {messages[messages.length - 1].type === 'chat'
                  ? <><strong>{messages[messages.length - 1].playerName || resolveName(messages[messages.length - 1].playerID)}:</strong> {messages[messages.length - 1].text}</>
                  : messages[messages.length - 1].playerID
                    ? <><strong>{resolveName(messages[messages.length - 1].playerID)}</strong> {messages[messages.length - 1].targetPlayerID ? messages[messages.length - 1].text.replace('{recipient}', resolveName(messages[messages.length - 1].targetPlayerID)) : messages[messages.length - 1].text}</>
                    : messages[messages.length - 1].text
                }
              </span>
            : null
          }
        </div>
      </div>

      {/* Panel */}
      {open && (
        <div style={styles.panel}>
          <div style={{ padding: '0.3em 0.75em', borderBottom: '1px solid #e5e7eb', fontSize: '0.75em', display: 'flex', gap: '0.75em' }}>
            <span
              onClick={() => setFilters(f => ({ ...f, chat: !f.chat }))}
              style={{ cursor: 'pointer', color: filters.chat ? '#333' : '#bbb', userSelect: 'none' }}
            >chat</span>
            <span
              onClick={() => setFilters(f => ({ ...f, events: !f.events }))}
              style={{ cursor: 'pointer', color: filters.events ? '#333' : '#bbb', userSelect: 'none' }}
            >events</span>
            <span
              onClick={() => setFilters(f => ({ ...f, rules: !f.rules }))}
              style={{ cursor: 'pointer', color: filters.rules ? '#333' : '#bbb', userSelect: 'none' }}
            >rules</span>
          </div>
          {/* Pinned rules */}
          {rules.length > 0 && filters.rules && (
            rules.length > 2 && !rulesExpanded ? (
              <div style={styles.rulesCollapsed} onClick={() => setRulesExpanded(true)}>
                {rules.length} rules active ›
              </div>
            ) : (
              <div style={styles.pinnedRules}>
                {rules.length > 2 && (
                  <div style={{ cursor: 'pointer', color: '#999', fontSize: '0.75em', marginBottom: '0.2em' }} onClick={() => setRulesExpanded(false)}>
                    hide
                  </div>
                )}
                {rules.map(rule => (
                  <div key={rule.id} style={styles.pinnedRule}>
                    <span style={styles.pinnedRuleText}>• {rule.text}</span>
                    {(playerID === rule.playerID || playerID === ((plugins as any)?.player?.data?.hostPlayerID ?? '0')) && (
                      <span style={styles.revokeBtn} onClick={() => moves.revokeRule(rule.id, playerName)}>×</span>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
          <div ref={listRef} style={styles.list}>
            <div style={{ marginTop: 'auto' }} />
            {messages.filter(msg => {
              if (msg.type === 'chat' && !filters.chat) return false;
              if (msg.type === 'event' && !filters.events) return false;
              if (msg.type === 'rule' && !filters.rules) return false;
              return true;
            }).map((msg, i) => (
              <div key={`${msg.id}-${i}`} style={msg.type === 'chat' ? styles.chatMsg : msg.type === 'rule' ? styles.ruleMsg : styles.eventMsg}>
                {msg.type === 'chat' ? (
                  <><strong>{msg.playerName || resolveName(msg.playerID)}:</strong> {msg.text}</>
                ) : msg.type === 'rule' ? (
                  <><strong>{msg.playerName || resolveName(msg.playerID)}</strong> declared rule: {msg.text}</>
                ) : (
                  <>{msg.playerID ? <><strong>{resolveName(msg.playerID)}</strong> {msg.targetPlayerID ? msg.text.replace('{recipient}', resolveName(msg.targetPlayerID)) : msg.text}</> : msg.text}</>
                )}
              </div>
            ))}
          </div>
          <div style={styles.inputRow}>
            <wired-input
              id="consoleInput"
              placeholder={ruleMode ? "Declare a rule..." : "All chat - visible to everyone"}
              maxlength={ruleMode ? 200 : 500}
              style={{ flex: 1, color: ruleMode ? 'red' : 'inherit' }}
            ></wired-input>
            <wired-button
              onClick={() => setRuleMode(r => !r)}
              style={{ backgroundColor: ruleMode ? '#eee' : 'white' }}
            ><Icon name='book' /></wired-button>
            <wired-button
              onClick={sendMessage}
              style={{ backgroundColor: '#eee' }}
            ><Icon name='send' /></wired-button>
          </div>
          <div style={{ padding: '0 0 0.25em 0', fontSize: '0.8em', color: '#aaa', textAlign: 'center' }}>
            Do not share personal information.
          </div>
        </div>
      )}
    </>
  );
}
