import { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";

// Initialise Discord Integration
export function initaliseDiscord() {
  const params = new URLSearchParams(window.location.href);

  if (params.get('frame_id')) {
    // Patch Service URLs for CSP compatibiltiy with the Discord proxy
    const urlPatches = [
      {
        prefix: '/api',
        target: 'api.mcteamster.com'
      },
      {
        prefix: '/ap',
        target: 'ap.blankwhite.cards'
      },
      {
        prefix: '/eu',
        target: 'eu.blankwhite.cards'
      },
      {
        prefix: '/na',
        target: 'na.blankwhite.cards'
      },
    ]
    patchUrlMappings(urlPatches);

    // Setup SDK
    const discordSdk = new DiscordSDK("1389508624774201395");
    (async () => {
      // Purge local state on new sessions
      if (!localStorage.getItem('instance_id') || (localStorage.getItem('instance_id') != discordSdk.instanceId)) {
        localStorage.removeItem("matchID")
        localStorage.removeItem("playerID")
        localStorage.removeItem("credentials")
      }
      localStorage.setItem('instance_id', discordSdk.instanceId)

      // Sync Room
      console.debug(`Checking room info for: ${discordSdk.instanceId}`)
      const roomData = await (await fetch(`https://api.mcteamster.com/common/rooms/${discordSdk.instanceId}`)).json()
      if (roomData?.room.match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/i) && (roomData.room != localStorage.getItem("matchID"))) {
        localStorage.setItem("matchID", roomData.room)
        window.location.pathname = `/${roomData.room}`
      }

      await discordSdk.ready();
    })().then(async () => {
      // Usage
      console.info("Discord SDK is ready");
    });
    return true
  } else {
    console.debug("Not running inside Discord");
    return false
  }
}
