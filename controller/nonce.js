/*
Blank White Cards - Nonce for Controller
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

// Require Settings
var settings = require("../model/settings");
var mongo = require('mongodb').MongoClient;
var database = require('../model/database.js');

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

// Get Nonce for Card Creation
async function getNonce(room, type) {
    // Check Room - Default to 0 for Public
    if(room == undefined){
        room = 0;
    };

    // Get Nonce
    var nonce = {
        time: String(Date.now()),
        value: String(Math.random()),
        id: (type ? "1" : "0"), // Blank Cards Have Id 0 by convention, 1 is a download nonce
        room: room
    }
    
    // Add to Collection
    await db.collection("nonces").insertOne(nonce);
    return [nonce];
};

// Check Nonce
async function checkNonce(nonce, room, type) {
    // Check Room - Default to 0 for Public
    if(room == undefined){
        room = 0;
    };

    // Search Collection for Current Nonce by Time
    var match = await db.collection("nonces").find({time: nonce.time}).limit(1).toArray();
    
    // Execute
    if(match.length == 1) {
        if((match[0].time == nonce.time) && (match[0].value == nonce.value) && (match[0].room == room)) {
            if(match[0].id == "1" && type == 1) {
                console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Data token is valid for room: ${room}`);
                return true; // Nonce Found
            } else if(type != 1 && match[0].id != "1") {
                console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Creation token is valid for room: ${room}`);
                return true; // Nonce Found
            } else {
                return false; // Nonce not Valid
            }
        }
    } else {
        console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Nonce Not Found`);
        return false; // Nonce Not Found
    };
};

// Remove Nonce when done
async function removeNonce(nonce, room) {
    // Check Room - Default to 0 for Public
    if(room == undefined){
        room = 0;
    };
    
    // Remove Nonce
    var match = await db.collection("nonces").deleteOne({time: nonce.time, value: nonce.value, room: room});

    if(match.deletedCount == 1) {
        console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Creation token removed for room: ${room}`);
        return true; // Nonce Found and Removed
    } else {
        console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Nonce Not Found`);
        return false; // Nonce Not Found
    };
};

// Log Recent Card
async function addRecent(cards, room) {
    // Check Room - Default to 0 for Public
    if(room == undefined){
        room = 0;
    };

    // Init Recents
    var recents = [];
    
    for(const card of cards) {
        if(card.id>0){
            // Greate Recent Entry
            var recent = {
                room: room,
                id: String(card.id),
                time: String(Date.now())
            };
            recents.push(recent);
        };
    };

    // Add to collection
    await db.collection("recents").insertMany(recents);
    return;
};

// Check Off Recent Card
async function findRecent(id, room) {
    // Check Room - Default to 0 for Public
    if(room == undefined){
        room = 0;
    };

    if(id>0){    
        // Find a matching recents entry
        var match = await db.collection("recents").find({room: room, id: id}).limit(1).toArray();
        // Execute
        if(match.length == 1) {
            // Remove Nonce
            await db.collection("recents").deleteOne({room: room, id: id});
            return true; // Recent Found and Removed
        } else if(id != 1) {
            console.log(`DEBUG: Card ${id} in room ${room} not dealt recently`);
            return false; // Recent Not Found
        };
    };
};

// Check Active Rooms
async function checkActive(room) {
    var match = await db.collection("active").find({room: room}).limit(1).toArray();
    if(match.length == 0) {
        return false;
    } else {
        return true;
    }
}

// Set Active Room
async function setActive(download) {
    var existing = true;
    var attempts = 0; // Limit Attempts at Creating
    while(existing==true && attempts < 10){
        id = Math.floor((Math.random()*(settings.rooms-100))+100);
        existing = await checkActive(id);
        attempts++;
    }
    if(attempts >= 10){
        return false;
    } else {
        room = {
            room: id,
            time: String(Date.now()),
            download: download
        };
        // Add to collection
        await db.collection("active").insertOne(room);
        return room.room;
    }
}

// Count Active Rooms
async function countActive() {
    try {
        return [(await db.collection('active').stats()).count, (settings.rooms - 100)];
    } catch(err) {
        console.log(`ERROR: ${Date().toString().split(" ").slice(1,5).join(" ")} > Unable to Connect to Database`);
    }
}

// Check Downloadable Rooms
async function checkDownload(room, clientsecret) {
    var match = await db.collection("active").find({room: room}).limit(1).toArray();
    var serversecret = match[0].download;
    if(clientsecret == serversecret) {
        return 1; // Secret Match
    } else if(serversecret == 0) {
        return 0; // Not Downloadable
    } else {
        return -1; // Secret Mismatch
    }
}

// Cleanup Old Artefacts
const clean = setInterval(async () => {
    // Times
    var current_time = Date.now();
    var expired_time = String(current_time - settings.expiry);
    var inactive_time = String(current_time - settings.timeout);
    
    // Clean Nonces & Recents
    console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Cleaning Nonces... step 1 of 2`);
    try {
        var deleted_nonces = await db.collection("nonces").deleteMany({time: {$lt: expired_time}});
        var deleted_recents = await db.collection("recents").deleteMany({time: {$lt: expired_time}});
        console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Cleaned ${deleted_nonces.deletedCount} Tokens`);
        console.log(`${deleted_recents.deletedCount ? 'INFO' : 'DEBUG'}: ${Date().toString().split(" ").slice(1,5).join(" ")} > Cleaned ${Math.floor(deleted_recents.deletedCount/settings.sample)} Recents`);
    } catch(err) {
        console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > No Nonces or Recents Found`);
    };

    // Clean Rooms
    console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > Cleaning Active... step 2 of 2`);
    try {
        var match = await db.collection("active").find({time: {$lt: inactive_time}}).toArray();
        match.forEach(async (room) => {
            await database.reset(room.room);
        });
        var deleted = await db.collection("active").deleteMany({time: {$lt: inactive_time}});
        console.log(`${deleted.deletedCount ? 'INFO' : 'DEBUG'}: ${Date().toString().split(" ").slice(1,5).join(" ")} > Cleaned ${deleted.deletedCount} Rooms`);
    } catch(err) {
        console.log(`DEBUG: ${Date().toString().split(" ").slice(1,5).join(" ")} > No Active Found`);
    };
}, settings.expiry);

// Export
exports.getNonce = getNonce;
exports.checkNonce = checkNonce;
exports.removeNonce = removeNonce;
exports.addRecent = addRecent;
exports.findRecent = findRecent;
exports.checkActive = checkActive;
exports.setActive = setActive;
exports.countActive = countActive;
exports.checkDownload = checkDownload;