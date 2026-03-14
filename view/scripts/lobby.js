// Lobby Scripts
// Blank White Cards

// Variables
var room = "";
// Title Bar Width
var width = 1;
// Touchable
var touchable = 'ontouchstart' in document.documentElement;
// Keyboard
var spacedown = false; 

// Load Path Name
$(document).ready(function() {
    room = Math.floor(window.location.pathname.replace(/^\/|\/$/g, '')); // Trim trailing slash if any
    if(room > 0){
        $("title").html(`Blank White Cards | #${room}`);
        $("#welcome").html(
            `<p id="note" style="font-size: 0.5em;">Room&nbsp;${room}</p>
            <p style="font-size: 0.25em;" id="linktext" class="submit drawn">blankcard.me/${room}</p>
            <p style="font-size: 0.25em;">
            Invite friends<br>
            Make cards<br>
            Do what they say!<br>
            </p>`
        );
    } else {
        $("title").html(`Blank White Cards`);
        $("#welcome").html(
            `<p id="note" style="font-size: 0.5em;">Global Deck</p>
            <p style="font-size: 0.25em;"><br>\
            Pick up cards<br>\
            Do what they say<br>\
            Like cards with <span style="color:gold">&#9733;</span><br>\
            Find a blank to add your own!</p>`
        );
    }
    $("#share").val(`https://blankcard.me/${room}`);
    $("#linktext").click((e)=>{
        copyLink();
        e.stopPropagation();
    });

    // Check if Downloading is enabled
    $.post(`/${room}/data`, (res) => {
        data = JSON.parse(res);
        if(data.downloadable != 0) {
            $("#description").html(`Note: downloading is enabled`); // Download Link and Warning
            $("#middle").html("&#8942;").click((e) => {
                e.stopPropagation();
                popup(true);
            });
            $("#number").css({"letter-spacing": "0.3em", "text-align": "center"});
        }
    })

    // Mouseup and Mousedown UI/UX Animations
    if(touchable == true && (room > 99 || Number.isNaN(room))) {
        // In Touchscreen Rooms
        $("#bar").on("touchstart", (e) => {
            e.stopPropagation();
            if(width < 2) {
                width = 1;
                var id = setInterval(frame, 10);
                function frame() {
                    if (width >= 100 || width == 0) {
                        if(width == 0) {
                            clearInterval(id);
                        } else {
                            $("#title").css("background","lightgrey").text("Tap & Hold");
                            clearInterval(id);
                            $("#bar").unbind();
                            start();
                        }
                    } else if(width == -1) {
                        $("#title").css("background","white").html("Continue");
                        clearInterval(id);
                    } else {
                        width++;
                        $("#title").css("background", `linear-gradient(to right, lightgrey, ${width}%, lightgrey, ${width}%, white)`).text("Tap & Hold");
                    }
                }
            } else if(width >= 2) {
                $("#title").css("background","white").html("Continue");
                width = 0;
                return;
            }
        }).on("touchend", (e) => {
            e.stopPropagation();
            if(width >= 100) {
                width = 0;
                start();
            } else {
                width = -50;
            }
        })
    } else if(room > 99 || Number.isNaN(room)) {
        // In Mouse Rooms
        $("#bar").mousedown((e) => {
            e.stopPropagation();
            if(true) {
                width = 1;
                var id = setInterval(frame, 5);
                function frame() {
                    if (width >= 100 || width == 0) {
                        if(width == 0) {
                            clearInterval(id);
                        } else {
                            $("#title").css("background","lightgrey").text("Esc to Cancel");
                        }
                    } else if(width == -1) {
                        $("#title").css("background","white").html("Continue");
                        clearInterval(id);
                    } else {
                        width++;
                        $("#title").css("background", `linear-gradient(to right, lightgrey, ${width}%, lightgrey, ${width}%, white)`).text("Tap & Hold");
                    }
                }
            }
        }).mouseup((e) => {
            e.stopPropagation();
            if(width >= 100) {
                width = 0;
                start();
            } else {
                width = -100;
            }
        }).mouseout((e) => {
            if(width != 0) { 
                $("#title").css("background","white").html("Continue");
            }
            width = 0;
            e.stopPropagation();
        })

        // Spacebar Keybindings
        $("body").keydown((e) => {
            if (e.which == 32 && spacedown == false) {
                e.preventDefault();
                spacedown = true;
                $("#bar").mousedown();
            } else if(e.which == 27) {
                e.preventDefault();
                $("#bar").mouseout();
            }
        }).keyup((e) => {
            if (e.which == 32 && spacedown == true) {
                e.preventDefault();
                spacedown = false;
                $("#bar").mouseup();
            }
        })
    }

    // Supress Context Menus from Long Pressing
    $("#bar").contextmenu((e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
});

// Start
async function start() {
    if(room > 0) {
        window.location = `/${room}/app?acceptTerms=1`;
    } else {
        window.location = "/app?acceptTerms=1";
    }
};

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

// Pop Up
function popup(state) {
    if(state==true){
        $("#popup").css("z-index","2");
        $("#popup").css("background","rgba(0,0,0,0.75)");
        $('#number').focus().css("background","white").attr("placeholder", "0000").keypress(function (e) {
            var key = e.which;
            if(key == 13) {
                e.stopPropagation();
                download();
            };
        });
    } else if(state==false) {
        $('#number').unbind();
        $("#popup").css("z-index","-1");
        $("#popup").css("background","rgba(0,0,0,0)");
        document.activeElement.blur();
    }
}

// Go Back
async function back() {
    window.history.back();
}

// Copy Link for Sharing
function copyLink() {
    var shareURL = document.getElementById("share");
    shareURL.select();
    shareURL.setSelectionRange(0, 99999);
    document.execCommand("copy");
    $("#note").html("Link&nbsp;copied!");
    $("#linktext").css("background","#AAA");
}

// Check Download
async function download() {
    var clientsecret = $('#number').val();
    $.post(`/${room}/data`, {downloadsecret: clientsecret}, (res) => {
        data = JSON.parse(res);
        if(data.downloadable == 1) {
            // Get Download Page
            window.location = `/${room}/data/?time=${data.nonce[0].time}&value=${data.nonce[0].value}&id=1`;
        } else {
            $("#number").css("background", "lightgrey").val("").attr("placeholder", "0000");
        }
    })
}