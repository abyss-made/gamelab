# Actual screenshot and video index

[Interactive review viewer](index.html) · [All six desktop](coastal-1440.jpg) · [All six phone](coastal-390.jpg) · [Validation](VALIDATION.md)

All gameplay PNGs below come from the working Express + Socket.IO application. Renderer unit fixtures and publisher reference images are separate. Viewports: desktop 1440×900, phone 390×844, landscape 932×430. Click through to the original PNG for full size.

## The six new original holes

Each row includes the close ball-follow camera and the actual whole-hole overview. Names, turns and timer values come from the normal match.

| Hole | Desktop | Phone | Landscape |
| --- | --- | --- | --- |
| 1. Palm Promenade | [Follow](screenshots/hole-01-follow-1440.png) · [Overview](screenshots/hole-01-overview-1440.png) | [Follow](screenshots/hole-01-follow-390.png) · [Overview](screenshots/hole-01-overview-390.png) | [Follow](screenshots/hole-01-follow-932.png) · [Overview](screenshots/hole-01-overview-932.png) |
| 2. Crate Escape | [Follow](screenshots/hole-02-follow-1440.png) · [Overview](screenshots/hole-02-overview-1440.png) | [Follow](screenshots/hole-02-follow-390.png) · [Overview](screenshots/hole-02-overview-390.png) | [Follow](screenshots/hole-02-follow-932.png) · [Overview](screenshots/hole-02-overview-932.png) |
| 3. Lagoon Bend | [Follow](screenshots/hole-03-follow-1440.png) · [Overview](screenshots/hole-03-overview-1440.png) | [Follow](screenshots/hole-03-follow-390.png) · [Overview](screenshots/hole-03-overview-390.png) | [Follow](screenshots/hole-03-follow-932.png) · [Overview](screenshots/hole-03-overview-932.png) |
| 4. Sandy Shortcut | [Follow](screenshots/hole-04-follow-1440.png) · [Overview](screenshots/hole-04-overview-1440.png) | [Follow](screenshots/hole-04-follow-390.png) · [Overview](screenshots/hole-04-overview-390.png) | [Follow](screenshots/hole-04-follow-932.png) · [Overview](screenshots/hole-04-overview-932.png) |
| 5. Split Decision | [Follow](screenshots/hole-05-follow-1440.png) · [Overview](screenshots/hole-05-overview-1440.png) | [Follow](screenshots/hole-05-follow-390.png) · [Overview](screenshots/hole-05-overview-390.png) | [Follow](screenshots/hole-05-follow-932.png) · [Overview](screenshots/hole-05-overview-932.png) |
| 6. Clubhouse Finish | [Follow](screenshots/hole-06-follow-1440.png) · [Overview](screenshots/hole-06-overview-1440.png) | [Follow](screenshots/hole-06-follow-390.png) · [Overview](screenshots/hole-06-overview-390.png) | [Follow](screenshots/hole-06-follow-932.png) · [Overview](screenshots/hole-06-overview-932.png) |

## Same-course before / after

Before is the previous top-down implementation at `b4a7e9d`. After is the actual 3D implementation. These comparisons select the same established hole, names, tee positions and zero-stroke state; timers and camera framing vary. New course geometry is shown separately above.

| Existing course | Desktop | Phone | Landscape |
| --- | --- | --- | --- |
| Meadow / Straight Shot | [Before](screenshots/before/meadow-follow-1440.png) · [After follow](screenshots/after/meadow-follow-1440.png) · [After overview](screenshots/after/meadow-overview-1440.png) | [Before](screenshots/before/meadow-follow-390.png) · [After follow](screenshots/after/meadow-follow-390.png) · [After overview](screenshots/after/meadow-overview-390.png) | [Before](screenshots/before/meadow-follow-932.png) · [After follow](screenshots/after/meadow-follow-932.png) · [After overview](screenshots/after/meadow-overview-932.png) |
| Harbor / Breeze Lane | [Before](screenshots/before/harbor-follow-1440.png) · [After follow](screenshots/after/harbor-follow-1440.png) · [After overview](screenshots/after/harbor-overview-1440.png) | [Before](screenshots/before/harbor-follow-390.png) · [After follow](screenshots/after/harbor-follow-390.png) · [After overview](screenshots/after/harbor-overview-390.png) | [Before](screenshots/before/harbor-follow-932.png) · [After follow](screenshots/after/harbor-follow-932.png) · [After overview](screenshots/after/harbor-overview-932.png) |

[Desktop comparison sheet](comparison-1440.jpg) · [Phone comparison sheet](comparison-390.jpg). Sheets only resize and label the saved app captures; they do not repaint gameplay.

## Actual play and outcomes

- Opening: [1440px](screenshots/opening-1440.png) · [390px](screenshots/opening-390.png) · [932px](screenshots/opening-932.png).
- Held pull before release: [1440px](screenshots/held-pull-1440.png) · [390px](screenshots/held-pull-390.png) · [932px](screenshots/held-pull-932.png).
- Actual authoritative shot: [1440px](screenshots/real-shot-1440.png) · [390px](screenshots/real-shot-390.png) · [932px](screenshots/real-shot-932.png).
- Actual water penalty: [1440px](screenshots/water-penalty-1440.png) · [390px](screenshots/water-penalty-390.png) · [932px](screenshots/water-penalty-932.png).
- Normal result after both players complete all six holes: [1440px](screenshots/full-course-result-1440.png) · [390px](screenshots/full-course-result-390.png) · [932px](screenshots/full-course-result-932.png).
- Six actual seated players: [1440px](screenshots/six-players-1440.png) · [390px](screenshots/six-players-390.png) · [932px](screenshots/six-players-932.png).
- [Reduced-motion phone](screenshots/reduced-motion-390.png) · [Working no-WebGL compatibility phone](screenshots/compatibility-390.png). The latter is a deliberately exercised fallback, not the default 3D presentation.

## Actual recordings

- [Full six-hole match](video/full-course.mp4), including real UI inputs, ball replays, penalties, hole transitions and the normal course result. The browser changes viewport while capturing layouts.
- [Desktop mouse controls](video/input-1440.webm).
- [Phone touch controls](video/input-390.webm).
- [Landscape controls](video/input-932.webm).

These are actual browser recordings; they are not animated mockups and contain no captured audio.
