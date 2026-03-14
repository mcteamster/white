/*
Blank White Cards - Settings for Model
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

// Private Lobby Settngs
var rooms = (100+50); // Set the upper limit for rooms (lower limit is 100 - min 3 digit codes)

// Probability of Drawing a Blank Card
var blank_chance = Array(rooms).fill(0); // Start with 0% Blank Chance In All Lobbies
var blank_intercept = -0.5; // Buffer after drawing a blank
var blank_step = 0.1; // Increase chance for every non-blank drawn

// Nonce Expiry Time in ms
var expiry = 10*(60*1000); // 10 minutes

// Room Inactivity Timeout in ms
var timeout = 3*(60*(60*1000)); // 3 Hourly Timeout For Custom Rooms

// Database Parameters
if(1) { // Prod (True) or Test (False)
    var url = "mongodb://node:node@172.26.1.80:27017/test"; // Prod Container MongoDB Endpoint
} else {
    var url = "mongodb://10.0.0.2:27017/test"; // Test VM MongoDB Endpoint (No Auth needed)
}
var db = "test" // MongoDB Database Name
var sample = 5; // Card pull random sample size (larger favours newer cards, but higher compute cost)

// Exports
exports.blank_chance = blank_chance;
exports.blank_intercept = blank_intercept;
exports.blank_step = blank_step;
exports.expiry = expiry;
exports.timeout = timeout;
exports.url = url;
exports.db = db;
exports.sample = sample;
exports.rooms = rooms;