import { Properties } from 'csstype';
import { Icon } from '../Icons';
import { Card } from '../../Cards';

// Selection Action Buttons Component
export function SelectionActions({ 
  selectedCards, 
  deck, 
  onEdit, 
  onHide, 
  onShow, 
  onDelete, 
  onClear 
}: {
  selectedCards: Set<number>;
  deck: any;
  onEdit: () => void;
  onHide: () => void;
  onShow: () => void;
  onDelete: () => void;
  onClear: () => void;
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
        {allSelectedHidden ? 'Show' : 'Hide'}
      </wired-card>
      
      <wired-card 
        style={{...styles.selectionButton, ...styles.deleteButton}} 
        onClick={onDelete} 
        elevation={2}
      >
        <Icon name="discard" /> Delete
      </wired-card>
      
      <wired-card style={styles.selectionButton} onClick={onClear} elevation={2}>
        Clear ({selectedCards.size})
      </wired-card>
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
      gap: '0.25em',
      marginTop: '0.5em'
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
      {[
        { mode: 'full' as const, icon: 'stop' },
        { mode: 'compact' as const, icon: 'view_list' },
        { mode: 'image' as const, icon: 'view_module' }
      ].map(({ mode, icon }) => (
        <wired-card 
          key={mode}
          style={{ 
            ...styles.viewModeButton,
            backgroundColor: viewMode === mode ? '#ccc' : 'white'
          }}
          onClick={() => onViewModeChange(mode)}
        >
          <Icon name={icon as any} />
        </wired-card>
      ))}
    </div>
  );
}
