import { GameState } from "../Game";

// Download Deck Data
export const downloadDeck = (G: GameState) => {
  // Format Cards into HTML for display
  let deckHTML = "";
  G.cards.forEach((card) => {
    let imageHTML = '';
    if (card.content.image) {
      imageHTML += `<div class="picture center" style="background-image: url(${card.content.image})"></div>`;
    }

    let localDate;
    if (card.content.date) {
      localDate = new Date(Number(card.content.date)).toLocaleDateString();
    }

    const cardHTML = `
    <div class='card drawn' id="${card.id}" onclick='toggleCard("${card.id}")'>
      ${imageHTML}
      <div class='details'>
        <div class="title center">${card.content.title}</div>
        <div class="credit">by ${card.content.author} on ${localDate}</div>
        <div class="description">${card.content.description}</div>
      </div>
      <div class='number'>#${card.id}</div>
    </div>`;

    deckHTML += cardHTML;
  })

  // Format Deck
  const outputHTML = `<!DOCTYPE html><html><head><script>const cards = 
      ${JSON.stringify(G.cards)};
      // Toggle Inclusion
      const toggleCard = (id) => {
        const card = document.getElementById(id);
        card.classList.toggle("exclude");
        const index = cards.findIndex(card => card.id == id);
        (cards[index].location == 'box') ? (cards[index].location = 'deck') : (cards[index].location = 'box'); // Cards in the Box are not imported
        window.onbeforeunload = () => { return true }; // Warn about leaving without saving changes
      }

      // Save
      const saveDeck = () => {
        const currentDeck = document.documentElement.outerHTML
        const splitDeck = currentDeck.split('\\n');
        splitDeck[1] = JSON.stringify(cards)+";";
        const newDeck = splitDeck.join('\\n');
        const today = new Date();
        const datetime = today.getFullYear()+'-'+(today.getMonth()+1).toString().padStart(2, "0")+'-'+today.getDate()+"_"+today.getHours()+today.getMinutes()+today.getSeconds();
        const dltemp = document.createElement('a');
        dltemp.setAttribute("href", 'data:text/html;charset=utf-8,'+encodeURIComponent(newDeck));
        dltemp.setAttribute("download","BlankWhiteCards_"+datetime);
        dltemp.style.display = "none";
        document.body.append(dltemp);
        dltemp.click();
        document.body.removeChild(dltemp);
        window.onbeforeunload = null;
      }
      </script>
      <title>Blank White Cards</title>
      <link rel="icon" type="image/png" href="https://white.mcteamster.com/favicon.png"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      <style>
        @import url(https://fonts.googleapis.com/css?family=Patrick+Hand+SC);

        body {
          width: 100%;
          height: 100%;
          padding: 0;
          margin: 0;
          font-family: "Patrick Hand SC", Arial, Helvetica, sans-serif;
          color: black;
          background: #333;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          overflow-x: hidden;
          overflow-y: scroll;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        a {
          color: black;
        }

        .center {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .drawn {
          border-radius: 255px 25px 225px 25px/25px 225px 25px 255px;
          border: 0.25em black solid;
        }

        .card {
          width: 90vw;
          max-width: 600px;
          background: white;
          margin: 0.5em;
          padding: 0.5em;
          position: relative;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          flex-direction: row;
        }

        .picture {
          height: 6em;
          min-height: 6em;
          width: 6em;
          min-width: 6em;
          margin: 0.5em;
          background-position: center;
          background-size: contain;
          background-repeat: no-repeat;
        }

        .details {
          padding: 0.5em;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          flex-direction: column;
        }

        .title {
          text-align: center;
          font-weight: bold;
        }
        
        .credit {
          margin: 0.25em 0;
          text-align: center;
        }

        .number {
          position: absolute;
          right: 0.75em;
          top: 0;
        }
        
        .exclude {
          opacity: 0.5;
        }

        #header {
          background: white;
          text-align: center;
        }

        #table {
          height: 100%;
          padding: 1em;
          flex-wrap: wrap;
        }

        #saveIcon {
          position: fixed;
          top: 0;
          left: 0;
          margin: 0.25em 0.5em;
          color: grey;
          cursor: pointer;
        }

        #tip {
          color: grey;
          text-align: center;
          padding: 0 1em;
          margin: 1em 0 0;
        }
      </style>
    </head>
    <body>
      <div id="header" class="center"><h1>Saved deck from <a href="https://white.mcteamster.com"><u>white.mcteamster.com</u></a><h1></div>
      <p id="tip" class="center">Tap a card to toggle inclusion in future uploads. Remember to SAVE the deck when you're done making changes!</p>
      <div id="table" class="center">
        ${deckHTML}
      </div>
      <div id="saveIcon" onclick="saveDeck()">SAVE</div>
    </body>
  </html>`

  // Set Timestamp
  const today = new Date();
  const datetime = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, "0") + '-' + today.getDate() + "_" + today.getHours() + today.getMinutes() + today.getSeconds(); // Use string concatenation for consistency

  // Create Download Element
  const dltemp = document.createElement('a');
  dltemp.setAttribute("href", 'data:text/html;charset=utf-8,' + encodeURIComponent(outputHTML));
  dltemp.setAttribute("download", `BlankWhiteCards_${datetime}`);
  dltemp.style.display = "none";
  document.body.append(dltemp);
  dltemp.click();
  document.body.removeChild(dltemp);
}

// Upload Deck Data