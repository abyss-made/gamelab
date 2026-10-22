// Site-wide settings. Change SITE_NAME once you pick a name.
module.exports = {
  SITE_NAME: process.env.SITE_NAME || 'PartyPad',
  PORT: Number(process.env.PORT) || 3000,

  // Must match the EMOJIS and COLORS arrays in public/js/main.js
  AVATAR_EMOJIS: 24,
  AVATAR_COLORS: 10,

  DISCONNECT_GRACE_MS: 20000, // a refresh within this time keeps your seat
  EMPTY_ROOM_TTL_MS: 120000,  // empty lobbies are deleted after 2 minutes
  AUTOSTART_MS: 12000,        // public lobbies start on their own after this
  MAX_ROOMS: 5000,
};
