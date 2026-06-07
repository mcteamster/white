import { Card } from "@mcteamster/white-core";
import { externalLink } from './hooks';

// Sanitise Cards
export const sanitiseCard = (inputCard: unknown) => {
  const card = inputCard as Record<string, unknown>;
  const outputCard: Card = {
    id: 0,
    content: {
      title: '',
      description: '',
    },
    location: (card?.location === 'box') ? 'box' : 'deck',
  };

  // Support for v2 and v1 card schemas
  const content = card?.content as Record<string, unknown> | undefined;
  outputCard.content = {
    title: (content?.title || card?.title) as string || '',
    description: (content?.description || card?.description) as string || '',
    author: (content?.author || card?.author) as string | undefined,
    image: (content?.image || card?.picture) as string | undefined,
    // @ts-expect-error crazy legacy date parsing
    date: content?.date || Date.parse(new Date(Number((card?.date as string)?.split('.')[2]), Number((card?.date as string)?.split('.')[1]) - 1, Number((card?.date as string)?.split('.')[0]), 12)),
  };

  // These cards are to be hidden
  if (card?.reports == 1) {
    outputCard.location = 'box'
  }

  // Preserve Likes
  if ((card?.likes as number) > 0 && (card?.likes as number) < 1_000_000_000) {
    outputCard.likes = card.likes as number;
  }

  return outputCard;
}

// Download Deck Data
export const openDeckEditor = async (matchID: string) => {
  const createdAt = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const editorUrl = `${import.meta.env.VITE_ORIGIN}/editor/${matchID}/${createdAt}`;
  console.log('Opening editor:', editorUrl);
  await externalLink(editorUrl);
}

export const downloadDeck = (cards: Card[], customFilename?: string) => {
  const strippedCards = cards.map((card) => {
    const strippedCard = {
      id: card.id,
      content: card.content,
      location: (card.location === 'box') ? 'box' : 'deck',
      likes: (card?.likes && card.likes > 0 && card.likes < 1_000_000_000) ? card.likes : undefined,
    }
    return strippedCard
  })

  const outputHTML = generateDeckHTML(strippedCards);
  const today = new Date();
  const datetime = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, "0") + '-' + today.getDate().toString().padStart(2, "0") + "_" + today.getHours().toString().padStart(2, "0") + today.getMinutes().toString().padStart(2, "0") + today.getSeconds().toString().padStart(2, "0");

  const dltemp = document.createElement('a');
  dltemp.setAttribute("href", 'data:text/html;charset=utf-8,' + encodeURIComponent(outputHTML));
  dltemp.setAttribute("download", customFilename || `BlankWhiteCards_${datetime}`);
  dltemp.style.display = "none";
  document.body.append(dltemp);
  dltemp.click();
  document.body.removeChild(dltemp);
}

export const downloadDeckJSON = (cards: Card[], customFilename?: string) => {
  const strippedCards = cards.map((card) => ({
    id: card.id,
    content: card.content,
    location: (card.location === 'box') ? 'box' : 'deck',
    likes: (card?.likes && card.likes > 0 && card.likes < 1_000_000_000) ? card.likes : undefined,
  }));

  const today = new Date();
  const datetime = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, "0") + '-' + today.getDate().toString().padStart(2, "0") + "_" + today.getHours().toString().padStart(2, "0") + today.getMinutes().toString().padStart(2, "0") + today.getSeconds().toString().padStart(2, "0");

  const dltemp = document.createElement('a');
  dltemp.setAttribute("href", 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ cards: strippedCards })));
  dltemp.setAttribute("download", (customFilename || `BlankWhiteCards_${datetime}`) + '.json');
  dltemp.style.display = "none";
  document.body.append(dltemp);
  dltemp.click();
  document.body.removeChild(dltemp);
}

// Generate Deck HTML (shared between client and server)
export const generateDeckHTML = (cards: Card[]) => {
  const rawData = btoa(encodeURI(JSON.stringify(cards)));
  return `<!DOCTYPE html><html><head><script>const rawData =
      '${rawData}';
      const cards = JSON.parse(decodeURI(atob(rawData)));
      </script>
      <title>Blank White Cards</title>
      <link rel="icon" type="image/png" href="https://blankwhite.cards/favicon.png"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @import url(https://fonts.googleapis.com/css?family=Patrick+Hand+SC);

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: "Patrick Hand SC", Arial, Helvetica, sans-serif;
          background: #f5f5f5;
        }

        #header {
          background: white;
          padding: 1em;
          border-bottom: 2px solid #333;
          text-align: center;
        }

        #header h2 {
          margin: 0 0 0.5em 0;
          font-size: 1.5em;
        }

        #header a {
          color: #0066cc;
          text-decoration: none;
        }

        #header a:hover {
          text-decoration: underline;
        }

        #filter {
          width: 100%;
          max-width: 600px;
          padding: 0.75em;
          margin: 1em auto;
          display: block;
          font-family: "Patrick Hand SC", Arial, Helvetica, sans-serif;
          font-size: 1.2em;
          border: 2px solid #333;
          border-radius: 0.5em;
        }

        table {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto 2em auto;
          border-collapse: collapse;
          background: white;
        }

        th, td {
          padding: 0.75em;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        th {
          background: #333;
          color: white;
          font-weight: bold;
          position: sticky;
          top: 0;
          cursor: pointer;
          user-select: none;
        }

        th:hover {
          background: #555;
        }

        th.sorted-asc::after {
          content: ' ▲';
        }

        th.sorted-desc::after {
          content: ' ▼';
        }

        tr:hover {
          background: #f9f9f9;
        }

        .card-image {
          width: 60px;
          height: 60px;
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          border: 1px solid #ddd;
        }

        .card-title {
          font-weight: bold;
          font-size: 1.1em;
        }

        .card-description {
          color: #666;
          font-size: 0.9em;
        }

        @media (max-width: 768px) {
          th, td {
            padding: 0.5em;
            font-size: 0.9em;
          }
          
          .card-image {
            width: 40px;
            height: 40px;
          }
        }
      </style>
    </head>
    <body>
      <div id="header">
        <h2><a href="https://blankwhite.cards/editor">Blank White Cards - Edit Online</a></h2>
        <input type="text" id="filter" placeholder="Search cards..." oninput="renderCards(this.value)">
      </div>
      <table id="table">
        <thead>
          <tr>
            <th onclick="sortTable('id')">#</th>
            <th>Image</th>
            <th onclick="sortTable('title')">Title</th>
            <th onclick="sortTable('author')">Author</th>
            <th onclick="sortTable('date')">Date</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
      <script>
        let sortColumn = null;
        let sortDirection = 'asc';

        const sortTable = (column) => {
          if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            sortColumn = column;
            sortDirection = 'asc';
          }
          renderCards(document.getElementById('filter').value);
        };

        const decompressImage = async (compressedImage) => {
          const input = compressedImage.split('').map((char) => char.charCodeAt(0) - 32);
          return new Promise((resolve) => {
            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
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
                  const colour = i & 1 ? 0 : 255;
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

        const renderCards = (filterText = '') => {
          const tbody = document.getElementById('tbody');
          tbody.innerHTML = '';
          
          // Update header sort indicators
          document.querySelectorAll('th').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
          });
          if (sortColumn) {
            const thIndex = { 'id': 0, 'title': 2, 'author': 3, 'date': 4 }[sortColumn];
            const th = document.querySelectorAll('th')[thIndex];
            th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
          }
          
          // Filter cards
          let filteredCards = cards.filter(card => {
            if (card.location === 'box') return false;
            
            const searchText = filterText.toLowerCase();
            if (searchText && 
                !card.content.title.toLowerCase().includes(searchText) && 
                !card.content.author.toLowerCase().includes(searchText) && 
                !card.content.description.toLowerCase().includes(searchText)) {
              return false;
            }
            return true;
          });
          
          // Sort cards
          if (sortColumn) {
            filteredCards.sort((a, b) => {
              let aVal, bVal;
              if (sortColumn === 'id') {
                aVal = a.id;
                bVal = b.id;
              } else if (sortColumn === 'title') {
                aVal = a.content.title.toLowerCase();
                bVal = b.content.title.toLowerCase();
              } else if (sortColumn === 'author') {
                aVal = a.content.author.toLowerCase();
                bVal = b.content.author.toLowerCase();
              } else if (sortColumn === 'date') {
                aVal = Number(a.content.date);
                bVal = Number(b.content.date);
              }
              
              if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
              return 0;
            });
          }
          
          // Render cards
          filteredCards.forEach(async (card) => {
            const row = tbody.insertRow();
            
            row.insertCell().textContent = '#' + card.id;
            
            const imgCell = row.insertCell();
            const imgDiv = document.createElement('div');
            imgDiv.className = 'card-image';
            if (card.content.image) {
              if (card.content.image.startsWith('data:image/png;base64,')) {
                imgDiv.style.backgroundImage = 'url(' + card.content.image + ')';
              } else {
                imgDiv.style.backgroundImage = 'url(' + (await decompressImage(card.content.image)) + ')';
              }
            }
            imgCell.appendChild(imgDiv);
            
            row.insertCell().innerHTML = '<div class="card-title">' + card.content.title + '</div>';
            row.insertCell().textContent = card.content.author;
            row.insertCell().textContent = new Date(Number(card.content.date)).toLocaleDateString();
            row.insertCell().innerHTML = '<div class="card-description">' + card.content.description + '</div>';
          });
        };
        
        renderCards();
      </script>
    </body>
  </html>`;
}