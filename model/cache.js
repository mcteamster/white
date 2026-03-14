/*
Blank White Cards - Cache for Model
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

// Require
var fs = require('fs');
var settings = require('../model/settings.js'); // Server Settings
var mongo = require('mongodb').MongoClient; // MongoDB
var list = JSON.parse(fs.readFileSync('./model/initialise.json','utf8')); // Single Seed Initial Card

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

// Cache a card for a room
async function setCache(room, card) {
    try {
        room = String(room);
        var cached_card = {
            room: room,
            card: [card]
        }
        // Room name is conventionally a String - raze all integer room references
        deletestatus = await db.collection("cache").deleteMany({$or: [{room: room}, {room: {$type: "int"}}]});
        upsert = await db.collection("cache").replaceOne({room: room}, cached_card, {upsert: true});
        return true;
    } catch(err) {
        console.log(`WARNING: ${Date().toString().split(" ").slice(1,5).join(" ")} > Problem setting cache for room ${room}`);
        return false;
    }
}

// Read Card Cache
async function getCache(room) {
    try {
        room = String(room);
        var match = await db.collection("cache").find({room: room}).limit(1).toArray();
        //console.log(await db.collection("cache").find({}).toArray());
        if(match.length == 1) {
            return match[0].card;
        } else {
            return list.card;
        }
    } catch(err) {
        return list.card;
    }
}

// Exports
exports.setCache = setCache;
exports.getCache = getCache;