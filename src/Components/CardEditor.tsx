import { useState, useEffect, useRef } from 'react';
import { Card } from '../Cards';
import { resizeImage, compressImage } from '../lib/images';
import { Icon } from './Icons';

interface CardEditorProps {
  onSave: (card: Omit<Card, 'id'>) => void;
  onCancel: () => void;
  editingCard?: Card;
}

export function CardEditor({ onSave, onCancel, editingCard }: CardEditorProps) {
  const [title, setTitle] = useState(editingCard?.content.title || '');
  const [description, setDescription] = useState(editingCard?.content.description || '');
  const [author, setAuthor] = useState(editingCard?.content.author || '');
  const [mode, setMode] = useState<'form' | 'draw'>('form');
  const [hasDrawing, setHasDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simple drawing state for the editor canvas
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas size
        canvas.width = 400;
        canvas.height = 400;
        
        // Clear and set white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set drawing style
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [mode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setLastPos({ x, y });
    setHasDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    setLastPos({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      alert('Please fill in title and description');
      return;
    }

    let imageData;
    if (hasDrawing && canvasRef.current) {
      const image = await resizeImage(canvasRef.current.toDataURL("image/png"));
      if (import.meta.env.VITE_COMPRESS_IMAGES === 'true') {
        imageData = await compressImage(image);
      } else {
        imageData = image;
      }
    }

    const card: Omit<Card, 'id'> = {
      content: {
        title: title.trim(),
        description: description.trim(),
        author: author.trim() || 'anon',
        image: imageData,
        date: String(Number(new Date())),
      },
      location: 'deck',
      timestamp: Number(new Date()),
    };

    onSave(card);
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHasDrawing(false);
      }
    }
  };

  if (mode === 'draw') {
    return (
      <wired-card style={{ padding: '1em' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1em' }}>
          <h3>Draw Your Card</h3>
          <div style={{ display: 'flex', gap: '0.5em' }}>
            <wired-card style={{ padding: '0.5em', cursor: 'pointer' }} onClick={clearCanvas}>
              Clear
            </wired-card>
            <wired-card style={{ padding: '0.5em', cursor: 'pointer' }} onClick={() => setMode('form')}>
              <Icon name="create" /> Back to Form
            </wired-card>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1em' }}>
          <canvas 
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{ 
              border: '2px solid #ccc',
              borderRadius: '8px',
              backgroundColor: 'white',
              cursor: 'crosshair'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1em' }}>
          <wired-card style={{ padding: '0.5em 1em', cursor: 'pointer' }} onClick={onCancel}>
            Cancel
          </wired-card>
          <wired-card style={{ padding: '0.5em 1em', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white' }} onClick={handleSave}>
            Save Card
          </wired-card>
        </div>
      </wired-card>
    );
  }

  return (
    <wired-card style={{ padding: '1em' }}>
      <h3>{editingCard ? 'Edit Card' : 'Create New Card'}</h3>
      
      <div style={{ marginBottom: '1em' }}>
        <label style={{ display: 'block', marginBottom: '0.5em' }}>Title:</label>
        <wired-input
          placeholder="Card title..."
          value={title}
          onInput={(e: any) => setTitle(e.target.value)}
          style={{ width: '100%', fontSize: '1em' }}
        />
      </div>

      <div style={{ marginBottom: '1em' }}>
        <label style={{ display: 'block', marginBottom: '0.5em' }}>Description:</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '0.5em', 
            fontSize: '1em', 
            minHeight: '100px', 
            resize: 'vertical',
            border: 'none',
            borderRadius: '0.25em',
            fontFamily: "'Patrick Hand SC', Arial, Helvetica, sans-serif",
            backgroundColor: 'white'
          }}
          placeholder="Card description or rules..."
        />
      </div>

      <div style={{ marginBottom: '1em' }}>
        <label style={{ display: 'block', marginBottom: '0.5em' }}>Author:</label>
        <wired-input
          placeholder="Your name (optional)"
          value={author}
          onInput={(e: any) => setAuthor(e.target.value)}
          style={{ width: '100%', fontSize: '1em' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1em' }}>
        <wired-card 
          style={{ padding: '0.5em 1em', cursor: 'pointer', backgroundColor: '#2196F3', color: 'white' }}
          onClick={() => setMode('draw')}
        >
          <Icon name="create" /> Add Drawing
        </wired-card>
        {(editingCard?.content.image || hasDrawing) && (
          <span style={{ fontSize: '0.9em', color: '#666' }}>📷 Has image</span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1em' }}>
        <wired-card style={{ padding: '0.5em 1em', cursor: 'pointer' }} onClick={onCancel}>
          Cancel
        </wired-card>
        <wired-card 
          style={{ 
            padding: '0.5em 1em', 
            cursor: (!title.trim() || !description.trim()) ? 'not-allowed' : 'pointer',
            backgroundColor: '#4CAF50', 
            color: 'white',
            opacity: (!title.trim() || !description.trim()) ? 0.5 : 1
          }}
          onClick={(!title.trim() || !description.trim()) ? undefined : handleSave}
        >
          {editingCard ? 'Update Card' : 'Create Card'}
        </wired-card>
      </div>
    </wired-card>
  );
}
