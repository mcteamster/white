import { Card } from "../Cards";
import { GameState } from "../Game";

// Sanitise Cards
// @ts-expect-error Legacy Card Input Compatibiity
export const sanitiseCard = (inputCard) => {
  const outputCard: Card = {
    id: 0,
    content: {
      title: '',
      description: '',
    },
    location: 'deck',
    focused: [],
  };

  // Support for v2 and v1 card schemas
  outputCard.content = {
    title: inputCard?.content?.title || inputCard.title,
    description: inputCard?.content?.description || inputCard.description,
    author: inputCard?.content?.author || inputCard.author,
    image: inputCard?.content?.image || inputCard.picture,
    // @ts-expect-error crazy legacy date parsing
    date: inputCard?.content?.date || Date.parse(new Date(Number(inputCard.date.split('.')[2]), Number(inputCard.date.split('.')[1]) - 1, Number(inputCard.date.split('.')[0]), 12)),
  };

  // These cards are to be hidden
  if (inputCard.location == 'box' || inputCard.reports == 1) {
    outputCard.location = 'box'
  }

  return outputCard;
}

// Download Deck Data
export const downloadDeck = (G: GameState) => {
  // Create Data String
  const rawData = btoa(encodeURI(JSON.stringify(G.cards)));

  // Format Deck
  const outputHTML = `<!DOCTYPE html><html><head><script>const rawData =
      '${rawData}';
      const cards = JSON.parse(decodeURI(atob(rawData)));
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
          background: grey;
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
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
        }

        #table {
          height: 100%;
          padding: 1em;
          flex-wrap: wrap;
        }

        #saveIcon {
          height: 3em;
          width: 3em;
          margin: 0.5em;
          padding: 1em;
          position: fixed;
          bottom: 0;
          right: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          font-weight: bold;
          background: white;
          cursor: pointer;
        }

        #tip {
          text-align: center;
          padding: 0 1em;
          margin: 1em 0 0;
        }
      </style>
    </head>
    <body>
      <div id="header" class="center">
        <h1>Blank White Cards - Deck Downloaded from <a href="https://white.mcteamster.com"><u>white.mcteamster.com</u></a><h1>
        <p id="tip" class="center">Tap a card to toggle inclusion in future uploads. Remember to SAVE the deck when you're done making changes!</p>
      </div>
      <div id="table" class="center"></div>
      <div id="footer" class="center">
        <p>Deck downloaded from <a href="https://white.mcteamster.com"><u>white.mcteamster.com</u></a></p>
        <div id="saveIcon" class="drawn" onclick="saveDeck()">SAVE<br>&#8595;</div>
      </div>
      <script>
        // Toggle Inclusion
        const toggleCard = (id) => {
          const card = document.getElementById(id);
          card.classList.toggle("exclude");
          const index = cards.findIndex(card => card.id == id);
          (cards[index].location == 'box') ? (cards[index].location = 'deck') : (cards[index].location = 'box'); // Cards in the Box are not imported
          window.onbeforeunload = () => { return true }; // Warn about leaving without saving changes
        }

        // Render Cards
        const renderCards = (filterText) => {
          const table = document.getElementById('table');
          table.innerHTML = '';
          cards.forEach(card => {
            // Filter
            if (filterText && !card.content.title.toLowerCase().includes(filterText.toLowerCase()) && !card.content.description.toLowerCase().includes(filterText.toLowerCase())) {
              return;
            }

            // Create new div for card
            const cardDiv = document.createElement("div");
            cardDiv.classList.add("card");
            cardDiv.classList.add("drawn");
            if (card.location == 'box') {
              cardDiv.classList.add("exclude");
            }
            cardDiv.id = Number(card.id);
            cardDiv.onclick = () => toggleCard(Number(card.id));
            table.appendChild(cardDiv);

            // Mount Image
            const imgDiv = document.createElement("div");
            imgDiv.classList.add("picture");
            imgDiv.classList.add("center");
            if (card.content.image) {
              imgDiv.style.backgroundImage = 'url('+card.content.image+')';
            }
            cardDiv.appendChild(imgDiv);

            // Mount Details
            const detailsDiv = document.createElement("div");
            detailsDiv.classList.add("details");
            cardDiv.appendChild(detailsDiv);

            // Mount Title
            const titleDiv = document.createElement("div");
            titleDiv.classList.add("title");
            titleDiv.classList.add("center");
            titleDiv.innerText = card.content.title;
            detailsDiv.appendChild(titleDiv);

            // Mount Credit
            const creditDiv = document.createElement("div");
            creditDiv.classList.add("credit");
            creditDiv.innerText = 'by '+card.content.author+' on '+new Date(Number(card.content.date)).toLocaleDateString();
            detailsDiv.appendChild(creditDiv);

            // Mount Description
            const descriptionDiv = document.createElement("div");
            descriptionDiv.classList.add("description");
            descriptionDiv.innerText = card.content.description;
            detailsDiv.appendChild(descriptionDiv);

            // Mount Number
            const numberDiv = document.createElement("div");
            numberDiv.classList.add("number");
            numberDiv.innerText = '#'+card.id;
            cardDiv.appendChild(numberDiv);
          });
        };
        renderCards();
        
        // Save Deck
        const saveDeck = () => {
          const currentDeck = document.documentElement.outerHTML
          const splitDeck = currentDeck.split('\\n');
          splitDeck[1] = '"'+btoa(encodeURI(JSON.stringify(cards)))+'";';
          const newDeck = splitDeck.join('\\n');
          const today = new Date();
          const datetime = today.getFullYear()+'-'+(today.getMonth()+1).toString().padStart(2, "0")+'-'+today.getDate().toString().padStart(2, "0")+"_"+today.getHours().toString().padStart(2, "0")+today.getMinutes().toString().padStart(2, "0")+today.getSeconds().toString().padStart(2, "0");
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
    </body>
  </html>`

  // Set Timestamp
  const today = new Date();
  const datetime = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, "0") + '-' + today.getDate().toString().padStart(2, "0") + "_" + today.getHours().toString().padStart(2, "0") + today.getMinutes().toString().padStart(2, "0") + today.getSeconds().toString().padStart(2, "0"); // Use string concatenation for consistency

  // Create Download Element
  const dltemp = document.createElement('a');
  dltemp.setAttribute("href", 'data:text/html;charset=utf-8,' + encodeURIComponent(outputHTML));
  dltemp.setAttribute("download", `BlankWhiteCards_${datetime}`);
  dltemp.style.display = "none";
  document.body.append(dltemp);
  dltemp.click();
  document.body.removeChild(dltemp);
}