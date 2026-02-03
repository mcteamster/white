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

  // Preserve Likes
  if (inputCard?.likes && inputCard.likes > 0 && inputCard.likes < 1_000_000_000) {
    outputCard.likes = inputCard.likes
  }

  return outputCard;
}

// Download Deck Data
export const downloadDeck = (G: GameState, customFilename?: string) => {
  // Strip Unnecessary Data from Gamestate
  const strippedCards = G.cards.map((card) => {
    const strippedCard = {
      id: card.id,
      content: card.content,
      location: 'deck',
      likes: (card?.likes && card.likes > 0 && card.likes < 1_000_000_000) ? card.likes : undefined,
    }
    return strippedCard
  })

  // Create Data String
  const rawData = btoa(encodeURI(JSON.stringify(strippedCards)));

  // Format Deck
  const outputHTML = `<!DOCTYPE html><html><head><script>const rawData =
      '${rawData}';
      const cards = JSON.parse(decodeURI(atob(rawData)));
      </script>
      <title>Blank White Cards</title>
      <link rel="icon" type="image/png" href="https://blankwhite.cards/favicon.png"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      <style>
        @import url(https://fonts.googleapis.com/css?family=Patrick+Hand+SC);

        body {
          width: 100%;
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
          flex-direction: column;
        }

        .drawn {
          border-radius: 0.5em;
          border: 0.25em black solid;
        }

        .card {
          width: 90vw;
          max-width: 600px;
          min-height: 7em;
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

        .button {
          font-size: 1.25em;
          height: 3em;
          width: 3em;
          margin: 0.5em;
          text-align: center;
          font-weight: bold;
          background: white;
          cursor: pointer;
        }

        #header {
          padding: 0.5em;
          background: white;
          border-bottom: 0.25em black solid;
          text-align: center;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
        }

        #heading {
          font-size: 2em;
          font-weight: bold;
        }

        #tip {
          text-align: center;
          padding: 0.5em;
        }

        #table {
          padding: 1em;
          margin-bottom: 6em;
          flex-wrap: wrap;
        }

        #footer {
          width: 100%;
          position: fixed;
          bottom: 0;
          background: white;
          border-top: 0.25em black solid;
          text-align: center;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: row;
        }

        #saveIcon {
          background-color: #eee;
        }

        #filter {
          font-family: "Patrick Hand SC", Arial, Helvetica, sans-serif;
          font-size: 1.5em;
          max-width: 8em;
          margin: 0.5em;
          padding: 0.5em;
          flex-grow: 1;
        }
      </style>
    </head>
    <body>
      <div id="header" class="center">
        <div id="heading"><a href="https://blankwhite.cards"><u>blankwhite.cards</u></a></div>
        <p id="tip" class="center">
          Tap cards to toggle Show/Hide. Remember to save.<br></br>
          <span>Use the <a href="https://blankwhite.cards/editor"><u>Deck Editor</u></a> to modify content.</span>
        </p>
      </div>
      <div id="table" class="center"></div>
      <div id="footer">
        <input type="text" id="filter" class="drawn" placeholder="Search Cards" oninput="renderCards(this.value)">
        <div id="saveIcon" class="drawn button center" onclick="saveDeck()">&#8595;<br>SAVE</div>
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

        // Decompression Algorithm
        const decompressImage = async (compressedImage) => {
          // Convert from UTF-16 String to Run Length Encoding
          const input = compressedImage.split('').map((char) => { return (char.charCodeAt(0) - 32) });

          return new Promise((resolve) => {
            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='; // Dummy white image to trigger the onload
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 500;
              canvas.height = 500;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                const imageData = ctx.createImageData(canvas.width, canvas.height);
                const pixels = imageData.data;
                let pixelTracker = 0;
                for (let i = 0; i < input.length; i++) {
                  const colour = i & 1 ? 0 : 255 // Odd is white, Even is black
                  let count = input[i];
                  while (count > 0) {
                    pixels[pixelTracker] = colour;
                    pixels[pixelTracker + 1] = colour;
                    pixels[pixelTracker + 2] = colour;
                    pixels[pixelTracker + 3] = 255;
                    count--;
                    pixelTracker += 4;
                  }
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL("image/png"));
              }
            };
          });
        };

        // Render Cards
        const renderCards = (filterText) => {
          const table = document.getElementById('table');
          table.textContent = '';
          cards.forEach(async (card) => {
            // Filter
            if (filterText && !card.content.title.toLowerCase().includes(filterText.toLowerCase()) && !card.content.author.toLowerCase().includes(filterText.toLowerCase()) && !card.content.description.toLowerCase().includes(filterText.toLowerCase())) {
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

            if (card.content.image.startsWith('data:image/png;base64,')) {
              imgDiv.style.backgroundImage = 'url('+card.content.image+')';
            } else if (card.content.image) {
              imgDiv.style.backgroundImage = 'url('+(await decompressImage(card.content.image))+')';
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
  dltemp.setAttribute("download", customFilename || `BlankWhiteCards_${datetime}`);
  dltemp.style.display = "none";
  document.body.append(dltemp);
  dltemp.click();
  document.body.removeChild(dltemp);
}