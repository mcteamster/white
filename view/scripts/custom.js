// Custom Lobby Scripts
// Blank White Cards

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

// Pop Up Dialog
function popup(state) {
    if(state==2){
        $("#popup").css("z-index","2");
        $("#popup").css("background","rgba(0,0,0,0.75)");
        $("#prompt").html(
            '<div style="display: flex; flex-direction: column; align-items: center;">\
            <p id="basic"> Tap Start to make a basic room or</p>\
            <p id="advanced" class="submit drawn icon" style="background: lightgrey">advanced setup?</p>\
            </div>');
        $("#advanced").click(()=>{
            $("#prompt").html(
                '<div style="display: flex; flex-direction: column; align-items: center;">\
                Set a pincode for saving/loading\
                <input type="text" inputmode="numeric" pattern="[0-9]*" id="secret" class="submit drawn" maxlength="4">\
                or leave blank for a basic room\
                </div>');
            $("#secret").focus().val("").attr("placeholder","0000").css("letter-spacing", "0.5em").keypress(function (e) {
                var key = e.which;
                if(key == 13) {
                    make(true);
                }; 
            });
            $('#yes').html("<u>Start</u>").unbind().click(function(e){
                e.stopPropagation();
                make(true);
            });
        });
        $('#yes').html("<u>Start</u>").unbind().click(function(e){
            e.stopPropagation();
            make(false);
        });
    } else if(state==1){
        $("#popup").css("z-index","2");
        $("#popup").css("background","rgba(0,0,0,0.75)");
        $("#prompt").html('<span>Room number<br><input type="text" inputmode="numeric" pattern="[0-9]*" id="number" class="submit drawn" maxlength="3" required></span>');
        $("#number").attr("placeholder"," 000").css("letter-spacing", "0.5em").focus().keypress(function (e) {
            var key = e.which;
            if(key == 13) {
                enter();
            }; 
        });
        $("#yes").html("<u>Join</u>").click(function(e){
            e.stopPropagation();
            enter();
        });
    } else if(state==0) {
        $("#popup").css("z-index","-1");
        $("#popup").css("background","rgba(0,0,0,0)");
        $("#number").val("").css("background", "white").unbind();
        $("#secret").val("").css("background", "white").unbind();
        $("#yes").unbind();
        document.activeElement.blur();
    }
}

// Join Room
function enter() {
    var room = Math.floor($("#number").val());
    if(room > 99 && room < 1000) {
        window.location = "/"+room;
    } else {
        $("#number").css("background", "lightgrey");
        $("#number").val("");
    };
}

// Create Room
function make(advanced) {
    var seed = 1;
    var downloadsecret = (advanced == true) ? Math.floor($("#secret").val()) : 0;
    var codelength = (advanced == true) ? $("#secret").val().length : 0;
    if(seed > 0 && seed < 31 && (codelength == 0 || codelength == 4)) {
        if((codelength == 4 && downloadsecret >= 0 && downloadsecret <= 9999) || codelength == 0) {
            // Create Room
            $.post("./custom", {seed: seed+1, downloadsecret: downloadsecret}, (room) => {
                if(room!=false){
                    window.location = "/"+room;
                } else {
                    window.location = "/error";
                }
            });
        } else {
            $("#secret").val("").attr("placeholder","4-digits").css("background", "lightgrey");
        }
    } else {
        if(codelength != 0 && codelength != 4) {
            $("#secret").val("").attr("placeholder","4-digits").css("background", "lightgrey");
        } else {
            $("#secret").css("background", "white");
        }
        if(seed > 30 || seed < 1) {
            $("#number").val("").attr("placeholder","1-30").css("background", "lightgrey");
        } else {
            $("#number").css("background", "white");
        }
    }
};

// Go Back
async function back() {
    window.history.back();
}