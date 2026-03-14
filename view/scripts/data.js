// Download/Upload Scripts
// Blank White Cards

// Variables
var room = "";
var cards = [];

// Load Path Name
$(document).ready(function() {
    room = Math.floor(window.location.pathname.split("/")[1]); // Identify room by splitting path
    if(room > 0){
        $("title").html(`Blank White Cards | #${room}`);
        $("#welcome").html(
            `<p id="note" style="font-size: 0.5em;">Deck&nbsp;${room}</p>
            <p id="cardcount" style="font-size: 0.25em;"><br>0 cards</p>
            <p style="font-size: 0.25em;"><br>
            Save a copy of all the cards in this deck<br>
            Upload a saved deck to start where you left off! [beta]</p>`
        );
    } else {
        window.location = "/error";
    }

    // Load Buttons
    $("#title").html(`
        <p id='left'>Save</p>
        <p id='right' onclick="popup(true)">Load</p>`);
    $("#left").click(()=>{
        format();
    });

    getCount();
});

// Show/Hide Menu
async function menu(status) {
    if(status==true){
        $("#nav").show();
        $("#nav").on("mouseover", (e)=>{
            e.stopPropagation();
        });
    } else if(status==false){
        $("#nav").hide();
    }
};

// Go Back
async function back() {
    window.history.back();
}

// Format Download
function format() {
    $("#left").unbind().text("Saving...").css("color","grey");
    $.post(`/${room}/data/save/${window.location.search}`, (cards) => {
        // Format Cards into HTML
        var formatted = "";
        JSON.parse(cards).forEach((data) => {
            // Format Card
            var card = `<div class='card' id="${data._id}" onclick='toggleCard("${data._id}")'>`;

            // Handle Null Picture
            if(data.picture == null) {
                card += `<div class="picture center">${data.title}</div>`;
            } else {
                card += `<div class="picture center" style="background-image: url(${data.picture})"></div>`;
            }
            card += `<h3 class="description">${data.description}</h3>
                <p class="credit">by ${data.author}</p>
                <div class="title center drawn"><h2>${data.title}</h2></div>
                </div>`;
            formatted += card;
        })

        // Format Deck
        var deck = `<!DOCTYPE html><html><head><script>var cards = 
                ${cards};
                // Toggle Inclusion
                function toggleCard(id) {
                    var card = document.getElementById(id);
                    card.classList.toggle("exclude");
                    var index = cards.findIndex(card => card._id == id);
                    (cards[index].reports == 0) ? (cards[index].reports = 1) : (cards[index].reports = 0);
                    window.onbeforeunload = () => {return true};
                }

                // Save
                function saveDeck() {
                    var currentDeck = document.documentElement.outerHTML
                    var splitDeck = currentDeck.split('\\n');
                    splitDeck[1] = JSON.stringify(cards)+";";
                    var newDeck = splitDeck.join('\\n');
                    var today = new Date();
                    var datetime = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()+"_"+today.getHours()+today.getMinutes()+today.getSeconds();;
                    var dltemp = document.createElement('a');
                    dltemp.setAttribute("href", 'data:text/html;charset=utf-8,'+encodeURIComponent(newDeck));
                    dltemp.setAttribute("download","BlankWhiteCards_"+datetime);
                    dltemp.style.display = "none";
                    document.body.append(dltemp);
                    dltemp.click();
                    document.body.removeChild(dltemp);
                    window.onbeforeunload = null;
                }
                </script>
                <title>Blank White Cards</title>
                <link rel="icon" type="image/png" href="https://blankcard.me/img/favicon.png"/>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
                <style>
                    @import url(https://fonts.googleapis.com/css?family=Patrick+Hand+SC);
        
                    body {
                        width: 100%;
                        height: 100%;
                        padding: 0;
                        margin: 0;
                        font-family: "Patrick Hand SC", Arial, Helvetica, sans-serif;
                        color: black;
                        background: #333;
                        user-select: none;
                        -webkit-user-select: none;
                        touch-action: manipulation;
                        -webkit-tap-highlight-color: transparent;
                        overflow-x: hidden;
                        overflow-y: scroll;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                    }

                    a {
                        color: black;
                    }
        
                    .center {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
        
                    .drawn {
                        border-radius: 255px 25px 225px 25px/25px 225px 25px 255px;
                        border: 0.5em black solid;
                    }
        
                    .card {
                        background: white;
                        border-radius: 10px;
                        margin: 1em;
                        max-width: 250px;
                    }
        
                    .picture {
                        min-height: 250px;
                        min-width: 250px;
                        border-radius: 10px 10px 0px 0px;
                        text-align: center;
                        font-size: 3em;
                        word-wrap: break-word;
                        flex-grow: 1;
                        background-position: center;
                        background-size: contain;
                        background-repeat: no-repeat;
                    }
                    
                    .description{
                        min-height: 4em;
                        margin: 1em 1em 0 1em;
                        display: flex;
                        flex-direction: column-reverse;
                    }
        
                    .credit{
                        margin: 0 1.5em 0 1em;
                        text-align: right;
                    }
        
                    .title{
                        margin: 0 1em 1em 1em;
                        text-align: center;
                    }

                    .exclude {
                        opacity: 0.5;
                    }
        
                    #header {
                        background: white;
                        text-align: center;
                    }
        
                    #table {
                        height: 100%;
                        padding: 1em;
                        flex-wrap: wrap;
                    }

                    #saveIcon {
                        position: fixed;
                        top: 0;
                        left: 0;
                        margin: 0.25em 0.5em;
                        color: grey;
                        cursor: pointer;
                    }

                    #tip {
                        color: grey;
                        text-align: center;
                        padding: 0 1em;
                        margin: 1em 0 0;
                    }
                </style>
            </head>
            <body>
                <div id="header" class="center"><h1>deck exported from <a href="https://blankcard.me"><u>blankcard.me</u></a><h1></div>
                <p id="tip" class="center">tap a card to exclude from future uploads. tap again to include. remember to SAVE the deck when you're done making changes</p>
                <div id="table" class="center">
                    ${formatted}
                </div>
                <div id="saveIcon" onclick="saveDeck()">SAVE</div>
            </body>
        </html>`

        // Set Timestamp
        var today = new Date();
        var datetime = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()+"_"+today.getHours()+today.getMinutes()+today.getSeconds();;

        // Create Download Element
        var dltemp = document.createElement('a');
        dltemp.setAttribute("href", 'data:text/html;charset=utf-8,'+encodeURIComponent(deck));
        dltemp.setAttribute("download",`BlankWhiteCards_${datetime}`);
        dltemp.style.display = "none";
        document.body.append(dltemp);
        dltemp.click();
        document.body.removeChild(dltemp);
        $("#left").unbind().text("Saved").css("color","black");
    }); 
}

// Pop Up
function popup(state) {
    if(state==true){
        $("#yes").css("color","grey").unbind().click(()=>{$("#filelabel").click()});
        $("#popup").css("z-index","2");
        $("#popup").css("background","rgba(0,0,0,0.75)");
        $("#filelabel").css("background","lightgrey");
        $("#filemessage").css("background","lightgrey");
        $('#fileselector').on("change", () => {
            try {
                $("#filelabel").text("Select a File");
                var uploaded = $("#fileselector").get(0).files[0];
                $("#filelabel").text(uploaded.name);
                var reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        var text = event.target.result.split("\n")[1]; // Read 2nd Line
                        cards = JSON.parse(text.substring(0, text.length -1)); // Remove Trailing Semicolon and parse
                        $("#yes").html("<u>Submit</u>").css("color","black").unbind().click(()=>{upload(cards)});
                    } catch(err) {
                        $('#filelabel').text("Invalid File");
                        $("#yes").html("<u>Try Again</u>").css("color","grey");
                    }
                }
                reader.readAsText(uploaded);
            } catch(err) {
                $("#yes").html("<u>Try Again</u>").css("color","grey");;
            }
        });
    } else if(state==false) {
        $("#yes").html("<u>Upload</u>").unbind();
        $('#fileselector').unbind();
        $('#filelabel').text("Select a File");
        $("#popup").css("z-index","-1");
        $("#popup").css("background","rgba(0,0,0,0)");
        document.activeElement.blur();
    }
}

// Upload Deck
async function upload(cards) {
    $('#filelabel').hide();
    $("#yes").hide();
    $("#no").hide();
    var filteredCards = cards.filter((card) => {return card.reports != 1});
    var total = filteredCards.length;
    var importedcount = 0;
    $('#filemessage').show().text(`Importing ${importedcount}/${total} cards`);
    for(i=0; i<cards.length; i+=5) {
        var page = cards.slice(i,i+5);
        page.forEach((card)=>{
            var textArea = document.createElement("textarea");
            textArea.innerHTML = card.title;
            card.title = textArea.value;
            textArea.innerHTML = card.description;
            card.description = textArea.value;
            textArea.innerHTML = card.author;
            card.author = textArea.value;
        })
        try {
            await $.post(`/${room}/data/load/${window.location.search}`, {page}, (result)=>{
                if(JSON.parse(result) == false) {
                    $('#filelabel').show().text("Upload Failed");
                    $("#yes").show().html("<u>Try Again</u>").css("color","grey").unbind().click(()=>{$("#filelabel").click()});
                    $("#no").show();
                    $('#filemessage').hide();
                    return false;
                } else {
                    importedcount += parseInt(result);
                    $('#filemessage').text(`Importing ${importedcount}/${total} cards`);
                }
            });
        } catch(err) {
            console.log("Error");
        }
    }
    $('#filelabel').show().text(`Imported ${importedcount}/${total} cards`);
    $("#yes").show().html("<u>More?</u>").css("color","black").unbind().click(()=>{$("#filelabel").click()});
    $("#no").show();
    $('#filemessage').hide();
    getCount();
    return true;
}

// Count Cards
function getCount() {
    $.post(`/${room}/data`, (data)=>{
        var count = JSON.parse(data).count-1;
        $("#cardcount").html(`<br>${count} ${count == 1 ? "card" : "cards"}`);
    });
}