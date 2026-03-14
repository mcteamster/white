/*
Blank White Cards - blankcard.me
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

// Entry Point for Blank White Cards
console.log(`INFO: ${Date().toString().split(" ").slice(1,5).join(" ")} > Welcome to Blank White Cards`);

// Start Web Server
require('./controller/listener');

// Run Maintenance Tools (Deactivate in PROD)
//require('./model/tools');

/* Logs Appended to >> /log.txt
DEBUG: Background daemonesque events
INFO: Interesting, manual events
WARNING: Something wrong, app still works
ERROR: App degraded
*/