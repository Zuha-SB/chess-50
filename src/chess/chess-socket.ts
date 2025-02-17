import Pusher from "pusher-js";

// Enable pusher logging - don't include this in production
Pusher.logToConsole = true;

const pusher = new Pusher("8bba1c693cbff812ac61", {
  cluster: "us2",
});

const channel = pusher.subscribe("my-channel");
channel.bind("my-event", (data) => {
  console.log(JSON.stringify(data));
});

export class ChessSocket {}
