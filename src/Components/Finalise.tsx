import type { Properties } from 'csstype';

interface FinaliseProps {
  multiplayer: boolean;
}

export function Finalise({ multiplayer }: FinaliseProps) {
  const styles: { [key: string]: Properties<string | number> } = {
    finalise: {
      width: '100%',
      height: '100%',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '7',
      textAlign: 'center',
      display: 'none',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    submit: {
      width: 'min(70vw, 45vh)',
      height: 'min(70vw, 45vh)',
      backgroundColor: '#eee',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      width: '95%',
      fontSize: '1.25em',
      fontWeight: 'bold',
    },
    author: {
      width: '95%',
      fontSize: '0.75em',
    },
    flavourbox: {
      width: '100%',
      padding: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    description: {
      width: 'min(60vw, 35vh)',
      minHeight: '6em',
      margin: '0.5em',
      padding: '0.5em',
      border: 'none',
      borderRadius: '0.25em',
      fontFamily: "'Patrick Hand SC', Arial, Helvetica, sans-serif",
      fontSize: '1em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'white',
    },
  };

  return (
    <div id="finalise" style={styles.finalise}>
      <wired-card elevation={5} style={styles.submit} onClick={e => e.stopPropagation()}>
        <wired-input id="titleInput" style={styles.title} placeholder="Title" maxlength={50}></wired-input>
        <wired-card id="flavourbox" style={styles.flavourbox}>
          <textarea id="descriptionInput" style={styles.description} placeholder="Description" maxLength={140} required></textarea>
        </wired-card>
        <wired-input id="authorInput" style={styles.author} placeholder="Author" maxlength={25}></wired-input>
        <div style={styles.author}>Cards created under Creative Commons CC-BY 4.0.</div>
        <div style={{ ...styles.author, color: multiplayer ? 'black' : 'red' }}>{multiplayer ? 'Multiplayer match data is deleted periodically' : 'Persistently published to the Global Deck'}</div>
      </wired-card>
    </div>
  );
}