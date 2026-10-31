// Site-wide settings. Change SITE_NAME once you pick a name.
// Games hidden from every player-facing picker. Their modules, rules and tests stay so they can
// come back by editing this list (or setting HIDDEN_GAMES="" in the environment).
const DEFAULT_HIDDEN = 'higherlower,liarsdice,hotpotato,reversi';

module.exports = {
  SITE_NAME: process.env.SITE_NAME || 'Playgrid',
  PORT: Number(process.env.PORT) || 3000,

  // Must match the EMOJIS and COLORS arrays in public/js/main.js
  AVATAR_EMOJIS: 24,
  AVATAR_COLORS: 10,

  HIDDEN_GAMES: (process.env.HIDDEN_GAMES ?? DEFAULT_HIDDEN).split(',').map((s) => s.trim()).filter(Boolean),

  DISCONNECT_GRACE_MS: Number(process.env.DISCONNECT_GRACE_MS) || 20000, // a refresh within this time keeps your seat
  HOST_GRACE_MS: Number(process.env.HOST_GRACE_MS) || 8000, // a host offline this long hands hosting to someone connected
  HOST_AFK_MS: Number(process.env.HOST_AFK_MS) || 180000, // an idle host in the lobby hands hosting to an active member
  EMPTY_ROOM_TTL_MS: Number(process.env.EMPTY_ROOM_TTL_MS) || 120000, // empty lobbies are deleted after 2 minutes
  AUTOSTART_MS: 12000,        // public lobbies start on their own after this
  MAX_ROOMS: 5000,
};
