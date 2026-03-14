/*
Blank White Cards - Database for Model
Copyright (C) 2019-2020 Mcteamster

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// Import Modules
var fs = require('fs');
var mongo = require('mongodb').MongoClient;
var settings = require('./settings.js');
var cache = require('./cache.js'); // Custom Room Sync Cache

// Database Objects
var client;
var db;

// Connect to Database
async function connect() {
    try {
        client = await mongo.connect(settings.url, {useNewUrlParser: true, useUnifiedTopology: true});
        db = client.db(settings.db);
    } catch(err) {
        console.log(`ERROR: ${Date().toString().split(" ").slice(1,5).join(" ")} > Unable to Connect to Database`);
        setTimeout(()=>{connect()}, 5000); // Attempt to connect again
    }
};
connect();

// Query the database for the card corresponding to the ID
async function pull(id, room) {
    // Check Room - Default to 0 for Public
    if(room == undefined){
        room = 0;
    };
    room = String(room);

    try {
        // Based on Id Pull Specific or Random Set
        if(id==undefined){
            if(room > 99) {
                // Undrawn cards have 0 dislikes, drawn cards have 1 dislike
                cards = (await db.collection(room).aggregate([{$match: {dislikes: 0}}, {$sample: {size: 1}}]).toArray());
                if(cards.length == 0){
                    // When deck is exhausted, show placeholder and shuffle deck, reset dislikes to 0
                    console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Deck ${room} exhausted, shuffling`);
                    cards = (await db.collection(room).find({id: 1}).limit(1).toArray());
                    db.collection(room).updateMany({id: {$gt: 1}}, {$set: {dislikes: 0}});
                }
                //console.log(cards[0].id, cards[0].dislikes);
            } else {
                // Get Number of Cards
                var count = (await db.collection(room).stats()).count;
                // Generate a Random List of Pointers
                var pointers = Array(settings.sample).fill().map(() => Math.ceil(Math.random() * count));
                // Pick a handful of cards
                cards = (await db.collection(room).find({id: {"$in": pointers}}).limit(settings.sample).toArray());
            }
        } else if(id == -1) {
            // Get Number of Cards and pick the highest index
            var count = (await db.collection(room).stats()).count;
            cards = (await db.collection(room).find({id: count}).limit(1).toArray());
        } else {
            // Pull Specific Card by ID
            cards = (await db.collection(room).find({id: id}).limit(1).toArray());
        }
    } catch(err){
        return false;
    }
    return cards;
};

// Add a new card to the database
async function add(data, room, quiet) {
    // Check Room - Default to 0 for Public
    if(room == undefined){
        room = 0;
    };
    room = String(room);

    try {
        // Increment ID
        count = (await db.collection(room).stats()).count;
        id = count+1;

        /*/ Adjust Blank Probability
        if(id < settings.blank_initial[room]){
            settings.blank_chance[room] = 1; // First X cards are always blanks // TODO Stateless
        } else if(room == 0) {
            settings.blank_chance[room] = 0.1; // Flat 10% In Global Deck?
        } else {
            settings.blank_chance[room] = 0; // 0% in Custom Rooms Manual Create Only
        } */

        // Get Current Date
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1; //January is 0!
        var yyyy = today.getFullYear();
        if(dd < 10){dd = '0' + dd;};
        if(mm < 10){mm = '0' + mm;};
        var today = dd+'.'+mm+'.'+yyyy;

        // Format Card
        var new_card = {
            id: id,
            title: data.title,
            description: data.description,
            author: data.author,
            date: today,
            picture: data.picture,
            likes: 3, // Init everything with 3 likes to give it 100% popularity, and resistance.
            dislikes: 0,
            reports: 0
        };

        // Check uniqueness of ID
        unique = (await db.collection(room).find({id: id}).limit(1).toArray())[0];
        if(unique!=undefined){
            throw err;
        }

        // Add New Card to the Database
        result = (await db.collection(room).insertMany([new_card])).insertedCount;

        if(result==1 && quiet != true){
            if(room > 99) {
                console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > New card added to room ${room} id: ${new_card.id} title: ${new_card.title}`);
            } else {
                console.log(`INFO: ${Date().toString().split(" ").slice(1,5).join(" ")} > New card added to global deck id: ${new_card.id} title: ${new_card.title}`);
            }
        } else {
            throw(err);
        }
    } catch (err) {
        return false;
    }
    return id;
};

// Add Likes and Dislikes
async function like(vote, room) {
    // Check Room - Default to 0 for Public
    if(room == undefined){
        room = 0;
    };
    room = String(room);

    try {
        // Vote Params
        feedback = vote.vote;
        id = parseInt(vote.id);

        if(feedback=='true'){
            await db.collection(room).findOneAndUpdate({id: id}, {$inc:{likes:1}});
        } else if(feedback=='false'){
            await db.collection(room).findOneAndUpdate({id: id}, {$inc:{dislikes:1}});
        } else if(feedback=='reported'){
            await db.collection(room).findOneAndUpdate({id: id}, {$inc:{reports:1, dislikes:1}});
        } else if(feedback=='make' && room!=0) {
            settings.blank_chance[room] = 1; // Set to True (100%), Send Blank Next
            console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Sending A Blank to Room: ${room}`)
        }
    } catch(err){
        return false;
    }
    return true;
};

// Update Card Data
async function update(data, room) {
    // Check Room - Default to 0 for Public
    if(room == undefined){
        room = 0;
    };
    room = String(room);

    try {
        // Data
        id = parseInt(data.id);

        // Update Picture
        if(data.picture){
            await db.collection(room).findOneAndUpdate({id: id}, {$set: {picture: data.picture}});
        }

        // Update Title
        if(data.title){
            await db.collection(room).findOneAndUpdate({id: id}, {$set: {title: data.title}});
        }
    } catch(err){
        return err;
    }
    return true;
};


// Re-Initialise Database
async function reset(room) {
    // Check Room and Assign Seed
    if(room == undefined){
        return false;
    } else if(room == 0) {
        //var list = JSON.parse(fs.readFileSync('./model/beta.json','utf8')); // Front-Load Database Import Seeding
        return false;
    } else {
        //var list = JSON.parse(fs.readFileSync('./model/pseudodata.json','utf8')); // Standard Deck of Cards
        var list = JSON.parse(fs.readFileSync('./model/initialise.json','utf8')); // Single Seed Initial Card
    }
    room = String(room);

    try {
        try {
            console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Dropping Collection ${room}`);
            await db.collection(room).drop(); // Attempt to Drop custom collection if it exists
        } catch(err) {
            console.log(`WARNING: ${Date().toString().split(" ").slice(1,5).join(" ")} > Unable to Drop Collection ${room}`);
        };
        console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Creating Collection ${room}`);
        await db.createCollection(room); // Recreate Collection
        console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Seeding Collection ${room}`);
        await db.collection(room).insertMany(list.card); // Insert Seed Cards
        await cache.setCache(room, list.card[0]); // Reset Cache to First Card
    } catch(err){
        console.log(`WARNING: ${Date().toString().split(" ").slice(1,5).join(" ")} > Problem Resetting Database ${room}`);
        return false;
    }
    console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Database ${room} Reset`)
    return true;
}

// Count Cards in Global Deck
async function countCards(room) {
    // Check Room - Default to 0 for Public
    if(room == undefined){
        room = 0;
    };
    room = String(room);
    return (await db.collection(room).stats()).count;
}

// Download an entire custom deck
async function download(room) {
    // Check Room - Default to 0 for Public
    if(room == undefined){
        room = 0;
    };
    room = String(room);

    try {
        if(room > 99) {
            cards = (await db.collection(room).find().toArray());
            cards.shift(); // Remove the Getting Started Card
            console.log(`INFO: ${Date().toString().split(" ").slice(1,5).join(" ")} > Deck ${room} downloaded`);
        } else {
            return false;
        }
    } catch(err){
        return false;
    }
    return cards;
};

// Download an entire custom deck
async function upload(room, cards) {
    // Check Room - Default to 0 for Public
    if(room == undefined){
        room = 0;
    };
    room = String(room);

    // Counters
    var total = 0;
    var fails = 0;

    try {
        if(room > 99) {
            for (const card of cards) {
                try {
                    if(card != false) {
                        await add(card, room, true);
                        total++;
                    } else {
                        throw err;
                    }
                } catch (err) {
                    if(fails < 5) {
                        console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Failed to upload a card to room ${room}`);
                        fails++;
                    } else {
                        console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Aborting. Too many fails for room ${room}`);
                        return false;
                    }
                }
            }
            console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > ${total} cards uploaded to room ${room}`);
        } else {
            return false;
        }
    } catch(err){
        return false;
    }
    return total;
};

// Export
exports.pull = pull;
exports.add = add;
exports.like = like;
exports.update = update;
exports.reset = reset;
exports.countCards = countCards;
exports.download = download;
exports.upload = upload;