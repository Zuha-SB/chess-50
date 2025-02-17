import Pusher from "pusher";

const pusher = new Pusher({
  appId: import.meta.env.PUSHER_APP_ID ?? "",
  key: import.meta.env.PUSHER_APP_KEY ?? "",
  secret: import.meta.env.PUSHER_APP_SECRET ?? "",
  cluster: import.meta.env.PUSHER_CLUSTER ?? "",
  // useTLS: true,
});

export const GET = () => {
  pusher.trigger("my-channel", "my-event", {
    message: "hello world",
  });
  return new Response(new Date().toString());
};
