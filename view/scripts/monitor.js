// Monitoring Scripts
// Blank White Cards

async function monitor() {
    $.post("./monitor", {"data":"summary"}, async (data) => {
        var info = JSON.parse(data);
        $("#cards").html(`${info.cards} Total`);
        $("#rooms").html(`${info.rooms[0]} / ${info.rooms[1]} Active Rooms`);
    });
    $.post("./monitor", {"data":"logs"}, async (data) => {
        var split = data.split("\n");
        split.reverse().forEach(element => {
            if(/^(INFO:)/.test(element)) {
                $("#logs").append(`<li>${element}`);
            }
        });
    });
}
monitor();