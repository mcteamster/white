/*
Blank White Cards - Sanitise for Controller
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

// Import Module
var validator = require('validator');

function clean(data) {
    try {
        // Exclude Reported Cards
        if(data.reports == true) {return false};

        // Escape Strings
        var title = validator.escape(data.title);
        var description = validator.escape(data.description);
        var author = validator.escape(data.author);
        if(author.localeCompare('mcteamster', undefined, {sensitivity: 'base'}) === 0){
            author = 'anon';
        } // Reserve 'mcteamster' in author field

        // Check Picture Exists
        var picture = data.picture;

        // Check Picture is a PNG Data URI
        if(picture.startsWith("data:image/png;base64,")==false){
            picture=null;
        } else if(validator.isDataURI(picture)==false){
            picture=null;
        };

        // Format Card
        var clean_data = {
            title: title,
            description: description,
            author: author,
            picture: picture
        };

        return clean_data;
    } catch (err) {
        return false;
    }
};

exports.clean = clean;