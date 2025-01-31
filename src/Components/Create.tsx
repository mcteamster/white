import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import type { Properties } from 'csstype';
import { Card, getCardByFocus } from '../Cards';
import { Icon } from './Icons';
import { useState } from 'react';

export function Create(props: BoardProps<GameState>) {
  // Card Content Metadata
  const [content, setContent] = useState({
    title: '',
    description: 'hello',
    author: '',
    image: '',
  });

  return (
    <div>
      {/* <div id="textInputs">
        <wired-input id="titleInput" placeholder="Title" maxlength="50" tabindex="1"></wired-input>
        <wired-input id="authorInput" placeholder="Author" maxlength="25" tabindex="3"></wired-input>
        <wired-textarea id="descriptionInput" placeholder="Description" rows="6" maxrows="6" maxlength="280" tabindex="2"></wired-textarea>
      </div> */}
    </div>
  );
}