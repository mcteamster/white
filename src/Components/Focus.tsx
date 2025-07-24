import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import type { Properties } from 'csstype';
import { Card, getAdjacentCard, getCardById } from '../Cards';
import { Icon, Browse } from './Icons';
import { useCallback, useContext, useEffect, useState } from 'react';
import { FocusContext, HotkeysContext, ImageCacheContext, LoadingContext } from '../lib/contexts.ts';
import { BLANK_IMAGE } from '../lib/images.ts';
import { likeGlobalCard } from '../lib/clients.ts';
import { externalLink } from '../lib/hooks.ts';

export function Focus(props: BoardProps<GameState>) {
  const { loading, setLoading } = useContext(LoadingContext);
  const { focus, setFocus } = useContext(FocusContext);
  const [displayedCard, setDisplayedCard] = useState(<></>);
  const [sendCardMode, setSendCardMode] = useState(false);
  const { hotkeys } = useContext(HotkeysContext);
  const { imageCache } = useContext(ImageCacheContext);

  const focusCard = useCallback(((id: number, focusState: boolean) => {
    if (focus?.id != id && focusState == true) {
      setFocus({ id });
    } else {
      setFocus({});
    }
  }), [focus, setFocus]);

  const unfocusCards = useCallback(() => {
    focusCard(0, false);
    setSendCardMode(false);
    setDisplayedCard(<></>);
  }, [focusCard, setSendCardMode, setDisplayedCard])

  const changeFocus = useCallback((direction: 'prev' | 'next') => {
    if (focus?.id) {
      const adjacentCard = getAdjacentCard(props.G.cards, focus.id, direction, props.playerID)
      if (adjacentCard) {
        focusCard(adjacentCard.id, true);
      }
    }
  }, [focus, focusCard, props.G.cards, props.playerID])

  const moveCardTo = useCallback((id: number, target: string) => {
    props.moves.moveCard(id, target);
    unfocusCards()
  }, [props.moves, unfocusCards])

  useEffect(() => {
    const styles: { [key: string]: Properties<string | number> } = {
      focus: {
        width: '100%',
        height: '100%',
        gridRow: '1/10',
        gridColumn: '1/10',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      },
      title: {
        width: 'min(70vw, 45vh)',
        fontSize: '1.5em',
      },
      image: {
        width: 'min(65vw, 45vh)',
        objectFit: 'cover',
      },
      description: {
        width: 'min(70vw, 45vh)',
        height: '7.5em',
        maxHeight: '20vh',
        fontSize: '1em',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
      credit: {
        fontSize: '0.8em',
        borderColor: 'white',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
      },
      tray: {
        width: 'min(70vw, 45vh)',
        height: '100%',
        display: 'flex',
        flexWrap: 'wrap',
        flexDirection: 'row',
        justifyContent: 'space-around',
      },
      button: {
        height: '3em',
        width: '3em',
        minWidth: '22.5%',
        maxWidth: 'min(70vw, 45vh)',
        margin: '0.1em',
        borderRadius: '1em',
        display: 'flex',
        flexGrow: '1',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eee'
      },
      sendmenu: {
        height: '60vh',
        width: '90vw',
        maxWidth: '40em',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      sendlist: {
        width: '15em',
        maxHeight: '40vh',
        overflowY: 'scroll',
        scrollbarWidth: 'none',
      },
      sendplayer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
      },
      sendicon: {
        margin: '0.25em',
        padding: '0.5em',
        borderRadius: '0.5em',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eee'
      },
    };

    let card: Card | undefined;
    if (focus?.id) {
      card = getCardById(props.G.cards, focus?.id)
    };

    if (card) {
      // Calculate Date
      let localDate;
      if (card.content.date) {
        localDate = new Date(Number(card.content.date)).toLocaleDateString();
      }
      const owned = card.owner == props.playerID;

      // Define Image
      const image = imageCache[card.id] || BLANK_IMAGE;

      // Generate Buttons
      let tray = <></>
      if (owned && card.location != 'deck') {
        tray = <div style={styles.tray}>
          {<wired-card style={{ ...styles.button, color: 'red' }} id="discardButton" onClick={() => { moveCardTo(card.id, 'discard') }}><Icon name='discard' />Discard</wired-card>}
          {props.isMultiplayer && card.location != 'hand' &&<wired-card style={{ ...styles.button }} id="handButton" onClick={() => { moveCardTo(card.id, 'hand') }}><Icon name='hand' />Hand</wired-card>}
          {props.isMultiplayer && card.location != 'table' && <wired-card style={{ ...styles.button }} id="tableButton" onClick={() => { moveCardTo(card.id, 'table') }}><Icon name='display' />Table</wired-card>}
          {props.isMultiplayer && <wired-card style={{ ...styles.button }} id="sendButton" onClick={() => { setSendCardMode(true) }}><Icon name='send' />Send</wired-card>}
          {<wired-card style={{ ...styles.button }} id="pileButton" onClick={() => { moveCardTo(card.id, 'pile') }}><Icon name='pile' />Play on Pile</wired-card>}
        </div>
      } else if (card.location == 'pile') {
        tray = <div style={styles.tray}>
          {<wired-card style={{ ...styles.button }} id="claimButton" onClick={(e) => { props.moves.claimCard(card.id); setLoading(true); e.stopPropagation() }}>
            {
              loading ?
                <div className='spin'>
                  <Icon name='loading' />
                </div> :
                <Icon name='hand' />
            }
            Yoink
          </wired-card>}
        </div>
      }

      const browse = <>
        {
          getAdjacentCard(props.G.cards, card.id, 'prev', props.playerID) &&
          <div onClick={(e) => { changeFocus('prev'); e.stopPropagation() }}>
            <Browse type="prev" />
          </div>
        }
        {
          getAdjacentCard(props.G.cards, card.id, 'next', props.playerID) &&
          <div onClick={(e) => { changeFocus('next'); e.stopPropagation() }}>
            <Browse type="next" />
          </div>
        }
      </>

      const sendMenu = <wired-dialog open={sendCardMode === true || undefined}>
        <div style={styles.sendmenu} onClick={(e) => e.stopPropagation()}>
          <div>
            <div style={styles.title}>Send-A-Card</div>
            <div>Transfer this card to another location</div>
          </div>
          <wired-card>
            <div style={styles.heading}>Destinations</div>
            <div style={styles.sendlist}>
              <div key={`deck-connected`} style={styles.sendplayer}>
                <div style={styles.title}>Reshuffle into Deck</div>
                <div style={styles.sendicon} onClick={() => { props.moves.moveCard(card.id, "deck"); setSendCardMode(false); unfocusCards() }}>
                  <Icon name='shuffle'></Icon>
                </div>
              </div>
              {props.matchData?.map((player, i) => {
                if (player.isConnected && player.name && player.id != Number(props.playerID)) {
                  return (
                    <div key={`player-connected-${i}`} style={styles.sendplayer}>
                      <div style={styles.title}>{player.name.length > 12 ? `${player.name.slice(0,12)}...` : player.name}</div>
                      <div style={styles.sendplayer}>
                        <div style={styles.sendicon} onClick={() => { props.moves.moveCard(card.id, "table", String(player.id)); setSendCardMode(false); unfocusCards() }}>
                          <Icon name='display'></Icon>
                        </div>
                        <div style={styles.sendicon} onClick={() => { props.moves.moveCard(card.id, "hand", String(player.id)); setSendCardMode(false); unfocusCards() }}>
                          <Icon name='hand'></Icon>
                        </div>
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          </wired-card>
          <div style={styles.sendplayer}>
          <wired-card style={{ ...styles.button }} id="backButton" onClick={() => { setSendCardMode(false) }}><Icon name='back' />Back</wired-card>
          </div>
        </div>
      </wired-dialog>

      setDisplayedCard(<wired-dialog open onClick={() => { unfocusCards() }}>
        <div style={styles.focus} onClick={e => owned && e.stopPropagation()}>
          <Likes card={card} likeCard={props.moves.likeCard} matchId={props.matchID} />
          { !props.isMultiplayer && <Share id={card.id} /> }
          <div style={styles.title}>{card.content.title}</div>
          <div style={styles.credit}>by {card.content.author}</div>
          <div style={styles.credit}>{localDate ? `${localDate}` : ''}</div>
          <img style={styles.image} src={image || BLANK_IMAGE} />
          <div style={styles.description}>{card.content.description}</div>
          {tray}
          {browse}
          {sendMenu}
        </div>
      </wired-dialog>)
    }
  }, [props, imageCache, focus, sendCardMode, loading, setLoading, unfocusCards, changeFocus, moveCardTo])

  // Hotkeys
  useEffect(() => {
    const card = focus?.id && getCardById(props.G.cards, focus?.id)
    if (card) {
      const owned = card.owner == props.playerID;

      if (hotkeys.escape) {
        unfocusCards();
      } else if (props.isMultiplayer && owned && hotkeys.enter) {
        setSendCardMode(true);
      } else if (hotkeys.left && card.id) {
        changeFocus('prev');
      } else if (hotkeys.right && card.id) {
        changeFocus('next');
      } else if (props.isMultiplayer && owned && hotkeys.up) {
        if (card.location != "table") {
          const adjacentCard = getAdjacentCard(props.G.cards, card.id, 'prev', props.playerID) || getAdjacentCard(props.G.cards, card.id, 'next', props.playerID);
          props.moves.moveCard(card.id, "table");
          if (adjacentCard) {
            focusCard(adjacentCard.id, true);
          } else {
            unfocusCards();
          }
        } else {
          unfocusCards();
        }
      } else if (props.isMultiplayer && owned && hotkeys.down) {
        if (card.location != "hand") {
          const adjacentCard = getAdjacentCard(props.G.cards, card.id, 'prev', props.playerID) || getAdjacentCard(props.G.cards, card.id, 'next', props.playerID);
          props.moves.moveCard(card.id, "hand");
          if (adjacentCard) {
            focusCard(adjacentCard.id, true);
          } else {
            unfocusCards();
          }
        } else {
          unfocusCards();
        }
      } else if (owned && hotkeys.delete) {
        const adjacentCard = getAdjacentCard(props.G.cards, card.id, 'prev', props.playerID) || getAdjacentCard(props.G.cards, card.id, 'next', props.playerID);
        props.moves.moveCard(card.id, "discard");
        if (adjacentCard) {
          focusCard(adjacentCard.id, true);
        } else {
          unfocusCards();
        }
      } else if (props.isMultiplayer && owned && hotkeys.backspace) {
        const adjacentCard = getAdjacentCard(props.G.cards, card.id, 'prev', props.playerID) || getAdjacentCard(props.G.cards, card.id, 'next', props.playerID);
        props.moves.moveCard(card.id, "deck");
        if (adjacentCard) {
          focusCard(adjacentCard.id, true);
        } else {
          unfocusCards();
        }
      } else if (owned && hotkeys.space) {
        props.moves.moveCard(card.id, "pile");
        unfocusCards();
      }
    }
  }, [props, hotkeys, focus, focusCard, changeFocus, unfocusCards])

  return (displayedCard);
}

export interface LikesProps {
  card: Card,
  likeCard: (id: number) => void,
  matchId: string,
}

export function Likes({ card, likeCard, matchId }: LikesProps) {
  const styles: { [key: string]: Properties<string | number> } = {
    likes: {
      width: '1.75em',
      height: '1.75em',
      position: 'absolute',
      zIndex: '1',
      top: '-1.75em',
      right: '-2.5em',
      padding: '1em',
      fontSize: '0.75em',
      textAlign: 'center',
      color: 'red',
      backgroundColor: '#eee',
      borderRadius: '2em',
      boxShadow: '2px 2px 1px black',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }

  const abbreviate = useCallback((value: number) => {
    const valueString = String(value);
    const magnitude = valueString.length;
    if (magnitude < 4) {
      return valueString // Display anything less than 1000 verbatim
    } else {
      switch(magnitude) {
        case 4:
          return `${valueString[0]}.${valueString.substring(1,3)}k`
        case 5:
          return `${valueString.substring(0,2)}.${valueString[2]}k`
        case 6:
          return `${valueString.substring(0,3)}k`
        case 7:
          return `${valueString[0]}.${valueString.substring(1,3)}M`
        case 8:
          return `${valueString.substring(0,2)}.${valueString[2]}M`
        case 9:
          return `${valueString.substring(0,3)}M`
        default:
          return '-' // There's no way it's going to be this big
      }
    }
  }, [])

  // Fetch and Set Likes
  const [likes, setLikes] = useState("-");
  const getLikes = useCallback(async () => {
    if (card.likes && (matchId != 'default')) {
      setLikes(abbreviate(card.likes));
    } else if (matchId == 'default') {
      // Fetch from CDN for Single Device Mode Only
      const cardData = await (await fetch(`/card/${card.id}.json`)).json();
      setLikes(abbreviate(++cardData.likes || 1));
    } else {
      setLikes('-')
    }
  }, [abbreviate, card, matchId]);

  const handleLike = useCallback((e: React.MouseEvent) => {
    if (sessionStorage.getItem(`${matchId}-${card.id}-liked`) != '1') {
      sessionStorage.setItem(`${matchId}-${card.id}-liked`, '1');
      likeCard(card.id);
      // Update in CDN for Global Deck
      if (matchId == 'default') {
        likeGlobalCard(card.id);
      }
    } // Can only like, cannot unlike
    getLikes();
    e.stopPropagation();
  }, [card.id, likeCard, getLikes, matchId]);

  useEffect(() => {
    if (matchId != 'default') {
      getLikes();
    }
  }, [matchId, getLikes])

  return (
    <>
      <div style={styles.likes} onClick={handleLike}>
        {sessionStorage.getItem(`${matchId}-${card.id}-liked`) == '1' ? <Icon name="hearted" /> : <Icon name="heart" />}
        {sessionStorage.getItem(`${matchId}-${card.id}-liked`) == '1' && likes}
      </div>
    </>
  )
}

export function Share({ id }: { id: number }) {
  const styles: { [key: string]: Properties<string | number> } = {
    likes: {
      width: '1.75em',
      height: '1.75em',
      position: 'absolute',
      zIndex: '1',
      top: '2.75em',
      right: '-2.5em',
      padding: '1em',
      fontSize: '0.75em',
      textAlign: 'center',
      backgroundColor: '#eee',
      borderRadius: '2em',
      boxShadow: '2px 2px 1px black',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }
  return (
    <>
      <div style={styles.likes} onClick={() => { externalLink(`https://blankwhite.cards/card/${id}`) }}>
        <Icon name="link" />
      </div>
    </>
  )
}