let dump = require('./dump.json');
dump.cards.forEach(card => {
  card.content = {
    title: card.title,
    description: card.description,
    author: card.author,
    image: card.picture,
    date: Date.parse(new Date(Number(card.date.split('.')[2]), Number(card.date.split('.')[1]) - 1, Number(card.date.split('.')[0]), 12)),
  };
  card.location = 'deck';
  delete card._id
  delete card.title
  delete card.description
  delete card.author
  delete card.image
  delete card.date
  delete card.dislikes
  delete card.reports
})

console.log(JSON.stringify(dump, null, 2));