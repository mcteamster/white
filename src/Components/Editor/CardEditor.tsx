import { useState, useEffect, useRef } from 'react';
import { Card } from '../../Cards';
import { Icon } from '../Icons';
//@ts-expect-error: JS Module
import { sketchpad, strokes } from '../../Canvas.js';
import { resizeImage, compressImage, decompressImage } from '../../lib/images';
//@ts-expect-error: JS Module
import { undo } from '../../Canvas.js';

interface CardEditorProps {
  onSave: (card: Omit<Card, 'id'>) => void;
  onCancel: () => void;
  editingCard?: Card;
  onShowDrawingControls: (show: boolean, handlers: { onBack: () => void, onUndo: () => void, onCancel: () => void }) => void;
}

export function CardEditor({ onSave, onCancel, editingCard, onShowDrawingControls }: CardEditorProps) {
  const [title, setTitle] = useState(editingCard?.content.title || '');
  const [description, setDescription] = useState(editingCard?.content.description || '');
  const [author, setAuthor] = useState(editingCard?.content.author || '');
  const [image, setImage] = useState(editingCard?.content.image);
  const [displayImage, setDisplayImage] = useState<string | undefined>(undefined);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  // Decompress image for display
  useEffect(() => {
    const loadImage = async () => {
      if (image) {
        if (image.startsWith('data:image/')) {
          setDisplayImage(image);
        } else {
          const decompressed = await decompressImage(image);
          setDisplayImage(decompressed);
        }
      } else {
        setDisplayImage(undefined);
      }
    };
    loadImage();
  }, [image]);

  const hideSketchpad = () => {
    const create = document.getElementById('create') as HTMLElement;
    if (create) {
      create.style.display = 'none';
    }
    onShowDrawingControls(false, { onBack: () => {}, onUndo: () => {}, onCancel: () => {} });
  };

  const cancelDrawing = () => {
    hideSketchpad();
    if (!editingCard) {
      // For new cards, cancel the entire card creation
      onCancel();
    }
  };

  const showSketchpad = async () => {
    const create = document.getElementById('create') as HTMLElement;
    if (create) {
      create.style.display = 'flex';
      
      // Create custom undo handler that preserves base image
      const customUndo = () => {
        if (baseImageRef.current) {
          // If editing with base image, only undo if there are user strokes
          if (strokes.length === 0) {
            return; // No user strokes to undo, keep base image
          }
          
          // Remove last stroke first
          strokes.pop();
          
          // Clear canvas and redraw base image + remaining strokes
          const canvas = document.getElementById("sketchpad") as HTMLCanvasElement;
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw cached base image (synchronous, no flash)
          ctx?.drawImage(baseImageRef.current, 0, 0, canvas.width, canvas.height);
          
          // Replay all remaining strokes on top
          sketchpad.recordPaused = true;
          for (let i = 0; i < strokes.length; i++) {
            const stroke = strokes[i];
            if (!stroke?.segments?.length) continue;

            sketchpad.mode = stroke.mode;
            sketchpad.weight = stroke.weight;
            sketchpad.smoothing = stroke.smoothing;
            sketchpad.color = stroke.color;
            sketchpad.adaptiveStroke = stroke.adaptiveStroke;

            const segments = [...stroke.segments];
            const firstPoint = segments.shift().point;
            sketchpad.beginStroke(firstPoint.x, firstPoint.y);

            let prevPoint = firstPoint;
            while (segments.length > 0) {
              const point = segments.shift().point;
              const { x, y } = sketchpad.draw(point.x, point.y, prevPoint.x, prevPoint.y);
              prevPoint = { x, y };
            }

            sketchpad.endStroke(prevPoint.x, prevPoint.y);
          }
          sketchpad.recordPaused = false;
        } else {
          // No base image, use normal undo
          undo();
        }
      };
      
      onShowDrawingControls(true, { onBack: captureDrawing, onUndo: customUndo, onCancel: cancelDrawing });
      
      // Load existing image if editing
      if (image) {
        const canvas = document.getElementById("sketchpad") as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Cache the loaded image for undo
          baseImageRef.current = img;
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
        baseImageRef.current = null;
      }
    }
  };

  useEffect(() => {
    // Reset sketchpad state when opening editor for new card
    if (!editingCard) {
      sketchpad.clear();
      strokes.length = 0;
    }
  }, [editingCard]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      onShowDrawingControls(false, { onBack: () => {}, onUndo: () => {}, onCancel: () => {} });
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
    imageThumbnail: {
      width: '3em',
      height: '3em',
      backgroundColor: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      overflow: 'hidden'
    },
    thumbnailImage: {
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain' as const
    },
    noImage: {
      color: '#999',
      fontSize: '0.8em',
      textAlign: 'center' as const
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
            
            <wired-card style={modalStyles.imageThumbnail} onClick={showSketchpad} elevation={2}>
              {displayImage ? (
                <img src={displayImage} style={modalStyles.thumbnailImage} alt="Card image" />
              ) : (
                <div style={modalStyles.noImage}>Draw</div>
              )}
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
