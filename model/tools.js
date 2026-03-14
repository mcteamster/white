/*
Blank White Cards - Tools for Model
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
var database = require('../model/database.js'); // Database Query

// Iterate through all cards
async function sweep() {
    setTimeout(async () => {
        var total = await database.countCards();
        
        for(id=191; id<=total; id++) {
            card = await database.pull(id); // Pull Card    
            fillWhite(card); // Generate white background for all global cards
        }
    }, 1000); // Wait for DB connection
}
sweep();

// SHARP DEPENDENCY (Disable in PROD) ***********************************************
/*
const sharp = require('sharp'); // Sharp for image processing
// Set Picture background from transparent to white for all cards
async function fillWhite(card) {
    if(card[0].picture != null) {
        var base64Image = card[0].picture.split(';base64,').pop();
        fs.writeFile(path.resolve(`view/img/share/share_temp_${card[0].id}.png`), base64Image, {encoding: 'base64'}, async function(err) {
            console.log(`INFO: ${Date().toString().split(" ").slice(1,5).join(" ")} > Generating white background for card ${card[0].id}`);
            // Add White Background
            var white = await sharp(`view/img/share/share_temp_${card[0].id}.png`).flatten({background: {r: 255, g: 255, b: 255}});

            // Export to Data URI
            var buffer = await white.toBuffer();
            var uri = `data:image/png;base64,${buffer.toString('base64')}`;
            var data = {
                id: card[0].id,
                picture: uri
            }
            if(await database.update(data, 0)){
                console.log(`INFO: ${Date().toString().split(" ").slice(1,5).join(" ")} > Card ${card[0].id} update successful`);
            } else {
                console.log(`INFO: ${Date().toString().split(" ").slice(1,5).join(" ")} > Card ${card[0].id} update failed`);
            }
        });
    } else {
        console.log(`INFO: ${Date().toString().split(" ").slice(1,5).join(" ")} > Card ${card[0].id} has no picture`);
    }
}
*/
