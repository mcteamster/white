const fs = require('node:fs');
let dump = require('./dump.json');
dump.cards.forEach((card, i) => {
  card.content = {
    title: card.title,
    description: card.description,
    author: card.author,
    image: card.picture,
    date: Date.parse(new Date(Number(card.date.split('.')[2]), Number(card.date.split('.')[1]) - 1, Number(card.date.split('.')[0]), 12)),
  };
  card.location = 'deck';
  card.focused = [];
  delete card._id
  delete card.title
  delete card.description
  delete card.author
  delete card.picture
  delete card.date
  delete card.dislikes
  delete card.reports

  // Write to individual card file
  const output = JSON.stringify(card, null, 2);
  fs.writeFile(`../public/card/${i+1}.json`, output, () => {})
})

console.log(JSON.stringify(dump, null, 2));