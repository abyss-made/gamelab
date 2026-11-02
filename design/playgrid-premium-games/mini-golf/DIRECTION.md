# Mini Golf · Pocket Gardens

**Approved creative direction. Implement using [the shared handoff](../IMPLEMENTATION-HANDOFF.md).**

## Identity

Bright botanic 2D greens, cream curbs, quiet mowing stripes and hand-drawn planting outside play.

## Composition

Revision: botanical-club treatment with clipped mowing stripes, jointed limestone curbs, sculpted tree canopies, flower beds, park furniture and a reflecting garden pond. The pond and footbridge are outside the collision polygon and are decorative, not new hazards. Desktop preserves the 700×440 Dogleg geometry; phone rotates that same drawing 90° into a 440×700 viewBox to fill the screen. implementation must inverse-transform pointer coordinates into the unchanged course space and keep HUD text upright. The static pose shows existing ball/cup positions, not altered physics.

Use the complete existing Dogleg silhouette; keep ball/hole unobscured. Stroke/par sit at the edge, drag direction on course, power and Putt below. Tablet and phones keep a single top-down view.

## Interaction boundary

Existing drag chooses aim; a separate control sets power; Putt commits. Decorative flowers/trees do not collide. Existing sand slows and water returns the ball with its current penalty. Moving obstacles and new terrain mechanics are future-only.

## Motion story · intent, not final specification

Aim line appears → server path rolls/bounces → cup drop and par/stroke receipt → a short course transition. No 3D camera or cinematic obstruction.

## Required implementation states

Ready, aim/power, rolling, static obstacle collision, existing sand/water, completed hole, next hole, scorecard and match result.

## Approved direction

Approved: the garden style on existing geometry. Apply the same materials to the existing Sand Trap and Water Bridge before proposing any new course.

Open [desktop](desktop.png), [tablet](tablet.png), [phone](mobile.png), [narrow phone](narrow.png) or [inspectable HTML](concept.html). Shared navigation returns to the same party; no lobby redesign is proposed.
