// Front end scripts
// Blank White Cards

// Nonce
var nonce = {};

// Card Data
var title = "";
var previous = 0;
var likes = 0;
var dislikes = 0;

// Booleans
var heart = false;
var sync = true; // Start with Sync Enabled for Custom Rooms
var plus = false;

// Past Cards
var past = Array(25).fill(0); // Try to avoid picking the same card again with 25 draws
var retries = 0;

// Room Number
var room;

// Title Bar Width
var width = 1;

// Touchable
var touchable = 'ontouchstart' in document.documentElement;

// Keyboard
var spacedown = false; 

// On Load Functions
$(document).ready(function() {
    // Load Path Name
    room = Math.floor((window.location.pathname.replace(/^\/|\/$/g, '')).split("/")[0]); // Find Room Number as first argument in path
    //console.log(room);
    if(room > 99) { // Enable Create-A-Card and Sync for Custom Rooms
        window.history.replaceState("", "", `/${room}/`);

        // Configure Popup
        $("#dialog").html('<h3 id="prompt">\
        <span><p id="note">Export this deck </p>\
        <div id="linktext" class="submit drawn" readonly></div></span></h3>\
        <h3 id="yes" onclick="syncToggle()" style="color:red;"><u>Pause Sync</u></h3>\
        <h3 id="no" onclick="popup(false)"><u>Back</u></h3>').click((e => {
            e.stopPropagation();
            copyLink();
        }));
        $("#middle").html("&#8942;").click((e) => {
            e.stopPropagation();
            popup(true);
        });
        $("#share").val(`https://blankcard.me/${room}`);

        // Configure Action
        $("#action").html("&#9998;").css("color","lightgrey").addClass("cw90").click((e) => {
            e.stopPropagation();
            action(-2);
        });
    } else { // Like and additional actions function for Global deck
        window.history.replaceState("", "", `/app`);

        // Configure Popup
        $("#dialog").html('<h3 id="prompt">\
        <span><p id="note">Share this card</p>\
        <div id="linktext" class="submit drawn" readonly></div></span></h3>\
        <h3 id="yes" class="reportthis" onclick="action(-1)"><u>Report</u></h3>\
        <h3 id="no" onclick="popup(false)"><u>Back</u></h3>').click((e => {
            e.stopPropagation();
            copyLink();
        }));
        $("#middle").html("&#8942;").click((e) => {
            e.stopPropagation();
            popup(true);
        });
        $("#action").html("&#9734;").css("color","lightgray").click((e) => {
            e.stopPropagation();
            if(heart == false){
                heart = true;
                //$("#action").html("&#9829;");
                $("#action").css({"color":"gold"}).html("&#9733;");
            } else if(heart == true){
                heart = false;
                //$("#action").html("&#9825;")
                $("#action").css({"color":"lightgray"}).html("&#9734;");
            }
        });
    };

    // Mouseup and Mousedown UI/UX Animations
    if(touchable == true && (room > 99 || Number.isNaN(room))) {
        // In Touchscreen Rooms
        $("#bar").on("touchstart", (e) => {
            e.stopPropagation();
            // Exception if Blank
            if(nonce.id != 0 && width < 2) {
                width = 1;
                var id = setInterval(frame, (card.id==1) ? 25:10); // Slow down when deck is empty
                function frame() {
                    if (width == 100 || width == 0) {
                        if(width == 0) {
                            clearInterval(id);
                        } else {
                            $("#title").css("background","lightgrey").text("...");
                            width = 0;
                            action();
                        }
                    } else if(width == -1) {
                        $("#title").css("background","white").html(title);
                        clearInterval(id);
                    } else {
                        width++;
                        $("#title").css("background", `linear-gradient(to right, lightgrey, ${width}%, lightgrey, ${width}%, white)`).text("Tap & Hold");
                    }
                }
            } else if(nonce.id != 0 && width >= 2) {
                $("#title").css("background","white").html(title);
                width = 0;
                return;
            }
        }).on("touchend", (e) => {
            e.stopPropagation();
            if(width >= 100 || nonce.id == 0) {
                width = 0;
                //action();
            } else {
                width = -50;
            }
        })
    } else if(room > 99 || Number.isNaN(room)) {
        // In Mouse Rooms
        $("#bar").mousedown((e) => {
            e.stopPropagation();
            // Exception if Blank
            if(nonce.id != 0) {
                width = 1;
                var id = setInterval(frame, (card.id==1) ? 20:5); // Slow down when deck is empty
                function frame() {
                    if (width >= 100 || width == 0) {
                        if(width == 0) {
                            clearInterval(id);
                        } else {
                            $("#title").css("background","lightgrey").text("Next Card");
                        }
                    } else if(width == -1) {
                        $("#title").css("background","white").html(title);
                        clearInterval(id);
                    } else {
                        width++;
                        $("#title").css("background", `linear-gradient(to right, lightgrey, ${width}%, lightgrey, ${width}%, white)`).text("Tap & Hold");
                    }
                }
            }
        }).mouseup((e) => {
            e.stopPropagation();
            if(width >= 100 || nonce.id == 0) {
                width = 0;
                action();
            } else {
                width = -100;
            }
        }).mouseout((e) => {
            if(width != 0) { 
                $("#title").css("background","white").html(title);
            }
            width = 0;
            e.stopPropagation();
        })

        // Keybindings
        $("body").keydown((e) => {
            if (e.which == 32 && spacedown == false) {
                e.preventDefault();
                spacedown = true;
                $("#bar").mousedown(); // Space to Draw
            } else if(e.which == 27) {
                // Esc to Cancel
                e.preventDefault();
                if(nonce.id == 0) {
                    $("#right").click();
                } else {
                    $("#bar").mouseout();
                }
            }
        }).keyup((e) => {
            if(e.which == 32 && spacedown == true) {
                e.preventDefault();
                spacedown = false;
                $("#bar").mouseup(); // Space to Draw 
            } else if(e.which == 13) {
                if(nonce.id == 0) {
                    $("#left").click(); // Enter to Create
                } else if(heart == false) {
                    $("#action").click();
                }
            } 
        })
    }

    // Supress Context Menus from Long Pressing
    $("#bar").contextmenu((e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });

    // Start by Drawing a new card
    if(room > 99) {
        syncPull(); // Synchronise
    } else {
        sync = false; // Disable Sync for Global Deck
        action(2);
    }
});

// Bar Action
var action = function(type, passed_vote){
    if(nonce.id!=0) {
        switch(type) {
            case 2: // Next Card
                // Show Loading
                $("#title").css("background","white").text("...");
                $("#description").html("");
                $("#credit").html("Loading...");
                $("#action").hide();

                // Clear Picture
                $("#picture").html("");
                $("#picture").css("background-image", "none");

                // Pull Next Card
                passed_vote = {id: previous, vote: heart};
                next(passed_vote);
                if(sync == true) {
                    console.log("Refreshing Sync Card");
                } else if(heart == true) {
                    // Reset Heart
                    heart = false;
                    $("#action").css("color","lightgray").html("&#9734;");
                }
                break;
            case 1: // Liked
                var vote = {id: previous, vote: true};
                action(2, vote);
                break;
            case 0: // Disliked
                var vote = {id: previous, vote: false};
                action(2, vote);
                break;
            case -1: // Reported (Global Deck Only)
                var vote = {id: previous, vote: 'reported'};
                popup(false);
                return action(2, vote);
            case -2: // Create-A-Card (Custom Lobby Only)
                var vote = {id: previous, vote: 'make'};
                popup(false);
                return next(vote);
            default:
                if (room > 99 || Number.isNaN(room)) { 
                    // Next Card
                    action(2, {id: previous, vote: false}); 
                };
        };
    } else {
        // Offer Create-A-Card
        if(type !=1 && type != 0){
            plus = true; // Inhibit Sync
            return;
        } else if(type==1){
            // Direct to Create a Card
            window.location = "./create?time="+nonce.time+"&value="+nonce.value+"&id=0";
        } else if(type==0){
            var vote = {id: previous, vote: false};
            if(sync == true) {
                plus = false; // Reset Sync Inhibitor
                syncPull();
            } else {
                next(vote);
            }
        } else {
            return;
        };
    };
};

// Next Card
function next(vote){
    // Select Endpoint
    if(sync == false) {
        var endpoint = "./card";
    } else {
        var endpoint = "./sync";
    }

    // Get Cards
    $.post(endpoint, vote, async (data) => {
        // Get Card Array
        cards = JSON.parse(data);

        // Handle Error
        if(cards == false) {
            window.location = "/error";
            return;
        }

        // Get Card Array
        cards = JSON.parse(data);

        // Filter by number of cards returned
        if(cards.length>1){
            // Card Selection Algorithm
            card = select(cards, 5); // Specify Algorithm
        } else {
            // Pick Single Card
            card = cards[0];
        };

        // Display Card
        title = card.title;
        previous = card.id;
        likes = card.likes;
        dislikes = card.dislikes;
        if(width < 2) {
            $("#title").html(title);
        }
        $("#description").html(card.description);
        if(room > 99) {
            $("#credit").html("by "+card.author+" / Room #"+room);
        } else if((likes+dislikes) > 10) {
            $("#credit").html(`${Math.round((100*(likes))/(likes+dislikes))}% / by ${card.author} / ${card.date}`);
            $("#note").text("Share this card");
            $("#share").val(`https://blankcard.me/card/${card.id}`);
            $("#linktext").text(`blankcard.me/card/${card.id}`).css("background","lightgrey");
        } else {
            $("#credit").html(`new / by ${card.author} / ${card.date}`);
            $("#note").text("Share this card");
            $("#share").val(`https://blankcard.me/card/${card.id}`);
            $("#linktext").text(`blankcard.me/card/${card.id}`).css("background","lightgrey");
        }

        // Load Picture
        if(card.picture!=null){
            $("#picture").css("background-image", "url("+card.picture+")").html("");
        } else {
            //$("#picture").css("background-image", "none").html(card.title); // Title Text
            $("#picture").css("background-image", "none").html(""); // Whitespace
        }

        // Show Report and Action Buttons
        $("#report").show();
        $("#action").show();

        // Reset Nonce
        nonce = {};

        // Handle Blank White Card
        if(card.id=="0"){
            $("#description").html("");
            $("#credit").html("");
            $("#report").hide();
            $("#action").hide();
            // Clear Picture
            $("#picture").html("");
            $("#picture").css("background-image", "none");
            nonce = card;
            if(Number.isNaN(room)) {
                $("#title").html(
                    "<p id='left'>Create</p>\
                    <p id='right'>Skip</p>"
                );
                //plus = true; // Inhibit Sync - not relevant to public anymore?
                $("#left").click((e) => {
                    e.stopPropagation();
                    action(1);
                }).mouseup((e)=>{e.stopPropagation()}).mousedown((e)=>{e.stopPropagation()}).on("touchstart",(e)=>{e.stopPropagation()}).on("touchend",(e)=>{e.stopPropagation()});
                $("#right").click((e) => {
                    e.stopPropagation();
                    //plus = false; // Re-Enable - not relevant to public anymore?
                    action(0);
                }).mouseup((e)=>{e.stopPropagation()}).mousedown((e)=>{e.stopPropagation()}).on("touchstart",(e)=>{e.stopPropagation()}).on("touchend",(e)=>{e.stopPropagation()});
            } else if(room > 99) {
                // Custom rooms jump straight to creation
                plus = true;
                $("#title").html("Blank White Card").click((e) => {
                    e.stopPropagation();
                });
                action(1);
            }
        };
    });
};

// Card Selection Algorithm
function select(cards, algorithm) {
    var card;
    switch(algorithm) {
        case 1: // Uniform Random Distribution
            card = cards[0] // Pick the first card in the list Card
            return card;
        case 2: // Weighted Percentage Popularity
            weight = cards.map(function(e) { return (e.likes/(e.likes+e.dislikes)); }) // Favours higher rated cards
            break;
        case 3: // Parabolic Weight
            weight = cards.map(function(e) { return ((e.likes/(e.likes+e.dislikes)**2)); }) // Square Denominator, favours newer & higher rated cards
            break;
        case 4: // Cubic Weight
            weight = cards.map(function(e) { return ((e.likes/(e.likes+e.dislikes)**3)); }) // Cube Deonminator, heavily favours new cards
            break;
        case 5: // N log(N) Weight
            weight = cards.map(function(e) { return ((e.likes/((e.likes+e.dislikes)*Math.log(e.likes+e.dislikes)))); }) // nlog(n) Denominator, only slightly favours newer cards
            break;
        default:
            card = cards[0] // Uniform Random Distribution
            break;
    };
    
    // Select from Weighted Options
    total = weight.reduce((sum, num)=>{return (sum+num)}, 0); // Calculate Sum of Weights
    random = Math.random()*total; // Generate random number between 0 and Total
    //console.log(weight, total, random);

    // Pick Index by Weight
    index = 0;
    while(index<weight.length) {
        random = random - weight[index];
        if(random>0){
            index++;
        } else {
            break;
        };
    };
    card = cards[index];
    //console.log(weight[index]);
    // Check if recently dealt
    if(past.indexOf(card.id) != -1 && retries < 3){
        retries++; // Redraw up to 3 times
        console.log("Recently Dealt Already. Number of Retries: "+retries);
        return select(cards, 5);
    } else {
        retries = 0;
        past.unshift(card.id);
        past.pop();
    }
    //console.log(past);
    return card;
};

// Report Pop Up
function popup(state) {
    if(state==true){
        $("#popup").css("z-index","2");
        $("#popup").css("background","rgba(0,0,0,0.75)");
        if(room > 99) {
            $("#note").text("Invite your friends!");
            $("#linktext").text(`blankcard.me/${room}`).css("background","lightgrey");
        } else {
            $("#note").text("Share this card");
            $("#linktext").css("background","lightgrey");
        }
    } else if(state==false) {
        $("#popup").css("z-index","-1");
        $("#popup").css("background","rgba(0,0,0,0)");
    }
}

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

// Toggle Sync
function syncToggle() {
    if(sync == false){
        sync = true;
        syncPull();
        $("#yes").html("Pause Sync").css({"text-decoration":"underline","color":"red"});
    } else if(sync == true){
        sync = false;
        $("#yes").html("Start Sync").css({"text-decoration":"underline","color":"black"});
    }
    popup(false);
}

// Poll for Sync Mode
function syncPull() {
    if(sync == true && plus == false){
        next({id: previous, vote: 'sync'}); // Send current card for Long Polling (TODO);
    }
}
setInterval(syncPull, 4000); // Doesn't need to be realtime performance - at worst it's 4 seconds behind

// Copy Link for Sharing
function copyLink() {
    var shareURL = document.getElementById("share");
    shareURL.select();
    shareURL.setSelectionRange(0, 99999);
    document.execCommand("copy");
    $("#note").text("Link copied!");
    $("#linktext").css("background","#AAA");
}