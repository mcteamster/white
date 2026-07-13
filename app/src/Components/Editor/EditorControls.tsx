import { useState, useEffect } from 'react';
import { Properties } from 'csstype';
import { Icon } from '../Icons';
import { Card } from '@mcteamster/white-core';
import { DeckEditorState } from '../../lib/editor';
//@ts-expect-error: JS Module
import { fillWhite, cycleBrushSize, getCurrentBrushSize, getMode, setMode, MODE_DRAW, MODE_ERASE, MODE_DOTS } from '../../Canvas.js';

// Selection Action Buttons Component
export function SelectionActions({ 
  selectedCards, 
  deck, 
  onEdit, 
  onHide, 
  onShow, 
  onDelete
}: {
  selectedCards: Set<number>;
  deck: DeckEditorState;
  onEdit: () => void;
  onHide: () => void;
  onShow: () => void;
  onDelete: () => void;
}) {
  const styles: { [key: string]: Properties<string | number> } = {
    selectionButton: {
      height: '3em',
      width: '3em',
      margin: '0.25em',
      fontWeight: 'bold',
      textAlign: 'center',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#eee',
      borderRadius: '1em',
      cursor: 'pointer'
    },
    deleteButton: {
      color: 'red'
    }
  };

  const allSelectedHidden = Array.from(selectedCards).every(id => 
    deck.cards.find((card: Card) => card.id === id)?.location === 'box'
  );

  return (
    <>
      {selectedCards.size === 1 && (
        <wired-card style={styles.selectionButton} onClick={onEdit} elevation={2}>
          <Icon name="create" /> Edit
        </wired-card>
      )}
      
      <wired-card 
        style={styles.selectionButton} 
        onClick={allSelectedHidden ? onShow : onHide} 
        elevation={2}
      >
        <Icon name={allSelectedHidden ? "show" : "hide"} /> {allSelectedHidden ? 'Show' : 'Hide'}
      </wired-card>
      
      {allSelectedHidden && (
        <wired-card 
          style={{...styles.selectionButton, ...styles.deleteButton}} 
          onClick={onDelete} 
          elevation={2}
        >
          <Icon name="discard" /> Delete
        </wired-card>
      )}
    </>
  );
}

// View Mode Toggle Component
export function ViewModeToggle({ 
  viewMode, 
  onViewModeChange 
}: {
  viewMode: 'full' | 'compact' | 'image';
  onViewModeChange: (mode: 'full' | 'compact' | 'image') => void;
}) {
  const styles: { [key: string]: Properties<string | number> } = {
    viewModeToggle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.25em'
    },
    viewModeButton: {
      padding: '0.5em', 
      cursor: 'pointer',
      color: 'black',
      borderRadius: '1em',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  };

    return (
    <div style={styles.viewModeToggle}>
      {([
        { mode: 'full' as const, icon: 'stop' as const },
        { mode: 'compact' as const, icon: 'view_list' as const },
        { mode: 'image' as const, icon: 'view_module' as const }
      ]).map(({ mode, icon }) => (
        <wired-card 
          key={mode}
          style={{ 
            ...styles.viewModeButton,
            backgroundColor: viewMode === mode ? '#ccc' : 'white'
          }}
          onClick={() => onViewModeChange(mode)}
        >
          <Icon name={icon} />
        </wired-card>
      ))}
    </div>
  );
}

// Drawing Controls Component
export function DrawingControls({ onBack, onUndo, onRedo, onCancel }: { 
  onBack: () => void,
  onUndo: () => void,
  onRedo: () => void,
  onCancel: () => void
}) {
  const [drawMode, setDrawMode] = useState<string>(MODE_DRAW);
  const [brushSize, setBrushSize] = useState('Medium');
  const [handlersReady, setHandlersReady] = useState(false);

  // Reset to draw mode when component mounts
  useEffect(() => {
    setMode(MODE_DRAW);
    setDrawMode(MODE_DRAW);
    setBrushSize(getCurrentBrushSize());
  }, []);

  // Check if handlers are ready (not empty functions)
  useEffect(() => {
    setHandlersReady(onBack.toString() !== '() => {}');
  }, [onBack, onCancel]);

  const handleEraserToggle = () => {
    const newMode = drawMode === MODE_ERASE ? MODE_DRAW : MODE_ERASE;
    setMode(newMode);
    setDrawMode(newMode);
  };

  const handleStippleToggle = () => {
    const newMode = drawMode === MODE_DOTS ? MODE_DRAW : MODE_DOTS;
    setMode(newMode);
    setDrawMode(newMode);
  };

  const handleUndo = () => {
    const currentMode = getMode();
    onUndo();
    setMode(currentMode);
  };

  const handleRedo = () => {
    const currentMode = getMode();
    onRedo();
    setMode(currentMode);
  };

  const handleBrushSizeToggle = () => {
    const newSize = cycleBrushSize();
    setBrushSize(newSize);
  };

  const handleClear = () => {
    fillWhite();
    setDrawMode(getMode());
  };

  const styles = {
    topRow: {
      position: 'fixed' as const,
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      display: 'flex',
      justifyContent: 'space-around',
      width: '100%',
      maxWidth: '40em',
    },
    bottomRow: {
      position: 'fixed' as const,
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      display: 'flex',
      justifyContent: 'space-around',
      width: '100%',
      maxWidth: '40em',
    },
    button: {
      cursor: 'pointer',
      width: '3em',
      height: '3em',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column' as const,
      backgroundColor: 'white',
      borderRadius: '1em'
    }
  };

  return (
    <>
      <div style={styles.topRow}>
        <wired-card elevation={2} style={{ ...styles.button, color: 'red' }} onClick={handleClear}>
          <Icon name="discard" />
          Clear
        </wired-card>
        <wired-card
          elevation={2}
          style={{
            ...styles.button,
            color: drawMode === MODE_ERASE ? 'red' : undefined
          }}
          onClick={handleEraserToggle}
        >
          <Icon name="wand" />
          Erase
        </wired-card>
        <wired-card elevation={2} style={styles.button} onClick={handleBrushSizeToggle}>
          <Icon name="weight" />
          {brushSize}
        </wired-card>
        <wired-card
          elevation={2}
          style={styles.button}
          onClick={handleStippleToggle}
        >
          <Icon name={drawMode === MODE_DOTS ? 'stipple' : 'solid'} />
          {drawMode === MODE_DOTS ? 'Dots' : 'Solid'}
        </wired-card>
      </div>
      <div style={styles.bottomRow}>
        <wired-card elevation={2} style={{ ...styles.button, color: handlersReady ? undefined : 'grey' }} onClick={handlersReady ? onCancel : undefined}>
          <Icon name="exit" />
          Cancel
        </wired-card>
        <wired-card elevation={2} style={styles.button} onClick={handleUndo}>
          <Icon name="undo" />
          Undo
        </wired-card>
        <wired-card elevation={2} style={styles.button} onClick={handleRedo}>
          <Icon name="redo" />
          Redo
        </wired-card>
        <wired-card elevation={2} style={{ ...styles.button, color: handlersReady ? undefined : 'grey' }} onClick={handlersReady ? onBack : undefined}>
          <Icon name="done" />
          Done
        </wired-card>
      </div>
    </>
  );
}
