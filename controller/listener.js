/*
Blank White Cards - Listener for Controller
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

// Modules
var fs = require('fs'); // Filesystem
var path = require('path'); // Path Resolver
const { check, validationResult } = require('express-validator');
var sanitise = require('./sanitise.js') // Validate Input
var database = require('../model/database.js'); // Database Query
var cache = require('../model/cache.js'); // Custom Room Sync Cache
var settings = require('../model/settings.js'); // Server Settings
var nonce = require('./nonce.js'); // Nonce Functions

// Start Server
var exp = require('express');
var app = exp();
app.listen(80);

// BodyParser
app.use(exp.json({
    limit: '500kb',
    extended: true
}));
app.use(exp.urlencoded({
    limit: '500kb',
    extended: true
}));

// Serve Static Home Page
app.use(exp.static('view'));

// Send About Page
app.get('/about', (req,res) => {
    res.status(200);
    res.sendFile(path.resolve('view/about.html'));
});

// Send Guidelines Page
app.get('/guidelines', (req,res) => {
    res.status(200);
    res.sendFile(path.resolve('view/guidelines.html'));
});

// Send Contact Page
app.get('/contact', (req,res) => {
    res.status(200);
    res.sendFile(path.resolve('view/contact.html'));
});

// Send Legal Page
app.get('/legal', (req,res) => {
    res.status(200);
    res.sendFile(path.resolve('view/legal.html'));
});

// Send Metrics Dashboard
app.get('/monitor', (req,res) => {
    res.status(200);
    res.sendFile(path.resolve('view/monitor.html'));
});

// Retrieve Diagnostic Metrics
app.post('/monitor', async (req,res) => {
    switch(req.body.data) {
        case "summary":
            // Init Response Object
            var msg = {};
            msg["rooms"] = await nonce.countActive(); // Number of Active Rooms
            msg["cards"] = await database.countCards(); // Number of Global Cards
            msg["recent"] = Math.floor(await database.countCards("recents")/(settings.sample-1)); // Number of Recently Dealt Cards
            // Send Response
            res.send(JSON.stringify(msg));
            break;
        case "logs":
            res.sendFile(path.resolve('log.txt'));
            break;
        default:
            res.status(404);
    }
});

// Send Error Page
app.get('/error', (req,res) => {
    res.status(200);
    res.sendFile(path.resolve('view/error.html'));
});

// PUBLIC GAMES ***********************************************

// Get App Client
app.get('/app', (req,res) => {
    if(req.query.acceptTerms == true) {
        res.status(200);
        res.sendFile(path.resolve('view/app.html'));
    } else {
        res.status(200);
        res.sendFile(path.resolve('view/lobby.html'));
    }
});

// Pull Random Card
app.post('/card', [
    check('id').isInt(),
    check('vote').isString()
], async (req,res) => {
    // Process Like
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        var vote = req.body;
        // Check recently dealt cards
        if(nonce.findRecent(vote.id)){
            // Send to Database
            await database.like(vote);
        };
    };

    // Draw a sample of random cards
    try {
        // Chance of Drawing a Blank
        if(Math.random()>settings.blank_chance[0]){
            // Increase probability slightly
            settings.blank_chance[0] = settings.blank_chance[0] + settings.blank_step;
            // Draw a card
            var cards = await database.pull();
            // Log it as recent
            await nonce.addRecent(cards);
            // Send Response
            res.send(JSON.stringify(cards));
            res.status(200); // Send Status Code
        } else {
            // Reset probability to -50% on blank draw
            settings.blank_chance[0] = settings.blank_intercept;
            // Draw a blank => Create a card
            console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Public Blank Drawn`);
            var token = await nonce.getNonce();

            // Send Blank Card
            res.send(JSON.stringify(token));
            res.status(200); // Send Status Code
        }        
    } catch(error) {
        res.status(404); // Send Status Code
        res.send(JSON.stringify('Bad Query'));
    };
});

// Get Card Gallery Client
app.get('/card', (req,res) => {
    res.status(200);
    res.sendFile(path.resolve('view/card.html'));
});

// Get Card Gallery Client
app.get('/card/:cardId/:meta?', async (req,res) => {
    id = Math.floor(Number(req.params.cardId)); // Type Validation
    if(isNaN(id) == false) { // Check it is a number
        try {
            if(id <= 0){
                // Request a Random or Latest Card
                res.status(200);
                res.sendFile(path.resolve('view/card.html'));
            } else if(id > 0) {
                card = await database.pull(id); // Pull Specific for positive integers
                res.status(200);
                // HTML Templating for Opengraph Meta Tags
                var html = fs.readFileSync(path.resolve('view/card.html'), {encoding: 'utf8'});
                // Set Meta Information for Permalinks
                var meta = `<!DOCTYPE html>
                <html>
                    <head>
                        <meta property="og:type" content="website" />
                        <meta property="og:title" content="Blank White Cards | ${card[0].title}" />
                        <meta property="og:description" content="${card[0].description}" />
                        <meta property="og:url" content="https://blankcard.me/card/${card[0].id}" />
                        <meta property="og:image" content="https://blankcard.me/card/${card[0].id}/pic" />`;
                res.status(200);
                if(req.params.meta == "pic") {
                    try {
                        console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Sharing image for card ${card[0].id}`);
                        if (fs.existsSync(path.resolve(`view/img/share/share_${card[0].id}.png`))) {
                            // Read from share cache
                            res.sendFile(path.resolve(`view/img/share/share_${card[0].id}.png`)); 
                        } else {
                            // Create the image in the share cache directory
                            var base64Image = card[0].picture.split(';base64,').pop();
                            fs.writeFile(path.resolve(`view/img/share/share_${card[0].id}.png`), base64Image, {encoding: 'base64'}, function(err) {
                                console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > No cached sharing image found for card ${card[0].id}, creating one`);
                                res.sendFile(path.resolve(`view/img/share/share_${card[0].id}.png`));
                            });
                        }
                    } catch(err) {
                        // Send og banner if image generation fails
                        console.log(`WARNING: ${Date().toString().split(" ").slice(1,5).join(" ")} > Unable to share image for card ${card[0].id}`);
                        console.log(err);
                        res.sendFile(path.resolve(`view/img/share/default.png`)); 
                    }
                } else {
                    res.send(meta+html);
                }
            }
        } catch(error) {
            // Send Search Page for malformed ID
            res.status(200);
            res.sendFile(path.resolve('view/card.html'));
        };
    } else {
        // Send Search Page for malformed ID
        res.status(200);
        res.sendFile(path.resolve('view/card.html'));
    };
});

// Pull Specific Card
app.post('/card/:cardId', async (req,res) => {
    id = Math.floor(Number(req.params.cardId)); // Type Validation
    if(isNaN(id) == false) { // Check it is a number
        try {
            if(id < 0){
                card = await database.pull(-1); // Pull Latest for negative integers
                console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Requested Latest Public Card`);
            } else if(id > 0) {
                card = await database.pull(id); // Pull Specific for positive integers
            } else {
                card = await database.pull(); // Pull Random for 0
                console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Requested Random Public Card`);
            }
            res.send(JSON.stringify(card));
            res.status(200); // Send Status Code
        } catch(error) {
            res.status(404); // Send Status Code
            res.send(JSON.stringify('Bad Query'));
        };
    } else {
        res.sendStatus(404);
    };
});

// Initiate Create a Card
app.get('/create', async (req,res) => {
    // Check Nonce
    token = req.query;

    if(await nonce.checkNonce(token)==true){
        // Nonce Found
        res.status(200);
        res.sendFile(path.resolve('view/create.html'));
    } else { 
        // Nonce Not Found
        res.redirect(`/app`);
    }
});

// Submit Created Card
app.post('/create', [
    check('title').isLength({min:0, max:50}),
    check('description').isLength({min:0, max:280}),
    check('author').isLength({min:0, max:25})
], async (req,res) => {
    // Check Nonce
    token = req.query;

    if(await nonce.removeNonce(token)==true){
        // Nonce Found

        // Check for abandon
        if(req.body.abandon=="1"){
            res.set("Connection", "close");
            res.status(200);
            res.send("Create-A-Card Abandoned");
            return;
        };

        // Validate Input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422);
        };

        // Sanitise Input
        var clean_data = sanitise.clean(req.body);

        // Send to Database
        new_id = await database.add(clean_data);

        // Go back to App
        res.set("Connection", "close");
        res.status(200);
        res.send({id: new_id});
    } else { 
        // Nonce Not Found
        res.sendFile(path.resolve('view/error.html'));
    };
});

// CUSTOM GAMES **********************************************

// Custom Join Page
app.get('/custom', (req,res) => {
    res.status(200);
    res.sendFile(path.resolve('view/custom.html'));
});

// Custom Create
app.post('/custom', [
    check('seed').isInt(),
    check('downloadsecret').isInt(),
], async (req,res) => {
    if(req.body.downloadsecret > 0 && req.body.downloadsecret < 10000) {
        room = await nonce.setActive(req.body.downloadsecret); // Set to User Defined Secret
    } else {
        room = await nonce.setActive(0); // Set Secret to 0
    }
    status = await nonce.checkActive(room);
    if(room > 99 && room < settings.rooms && status){
        await database.reset(room, req.body.seed);
        res.status(200);
        res.send(JSON.stringify(room));
    } else {
        res.status(200);
        res.send(JSON.stringify(false));
    };
});

// Custom Lobby Page
app.get('/:room', async (req,res) => {
    // Room Validation
    room = Math.floor(Number(req.params.room));
    status = await nonce.checkActive(room);
    if(room > 99 && room < settings.rooms && status) {
        res.status(200); // Custom Rooms
        res.sendFile(path.resolve('view/lobby.html'));
    } else if(req.params.room == "app") {
        res.status(200); // Exceptions for Premade Decks
        res.sendFile(path.resolve('view/lobby.html'));
    } else {
        res.status(200);
        res.sendFile(path.resolve('view/error.html'));
    };
});

// Get Private App Client
app.get('/:room/app', async (req,res) => {
    // Room Validation
    room = Math.floor(Number(req.params.room));
    status = await nonce.checkActive(room);
    if(room > 99 && room < settings.rooms && status){
        if(req.query.acceptTerms == true) {
            res.status(200);
            res.sendFile(path.resolve('view/app.html'));
        } else {
            res.status(301);
            res.redirect(`/${room}`);
        }
    } else {
        res.status(200);
        res.sendFile(path.resolve('view/error.html'));
    };
});

// Pull Random Card from Private Collection
app.post('/:room/card', [
    check('id').isInt(),
    check('vote').isString()
], async (req,res) => {
    // Room Validation
    room = Math.floor(Number(req.params.room)); 
    status = await nonce.checkActive(room);
    if(room > 99 && room < settings.rooms && status){
        // Process Like
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            var vote = req.body;
            // Check recently dealt cards
            if(nonce.findRecent(vote.id, room)){
                // Send to Database
                await database.like(vote, room);
            };
        };

        // Draw a sample of random cards
        try {
            // Chance of Drawing a Blank
            if(Math.random()>settings.blank_chance[room]){
                // Draw a card
                var cards = await database.pull(undefined, room);
                // Log it as recent
                await nonce.addRecent(cards, room);
                // Send Response
                res.send(JSON.stringify(cards));
                res.status(200); // Send Status Code
            } else {
                // Reset to false (0%) on blank draw
                settings.blank_chance[room] = 0;
                // Draw a blank => Create a card
                var token = await nonce.getNonce(room);
                // Send Blank Card
                res.send(JSON.stringify(token));
                res.status(200); // Send Status Code
            }        
        } catch(error) {
            res.status(404); // Send Status Code
            res.send(JSON.stringify('Bad Query'));
        };
    } else {
        res.status(200);
        res.send(JSON.stringify(false));
    };
});

// Pull Random Card In Synchronised Mode
app.post('/:room/sync', [
    check('id').isInt(),
    check('vote').isString()
], async (req,res) => {
    // Room Validation
    room = Math.floor(Number(req.params.room)); 
    status = await nonce.checkActive(room);
  
    if(room > 99 && room < settings.rooms && status){ // Draw Random Cards from Database
        // Process Like
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            var vote = req.body;
            // Serve Sync requests from cache
            if(vote.vote == "sync"){     
                cards = await cache.getCache(room);
                res.send(JSON.stringify(cards));
                res.status(200); // Send Status Code
                return;
            } else if(nonce.findRecent(vote.id, room)){ // Check recently dealt cards
                // Send to Database
                await database.like(vote, room);
            };
        };

        // Draw a sample of random cards
        try {
            // Chance of Drawing a Blank
            if(Math.random()>settings.blank_chance[room]){
                // Draw a card
                var cards = await database.pull(undefined, room);
                // Log it as recent
                await nonce.addRecent(cards, room);
                // Select Card By Least Dislikes (Priority to Newer Cards)
                cards.sort((a, b) => (a.dislikes > b.dislikes) ? 1 : -1)
                cards = [cards[0]];
                // Send Card to Cache
                await cache.setCache(room, cards[0]);
                // Send Response
                res.send(JSON.stringify(cards));
                res.status(200); // Send Status Code
            } else {
                // Reset to false (0%) on blank draw
                settings.blank_chance[room] = 0;
                // Draw a blank => Create a card
                var token = await nonce.getNonce(room);
                // Send Blank Card
                res.send(JSON.stringify(token));
                res.status(200); // Send Status Code
            }        
        } catch(error) {
            res.status(404); // Send Status Code
            res.send(JSON.stringify('Bad Query'));
        };
    } else {
        res.status(200);
        res.send(JSON.stringify(false));
    };
});

// Initiate Create a Card for Private Room
app.get('/:room/create', async (req,res) => {
    // Room Validation
    room = Math.floor(Number(req.params.room)); 
    status = await nonce.checkActive(room);
    if(room > 99 && room < settings.rooms && status){
        // Check Nonce
        token = req.query;

        if(await nonce.checkNonce(token, room)==true){
            // Nonce Found
            res.status(200);
            res.sendFile(path.resolve('view/create.html'));
        } else { 
            // Nonce Not Found - redirect back to room
            res.redirect(`/${room}`);
        }
    } else {
        res.status(200);
        res.sendFile(path.resolve('view/error.html'));
    };
});

// Submit Created Card to Private Collection
app.post('/:room/create', [
    check('title').isLength({min:0, max:50}),
    check('description').isLength({min:0, max:280}),
    check('author').isLength({min:0, max:25})
], async (req,res) => {
    // Room Validation
    room = Math.floor(Number(req.params.room));
    status = await nonce.checkActive(room);
    if(room > 99 && room < settings.rooms && status){
        // Check Nonce
        token = req.query;

        if(await nonce.removeNonce(token, room)==true){
            // Nonce Found

            // Check for abandon
            if(req.body.abandon=="1"){
                res.set("Connection", "close");
                res.status(200);
                res.send("Create-A-Card Abandoned");
                return;
            };

            // Validate Input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(422);
            };

            // Sanitise Input
            var clean_data = await sanitise.clean(req.body);

            // Send to Database
            new_id = await database.add(clean_data, room);

            // Go back to App
            res.set("Connection", "close");
            res.status(200);
            res.send({id: new_id});
        } else { 
            // Nonce Not Found
            res.sendFile(path.resolve('view/error.html'));
        };
    } else {
        res.status(200);
        res.sendFile(path.resolve('view/error.html'));
    };
});

// Get Download Client
app.get('/:room/data', async (req, res) => {
    // Room Validation
    room = Math.floor(Number(req.params.room)); 
    status = await nonce.checkActive(room);
    if(room > 99 && room < settings.rooms && status){
        // Check Nonce
        token = req.query;

        if(await nonce.checkNonce(token, room, 1) == true){
            // Nonce Found
            res.status(200);
            res.sendFile(path.resolve('view/data.html'));
        } else { 
            // Nonce Not Found
            res.sendFile(path.resolve('view/error.html'));
        }
    } else {
        res.status(200);
        res.sendFile(path.resolve('view/error.html'));
    };
});

// Check Downloading
app.post('/:room/data', [
    check('downloadsecret').isInt(),
], async (req,res) => {
    // Room Validation
    room = Math.floor(Number(req.params.room));
    status = await nonce.checkActive(room);
    if(room > 99 && room < settings.rooms && status){
        // Check Download Secret
        clientsecret = req.body.downloadsecret;
        var data = {};
        data.downloadable = await nonce.checkDownload(room, clientsecret);
        if(data.downloadable == 1) {
            data.nonce = await nonce.getNonce(room, 1); // Get a Download Nonce
        }
        data.count = await database.countCards(room);
        res.send(JSON.stringify(data));
    }
});

// Send Download
app.post('/:room/data/save', async (req, res) => {
    // Room Validation
    room = Math.floor(Number(req.params.room)); 
    status = await nonce.checkActive(room);
    if(room > 99 && room < settings.rooms && status){
        // Check Nonce
        token = req.query;

        if(await nonce.checkNonce(token, room, 1) == true){
            // Nonce Found
            res.status(200);
            var deck = await database.download(room);
            res.send(JSON.stringify(deck));
        } else { 
            // Nonce Not Found
            res.sendFile(path.resolve('view/error.html'));
        }
    } else {
        res.status(200);
        res.sendFile(path.resolve('view/error.html'));
    };
});

// Receive Upload
app.post('/:room/data/load', async (req, res) => {
    // Room Validation
    room = Math.floor(Number(req.params.room)); 
    status = await nonce.checkActive(room);
    if(room > 99 && room < settings.rooms && status){
        // Check Nonce
        token = req.query;

        if(await nonce.checkNonce(token, room, 1) == true){
            // Nonce Found
            res.status(200);
            var cards = req.body.page;
            var cleancards = cards.map((card) => {return sanitise.clean(card)});
            var result = await database.upload(room, cleancards);          
            res.send(JSON.stringify(result));
        } else { 
            // Nonce Not Found
            res.sendFile(path.resolve('view/error.html'));
        }
    } else {
        res.status(200);
        res.sendFile(path.resolve('view/error.html'));
    };
});

// ERROR HANDLING ********************************************

// Catch All Unhandled Routes
app.get('/*', (req,res) => {
    res.status(200);
    res.sendFile(path.resolve('view/error.html'));
});