// Card Creation Scripts
// Blank White Cards

// Token
var token = "";
var time;
var limit = 600;
var elapsed;
var clock;

// Init Sketchpad
var sketchpad = null;
var fillstroke = {color: "#FFF", size: 10000, lines: [{start: {x: 0, y: 0}, end: {x: 0, y: 0}}]};

// Touchable
var touchable = 'ontouchstart' in document.documentElement;

$(document).ready(async () => {
    // Save Query String Token Nonce
    token = window.location.search;

    // Timer
    time = token.split("&")[0].split("=")[1];
    elapsed = Math.floor((Date.now() - time)/1000);
    clock = setInterval(() => {
        if(elapsed > limit) {
            abandon();
        } else {
            $("#middle").html(`${Math.floor((limit-elapsed)/60)}:${("0"+((limit-elapsed)%60).toString()).slice(-2)}`);
            if(elapsed > (limit-60)) {
                $("#middle").css("color", "red");
            }
            elapsed++;
        }
    }, 1000);

    // Start Sketchpad
    await restart();

    $('#card_title').keypress(function (e) {
        var key = e.which;
        if(key == 13) {
            e.preventDefault();
            $("#card_description").focus();
        };
    });

    // Listen for Enter
    $('#card_description').keypress(function (e) {
        var key = e.which;
        if(key == 13) {
            e.preventDefault();
            $("#card_author").focus();
        };
    });

    $('#card_author').keypress(function (e) {
        var key = e.which;
        if(key == 13) {
            e.preventDefault();
            document.activeElement.blur();
            submit();
        };
    });

    // Protect Drawing During Typing
    $("#drawing_shield").hide();
    $('.submit').click(function() {
        $("#drawing_shield").show();
        $("#clear").attr("onclick","unshield()").css("color","lightgrey");
    });

    // Leave Page Warning
    window.onbeforeunload = () => {return true};
});

// Reset on Resize
$(window).on('resize', async function() {
    // Reconfigure sketchpad canvas area
    var config = {
        strokes: sketchpad.strokes,
        element: '#sketchpad',
        width: ($("#sketchpad").width()+5),
        height: ($("#sketchpad").width()+5)
    };
    sketchpad._width = config.width;
    sketchpad._height = config.height;
    sketchpad.reset();
});

// Restart Sketchpad
async function restart(){
    var config = {
        strokes: [fillstroke],
        element: '#sketchpad',
        width: ($("#sketchpad").width()+5),
        height: ($("#sketchpad").width()+5)
    };

    sketchpad = new Sketchpad(config);
    sketchpad.color = "#000";
};

// Undo Sketch
async function undo(){
    console.log(sketchpad.strokes);
    (sketchpad.strokes.length > 1) ? sketchpad.undo() : console.log("Nothing to Undo");
};

// Send Card to Server
async function submit(confirmed){
    // Reset Page Warning
    window.onbeforeunload = null;

    // Collect Inputs
    var card_title = await $("#card_title").val();
    var card_description = await $("#card_description").val();
    var card_author = await $("#card_author").val();
    var card_picture = await document.getElementById("sketchpad").toDataURL("image/png");

    // Check for Empty Picture
    if(sketchpad.strokes.length == 0){
        card_picture = null;
    };

    // Check for Empty Text Fields
    if(card_title=="" && card_description==""){
        $("#card_title").css("background", "lightgrey");
        $("#card_description").css("background", "lightgrey");
        return false;
    } else if(card_title==""){
        $("#card_title").css("background", "lightgrey");
        $("#card_description").css("background", "white");
        return false;
    } else if(card_description==""){
        $("#card_title").css("background", "white");
        $("#card_description").css("background", "lightgrey");
        return false;
    } else {
        $("#card_title").css("background", "white");
        $("#card_description").css("background", "white");
    };

    // Anon for Empty Author
    if(card_author=="") {
        card_author="anon";
    }

    // Confirm Submission
    if(confirmed==true) {
        // End Timer
        clearInterval(clock);
        $("#middle").html("");

        // Show loading message
        $("#dialog").html("<h3 id='prompt'>Creating card...</h3>");
        // Send Information
        try {
            $.post("./create"+token, {"title": card_title, "description": card_description, "author": card_author, "picture": card_picture}, (data, status) => {
                console.log(data.id);
                // On Success            
                if(data.id > 0){
                    // Hide Popup
                    $("#popup").css("z-index","-1");
                    $("#popup").css("background","rgba(0,0,0,0)");

                    // Show Return Elements
                    $("#create").addClass("hidden");
                    $("#menu").removeClass("hidden");
                    $("#return").removeClass("hidden");

                    // Keyboard Binding to Proceed
                    $("body").keypress((e) => {
                        if(e.which == 32 || e.which == 13) {
                            $("#bar").click();
                        }
                    })

                    // Populate Information
                    $("#new_title").text("'"+card_title+"'");

                    // Load Path Name
                    room = Math.floor((window.location.pathname.replace(/^\/|\/$/g, '')).split("/")[0]); // Find Room Number as first argument in path
                    if(room > 99) {
                        $("#new_id").html("Total Cards: "+(data.id - 1)); // Show number of cards (subtract 1 for getting started card)
                    } else {
                        $("#share").val(`https://blankcard.me/card/${data.id}`);
                        $("#new_id").text(`blankcard.me/card/${data.id}`).css("background","lightgrey").addClass("submit drawn").click((e) => {
                            e.stopPropagation();
                            copyLink();
                        });
                    }
                } else {
                    window.location = "/error";
                }
            }).fail(()=>{
                window.location = "/error";
            });
        } catch(err) {
            window.location = "/error";
        }
    } else {
        popup('submit'); // Prompt for Confirmation
    }
};

// Abandon Create a Card
async function abandon(){
    // Remove Nonce
    $.post("./create"+token, {"abandon": "1"}, (data, status) => {
        console.log(data);
    });

    // Reset Page Warning
    window.onbeforeunload = null;
    
    // Back to App
    window.location = "./app?acceptTerms=1";
}

// Hide Drawing Shield
function unshield() {
    $("#drawing_shield").hide();
    $("#clear").attr("onclick","undo()").css("color","black");
}

// Dialog Pop Up
function popup(state) {
    if(state=='submit'){
        $("#popup").css("z-index","2");
        $("#popup").css("background","rgba(0,0,0,0.75)");
        $("#prompt").html('<span>Are you sure? Changes cannot be made after submission.\
        By proceeding you acknowledge that the card meets the community\
        <a href="/guidelines" target="_blank"><u>Guidelines</u></a> and adheres to the\
        <a href="/legal" target="_blank"><u>Terms of Service</u>.</a></span>');
        $("#yes").attr("onclick","submit(true)");
    } else if(state=='abandon'){
        $("#popup").css("z-index","2");
        $("#popup").css("background","rgba(0,0,0,0.75)");
        $("#prompt").html('Exit Create-A-Card? All data will be discarded.');
        $("#yes").attr("onclick","abandon()");
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

// Copy Link for Sharing
function copyLink() {
    var shareURL = document.getElementById("share");
    shareURL.select();
    shareURL.setSelectionRange(0, 99999);
    document.execCommand("copy");
    $("#note").text("Link copied!");
    $("#new_id").css("background","#AAA");
}