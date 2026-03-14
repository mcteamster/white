// Gallery Front end scripts
// Blank White Cards

// Variables
var card_id;
var loading = false;

// Load Card ID from Path Name
$(document).ready(function() {
    path = window.location.pathname.replace(/^\/|\/$/g, ''); // Trim trailing slash if any
    card_id = Math.floor(path.split("/")[1]);
    console.log(card_id);
    if(card_id >= -1){
        pull(card_id);
    } else { 
        // Search for card Random or Latest
        $("#title").html("<p id='left'>Latest</p> <p id='right'>Random</p>");
        $("#right").click(function(e){
            $("#number").val("");
            action(3);
            e.stopPropagation();
        });
        $("#left").click(function(e){
            $("#number").val("-1");
            action(3);
            e.stopPropagation();
        });
        $("#credit").html("Tap to Search");
        // Clear Fields
        $("#description").html(`<p>
            By using the gallery you confirm that you are over 18 years old
            and accept our&nbsp;<a href="/legal" target="_blank"><u>Terms&nbsp;of&nbsp;Service</u>.</a>
        </p>`);
        $("#picture").html("<b>Card<br>Gallery</b>");
        $("#picture").css("background-image", "none");
    }

    // Bind Action Buttons
    $("#action").css("color","lightgrey").click(() => popup(true));
    $("#prev").click(function(e){
        action(0);
        e.stopPropagation();
    }).hide();
    $("#next").click(function(e){
        action(1);
        e.stopPropagation();
    }).hide();
    $("#middle").click((e) => {
        copyLink();
        e.stopPropagation();
    });

    // Keyboard Binding Left and Right
    $("body").keydown((e) => {
        e.stopPropagation();
        if(e.which == 37 && card_id && loading == false) {
            $("#prev").click();
        } else if(e.which == 39 && card_id && loading == false) {
            $("#next").click();
        } else if(e.which == 13 && loading == false) {
            // Enter to search (default random)
            action(3);
        }
    })
});

// Bar Action
var action = function(type){
    switch(type) {
        case 0: // Previous
            if(card_id > 1) {
                window.history.replaceState("", "", `/card/${card_id-1}`);
                card_id--;
                pull(card_id);
            } else {
                window.location = "/card";
            }
            break;
        case 1: // Next
            window.history.replaceState("", "", `/card/${card_id+1}`);
            card_id++;
            pull(card_id);
            break;
        case 2: // Search
            popup(true);
            break;
        case 3: // Find
            card_id = Math.floor($("#number").val());
            if(card_id > -2) {
                pull(card_id);
                popup(false);
                //$("#title").unbind();
            } else {
                $("#number").val("").attr("placeholder","Enter ID number").css("background","lightgrey");
            }
            $("#number").val("");
            break;
        default: // Toggle Navigation Buttons
            if(loading == false && card_id) {
                $("#prev").toggle();
                $("#next").toggle();
            }
            break;
    };
};

// Pull Card
function pull(id){
    // Hide Nav
    $("#prev").hide();
    $("#next").hide();
    loading = true;

    // Show Loading
    $("#title").css("background","white").text("...");
    $("#description").html("");
    $("#credit").html("Loading...");

    // Clear Picture
    $("#picture").html("");
    $("#picture").css("background-image", "none");

    $.post(`/card/${id}`, (data) => {
        try{
            // Get Card Array
            card = JSON.parse(data)[0];

            // Likes and Dislikes
            var likes = card.likes;
            var dislikes = card.dislikes;

            // Display Card
            $("#title").html(card.title);
            $("#description").html(card.description);
            if((likes+dislikes) > 10) {
                $("#credit").html(`${Math.round((100*(likes))/(likes+dislikes))}% / by ${card.author} / ${card.date}`);
            } else {
                $("#credit").html(`new / by ${card.author} / ${card.date}`);
            }

            // Clear Picture
            $("#picture").html("");
            $("#picture").css("background-image", "none");
            if(card.picture!=null){
                $("#picture").css("background-image", "url("+card.picture+")");
            } else {
                $("#picture").html(card.title);
            }

            // Update URL
            card_id = card.id;
            window.history.replaceState("", "", `/card/${card_id}`);
            $("#share").val(`https://blankcard.me/card/${card_id}`);
            $("#middle").text(`blankcard.me/card/${card_id}`);
            loading = false;
        } catch(err) {
            // Update URL
            card_id = 0;

            // Search for card Random or Latest
            $("#title").html("<p id='left'>Latest</p> <p id='right'>Random</p>");
            $("#credit").html("Card Not Found");
            $("#right").click(function(e){
                $("#number").val("");
                action(3);
                e.stopPropagation();
            });
            $("#left").click(function(e){
                $("#number").val("-1");
                action(3);
                e.stopPropagation();
            });
            // Clear Fields
            $("#description").html("");
            $("#picture").html("");
            $("#picture").css("background-image", "none");
            $("#share").val("");
            $("#middle").text("");
            loading = false;
            return;
        }
    });
};

// Pop Up
function popup(state) {
    if(state==true){
        $("#popup").css("z-index","2");
        $("#popup").css("background","rgba(0,0,0,0.75)");
        $('#number').focus().css("background","white");;
        $('#number').keypress(function (e) {
            var key = e.which;
            if(key == 13) {
                action(3);
            };
        });
    } else if(state==false) {
        $('#number').unbind();
        $("#popup").css("z-index","-1");
        $("#popup").css("background","rgba(0,0,0,0)");
        document.activeElement.blur();
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

// Copy Link for Sharing
function copyLink() {
    var shareURL = document.getElementById("share");
    shareURL.select();
    shareURL.setSelectionRange(0, 99999);
    document.execCommand("copy");
    $("#middle").text("Link copied!");
}