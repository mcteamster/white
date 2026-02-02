import { useState } from 'react';
import { Card } from '../../Cards';
import { Icon } from '../Icons';

interface CardEditorProps {
  onSave: (card: Omit<Card, 'id'>) => void;
  onCancel: () => void;
  editingCard?: Card;
}

export function CardEditor({ onSave, onCancel, editingCard }: CardEditorProps) {
  const [title, setTitle] = useState(editingCard?.content.title || '');
  const [description, setDescription] = useState(editingCard?.content.description || '');
  const [author, setAuthor] = useState(editingCard?.content.author || '');

  const modalStyles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    finalise: {
      width: '100%',
      height: '100%',
      position: 'fixed' as const,
      top: '0',
      left: '0',
      zIndex: '7',
      textAlign: 'center' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
    },
    submit: {
      width: 'min(70vw, 45vh)',
      minWidth: '280px',
      backgroundColor: '#eee',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1em'
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
      minWidth: '240px',
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
    buttons: {
      display: 'flex',
      gap: '1em',
      justifyContent: 'center',
      marginTop: '1em'
    },
    button: {
      cursor: 'pointer',
      width: '3em'
    }
  };

  const handleSave = () => {
    if (!title.trim() || !description.trim()) {
      return;
    }

    const card: Omit<Card, 'id'> = {
      content: {
        title: title.trim(),
        description: description.trim(),
        author: author.trim() || 'anon',
        image: editingCard?.content.image,
        date: String(Number(new Date())),
      },
      location: 'deck',
      timestamp: Number(new Date()),
    };

    onSave(card);
  };

  return (
    <div style={modalStyles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={modalStyles.finalise}>
        <wired-card elevation={5} style={modalStyles.submit} onClick={e => e.stopPropagation()}>
          <wired-input 
            placeholder="Title" 
            value={title}
            onInput={(e: any) => setTitle(e.target.value)}
            style={modalStyles.title} 
            maxlength={50}
          />
          
          <wired-card style={modalStyles.flavourbox}>
            <textarea 
              placeholder="Describe what this card does here" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={modalStyles.description} 
              maxLength={140}
            />
          </wired-card>
          
          <wired-input 
            placeholder="Author" 
            value={author}
            onInput={(e: any) => setAuthor(e.target.value)}
            style={modalStyles.author} 
            maxlength={25}
          />

          <div style={modalStyles.buttons}>
            <wired-card style={modalStyles.button} onClick={onCancel} elevation={2}>
              <Icon name="exit" /> Cancel
            </wired-card>
            <wired-card 
              style={{
                ...modalStyles.button,
                cursor: (!title.trim() || !description.trim()) ? 'not-allowed' : 'pointer'
              }}
              onClick={(!title.trim() || !description.trim()) ? undefined : handleSave}
              elevation={2}
            >
              <Icon name="done" /> {editingCard ? 'Update' : 'Create'}
            </wired-card>
          </div>
        </wired-card>
      </div>
    </div>
  );
}
