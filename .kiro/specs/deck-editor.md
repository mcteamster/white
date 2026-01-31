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

## Files to Create/Modify
- `src/Components/DeckEditor.tsx` (new)
- `src/App.tsx` (add route)
- `src/lib/deckEditor.ts` (new - state management utilities)
- Navigation components (add editor link)
