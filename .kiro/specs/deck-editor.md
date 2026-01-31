# Deck Editor Tool Specification

## Overview
Add a comprehensive deck editor tool that allows users to create, edit, and manage custom card decks outside of gameplay, with visual card creation similar to the in-game interface.

## Requirements
- **Editor Type**: Basic editor with visual card creation interface (reusing existing canvas/drawing system)
- **Access Method**: Separate `/editor` route accessible from main navigation  
- **Storage**: File system storage using existing HTML deck format
- **Features**: Standard deck management - create/edit cards, save/load, duplicate decks, merge decks, deck statistics

## Technical Context
### Existing Components to Reuse
- Card creation interface in `ActionSpace.tsx` with canvas drawing via `Canvas.js` (Atrament library)
- Deck export/import system in `data.ts` that creates self-contained HTML files
- Card schema: `{id, content: {title, description, author, date, image}, location, likes}`
- React Router setup in `App.tsx` with existing routes
- Image processing system (`images.ts`) for compression and standardization

### File Format
Uses existing deck format - self-contained HTML files with embedded JSON data (see `downloadDeck` function in `data.ts`)

## Implementation Tasks

### Task 1: Basic Editor Route and Navigation
**Objective**: Create accessible deck editor entry point
- Add `/editor` route to `App.tsx` routing configuration
- Create new `DeckEditor.tsx` component with basic layout
- Add navigation link to editor from main lobby/navigation
- **Demo**: Editor page accessible via `/editor` with placeholder content

### Task 2: Deck State Management and File Operations  
**Objective**: Core deck file handling capabilities
- Create deck state management hooks for current working deck
- Implement file upload handler for loading existing deck HTML files
- Add deck creation (new empty deck) functionality
- Implement deck save functionality using existing `downloadDeck` format
- **Demo**: Can create new deck, load existing deck file, and save deck to file

### Task 3: Card List Management Interface
**Objective**: Deck overview and organization tools
- Create card list component showing all cards in current deck
- Add card deletion and basic editing capabilities  
- Implement card reordering/organization features
- Add deck statistics display (card count, authors, etc.)
- **Demo**: Can view, delete, and reorder cards in loaded deck

### Task 4: Visual Card Creation Interface
**Objective**: Integrate existing card creation system
- Extract and adapt card creation components from `ActionSpace.tsx`
- Integrate canvas drawing system (`Canvas.js`) into editor
- Implement card creation form (title, description, author, image)
- Add card editing capability (modify existing cards)
- **Demo**: Can create new cards with drawing interface and edit existing cards

### Task 5: Advanced Deck Management Features
**Objective**: Power user functionality
- Implement deck duplication functionality
- Add deck merging capability (combine multiple decks)
- Create deck import/export utilities for batch operations
- Add search/filter functionality for large decks
- **Demo**: Can duplicate decks, merge multiple decks, and search through cards

## Success Criteria
- Users can access deck editor via `/editor` route
- Complete deck lifecycle: create → edit cards → save → load → modify
- Visual card creation matches in-game experience
- File format compatibility with existing deck system
- Advanced operations (duplicate, merge, search) work reliably
- Card selection system enables efficient bulk operations
- Single card editing provides full property modification
- Hidden/reported cards are properly managed and filtered

## Card Selection System Extension

### Overview
Extend the deck editor with interactive card selection capabilities, enabling users to select single or multiple cards for various operations including editing, hiding, and deletion.

### Selection Requirements
- **Selection Method**: Single click to select/deselect cards (toggle behavior)
- **Multi-selection**: Support selecting multiple cards simultaneously
- **Visual Feedback**: Selected cards show background color change
- **Persistence**: Selection state preserved when switching between view modes (Full/List/Tile)

### Selection-Based Operations

#### Single Card Selected
- **Edit Action**: Opens CardEditor component in modal overlay for full property editing
- **All Properties Editable**: Title, description, author, date, and image replacement

#### Multiple Cards Selected  
- **Hide Action**: Sets `location: 'box'` on selected cards (uses existing card location field)
- **Delete Action**: Removes selected cards from deck entirely
- **No Bulk Edit**: Editing disabled when multiple cards selected

### UI Components

#### Selection Feedback
- **Selected State**: Background color change on selected cards
- **Hidden Cards**: Visual indicator (opacity/strikethrough) for cards with `location: 'box'`
- **Consistent Styling**: Selection appearance works across all view modes

#### Selection Controls
- **Deselect Button**: Shows selection count and clears all selections ("Deselect (X)")
- **Action Buttons**: Context-sensitive buttons appear in bottom panel when cards selected
  - Single selection: "Edit" button
  - Multiple selection: "Hide" and "Delete" buttons
- **Integration**: Selection controls added to existing bottom controls area

### Technical Implementation

#### State Management
- `selectedCards: Set<number>` - Track selected card IDs
- `handleCardSelect(cardId: number)` - Toggle card selection
- `clearSelection()` - Clear all selections

#### Card Component Extensions
- Add click handlers to all card view components (FullCardView, CompactCardView, ImageOnlyCardView)
- Pass selection state and handlers as props
- Apply conditional styling based on selection and report status

#### Hide/Show Functionality
- Leverage existing `location` field in card metadata (`'deck'` = visible, `'box'` = hidden)
- Update game view filtering to respect `location: 'box'` status (already implemented in existing system)
- Provide visual distinction for hidden cards in editor

### Implementation Tasks Extension

#### Task 6: Card Selection State Management
**Objective**: Core selection functionality
- Add selection state (`selectedCards` Set) to DeckEditor component
- Implement `handleCardSelect` toggle function
- Add `clearSelection` function
- **Demo**: Click cards to see selection state logged to console

#### Task 7: Visual Selection Feedback
**Objective**: User interface for selection
- Extend all card view components with click handlers and selection props
- Add conditional background styling for selected state
- Implement visual indicators for hidden/reported cards
- **Demo**: Cards change appearance when selected, hidden cards visually distinct

#### Task 8: Selection Action Panel
**Objective**: Operations on selected cards
- Add selection count display to bottom controls
- Create "Deselect (X)" button with dynamic count
- Add context-sensitive action buttons (Edit/Hide/Show/Delete)
- Implement modal CardEditor for single card editing
- **Demo**: All selection actions work correctly, edit modal functions properly, Hide/Show toggles based on card visibility

#### Task 9: Hide/Show Card Management
**Objective**: Card visibility control
- Implement Hide action (sets `location: 'box'`)
- Add Show action for unhiding cards (sets `location: 'deck'`)
- Leverage existing filtering logic that respects `location: 'box'` in game contexts
- **Demo**: Cards can be hidden/shown, filtering works in game views, compatible with deck export/import

#### Task 10: Selection Persistence
**Objective**: Maintain selection across view changes
- Preserve `selectedCards` Set when switching view modes
- Handle edge cases (filtered cards, deleted cards, cleared deck)
- Ensure consistent selection behavior across all views
- **Demo**: Selection maintained when switching between Full/List/Tile views

## Files to Create/Modify
- `src/Components/DeckEditor.tsx` (new)
- `src/App.tsx` (add route)
- `src/lib/deckEditor.ts` (new - state management utilities)
- Navigation components (add editor link)
