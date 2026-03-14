// Homepage Scripts
// Blank White Cards

// On Load Functions
$(document).ready(function() {
    var spacedown = false;
    
    // Keyboard Binding to Proceed
    $("body").keypress((e) => {
        if(e.which == 32 && spacedown == false) {
            spacedown = true;
            window.location = "./app";
        }
    })
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