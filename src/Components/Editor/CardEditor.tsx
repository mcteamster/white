import { useState, useEffect } from 'react';
import { Card } from '../../Cards';
import { Icon } from '../Icons';
//@ts-expect-error: JS Module
import { sketchpad, strokes } from '../../Canvas.js';
import { resizeImage, decompressImage, compressImage } from '../../lib/images';
//@ts-expect-error: JS Module
import { undo } from '../../Canvas.js';

interface CardEditorProps {
  onSave: (card: Omit<Card, 'id'>) => void;
  onCancel: () => void;
  editingCard?: Card;
  onShowDrawingControls: (show: boolean, handlers: { onBack: () => void; onUndo: () => void; onRedo: () => void }) => void;
}

function DrawingControls({ onBack, onUndo, onClear }: { onBack: () => void; onUndo: () => void; onClear: () => void }) {
  const styles = {
    container: {
      position: 'fixed' as const,
      top: '20px',
      left: '20px',
      zIndex: 999,
      display: 'flex',
      gap: '1em',
      backgroundColor: 'rgba(255,255,255,0.9)',
      padding: '10px',
      borderRadius: '8px'
    },
    button: {
      cursor: 'pointer',
      width: '4em',
      height: '3em',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column' as const,
      fontSize: '0.8em'
    }
  };

  return (
    <div style={styles.container}>
      <wired-card elevation={2} style={styles.button} onClick={onBack}>
        <Icon name="exit" />
        Close
      </wired-card>
      <wired-card elevation={2} style={styles.button} onClick={onUndo}>
        <Icon name="undo" />
        Undo
      </wired-card>
      <wired-card elevation={2} style={styles.button} onClick={onClear}>
        <Icon name="discard" />
        Clear
      </wired-card>
    </div>
  );
}

export function CardEditor({ onSave, onCancel, editingCard, onShowDrawingControls }: CardEditorProps) {
  const [title, setTitle] = useState(editingCard?.content.title || '');
  const [description, setDescription] = useState(editingCard?.content.description || '');
  const [author, setAuthor] = useState(editingCard?.content.author || '');
  const [image, setImage] = useState(editingCard?.content.image);
  const [thumbnailSrc, setThumbnailSrc] = useState<string>('');

  useEffect(() => {
    const loadThumbnail = async () => {
      if (image) {
        setImageLoading(true);
        try {
          if (image.startsWith('data:image/')) {
            // Small delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 100));
            setThumbnailSrc(image);
          } else {
            console.log('Decompressing image...');
            const decompressed = await decompressImage(image);
            setThumbnailSrc(decompressed);
          }
        } catch (error) {
          console.error('Error loading image:', error);
        } finally {
          setImageLoading(false);
        }
      } else {
        setThumbnailSrc('');
        setImageLoading(false);
      }
    };
    loadThumbnail();
  }, [image]);

  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    // Placeholder for redo functionality
    console.log('Redo not implemented yet');
  };

  const hideSketchpad = () => {
    const create = document.getElementById('create') as HTMLElement;
    if (create) {
      create.style.display = 'none';
    }
    onShowDrawingControls(false, { onBack: () => {}, onUndo: () => {}, onRedo: () => {} });
  };

  const showSketchpad = async () => {
    const create = document.getElementById('create') as HTMLElement;
    if (create) {
      create.style.display = 'flex';
      onShowDrawingControls(true, { onBack: captureDrawing, onUndo: handleUndo, onRedo: handleRedo });
      
      // Load existing image if editing
      if (image) {
        const canvas = document.getElementById("sketchpad") as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        
        // Check if image is compressed (doesn't start with data:image)
        if (image.startsWith('data:image/')) {
          img.src = image;
        } else {
          // Decompress the image first
          const decompressed = await decompressImage(image);
          img.src = decompressed;
        }
      } else {
        // Clear canvas for new card
        sketchpad.clear();
        strokes.length = 0;
      }
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      onShowDrawingControls(false, { onBack: () => {}, onUndo: () => {}, onRedo: () => {} });
    };
  }, []);

  const captureDrawing = async () => {
    if (strokes.length > 0) {
      const canvas = document.getElementById("sketchpad") as HTMLCanvasElement;
      const image = await resizeImage(canvas.toDataURL("image/png"));
      let imageData;
      if (import.meta.env.VITE_COMPRESS_IMAGES === 'true' && image) {
        imageData = await compressImage(image);
      } else {
        imageData = image;
      }
      setImage(imageData);
    }
    hideSketchpad();
  };

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
      alignItems: 'center',
      marginTop: '1em'
    },
    button: {
      cursor: 'pointer',
      width: '3em',
      height: '3em'
    },
    thumbnail: {
      cursor: 'pointer',
      width: '4.5em',
      height: '4.5em'
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
        image: image,
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
            {thumbnailSrc ? (
              <wired-card elevation={2} style={{ backgroundColor: 'white', borderRadius: '8px', ...modalStyles.thumbnail }} onClick={showSketchpad}>
                <img 
                  src={thumbnailSrc} 
                  alt="Card thumbnail" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                />
              </wired-card>
            ) : imageLoading ? (
              <wired-card elevation={2} style={{ backgroundColor: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...modalStyles.thumbnail }}>
                <Icon name="loading" />
              </wired-card>
            ) : (
              <wired-card elevation={2} style={{ backgroundColor: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...modalStyles.thumbnail }} onClick={showSketchpad}>
                <Icon name="pile" />
              </wired-card>
            )}
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
