# Party Gauntlet polish

This continues PR #79 inside the actual `node-server` game. It adds physical moving obstacles, stronger feedback, a festival-arena setting, and better touch controls. Coastal Club remains the default. The homepage and other games retain their designs.

[Before/after gallery](index.html) · [Screenshot index](SCREENSHOTS.md) · [Validation](VALIDATION.md) · [Implementation handoff](HANDOFF.md) · [Tested source hashes](source-manifest.json)

- Four holes now have rotating sweepers. They accelerate and brake during a powered putt, collide with placed balls, and park before the next turn. Their geometry, motion curve and replay clock are shared by the server and renderers.
- Actual server contacts trigger impact rings, particles, compressing bumper cushions and short muted-aware sounds. Cup completion adds a chime, confetti, a reacting finish hoop and the mascot’s celebration.
- Original artwork includes rounded foam rails, textured court panels, branded signs, crowd stands, a homepage-inspired robot, floating islands and a sky backdrop. No stock artwork or new runtime dependency is used.
- Phone controls keep power and Putt visible, with precise aiming behind a 44px Aim button. The camera stays still while aiming and completes its turn handoff before controls unlock.
- Existing multiplayer, room settings, chat, private alpha authentication and the five other courses are preserved. The 2D compatibility renderer includes the physical sweepers.

The motors are **powered by putts**, with up to 2.4 seconds of motion. They do not run continuously while players are deciding. Games retain the existing flat physics plane and angled 3D presentation.

The package includes genuine browser screenshots/recordings, a complete native-control match, exact legacy-physics comparisons, automated balance probes and repeatable verification tools. Automated clients are not human playtesters; [PLAYTEST.md](PLAYTEST.md) records the remaining human-feedback work without claiming it has happened.

To view the local gallery with its original before images, serve the repository root and open `/docs/minigolf-gauntlet-polish/index.html`. Every image opens at its original resolution.
