# Lifeline ’82 — Product and Gameplay Specification

Status: As built  
Last updated: 2026-09-05  
Live game: https://lifeline-82.depr001.chatgpt.site

## 1. Original brief

> create a playable clone of the broderbund game choplifter from 1982 watch a full gameplay video like https://www.youtube.com/watch?v=2KDxRSeDKy8 and do research online on the game mechanics and build a web-based version of the game using a modern web game framework

The result is **Lifeline ’82**, an original browser rescue game that recreates the recognizable rescue loop and pressure of the 1982 game without copying its name, code, artwork, audio, or other proprietary assets.

## 2. Reference material and research conclusions

Primary references:

- [Full gameplay video supplied in the brief](https://www.youtube.com/watch?v=2KDxRSeDKy8)
- [Original Apple II game manual](https://www.gamesdatabase.org/Media/SYSTEM/Apple_II//Manual/formated/Choplifter%21_-_Br%C3%B8derbund_Software.pdf)

Mechanics carried into Lifeline ’82:

- A helicopter crosses a horizontally scrolling combat zone to rescue captives.
- There are four barracks with 16 captives each, for 64 total.
- The helicopter holds at most 16 passengers.
- The mission provides three helicopters.
- Captives must be collected in the field and returned to the home base.
- Mission state is communicated through LOST, ABOARD, and SAVED counters.
- The helicopter has left, right, and front-facing orientations.
- Ground vehicles, jets, and homing airborne threats escalate the danger.
- Rescue performance, not enemy kills, is the meaningful score.

## 3. Product goals

1. Deliver a complete, immediately playable rescue mission in a web browser.
2. Preserve the original game’s risk/reward loop: land under pressure, wait for civilians, carry a limited load, and survive the return trip.
3. Make the helicopter readable and responsive on keyboard and touch devices.
4. Use original procedural art and synthesized audio with a distinct **Lifeline ’82** identity.
5. Keep the implementation compact: one Phaser scene inside a React page, with no server-side gameplay state.

## 4. Core game loop

1. Start at the home rescue post with three aircraft and no passengers.
2. Fly east into enemy territory.
3. Rescue the 16 civilians associated with the active barrack.
4. Land near freed civilians and remain settled while they run aboard.
5. Carry up to 16 civilians back to the striped home pad.
6. Remain landed while passengers unload automatically into the rescue post.
7. Clear and rescue each successive barrack group.
8. Win by bringing all 64 civilians home.

The first barrack begins open. Each later barrack is the only valid next target and opens after two weapon hits. A later barrack cannot be cleared before the current group has been fully resolved.

## 5. Mission rules and invariants

### 5.1 Counters

- `LOST`: civilians killed in the field or lost in a helicopter crash.
- `ABOARD`: living civilians currently inside the helicopter.
- `SAVED`: civilians delivered to the home rescue post.
- `AIRCRAFT`: remaining helicopters, starting at three.
- At every point in a mission: `LOST + ABOARD + SAVED + civilians remaining in barracks = 64`.

### 5.2 Capacity

- Maximum helicopter capacity is 16.
- Civilians stop entering when `ABOARD` reaches 16.
- A full-cabin message directs the player back to the home pad.

### 5.3 Win and loss

- Win when `SAVED` reaches 64.
- Lose immediately when no aircraft remain.
- Also lose when all 64 civilians have been accounted for but fewer than 64 were saved and none remain aboard or in the field.
- If the helicopter crashes with passengers aboard, all passengers are added to `LOST`.

## 6. Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Fly left/right | Arrow keys or `A` / `D` | Direction pad |
| Climb/descend | Arrow keys or `W` / `S` | Direction pad |
| Fire | `Space` | FIRE |
| Toggle side/ground-attack view | `X` or `Shift` | ROTATE |
| Pause/resume | `P` | Pause button |
| Mute | `M` | SOUND button |
| Restart after mission | Fly again button | Fly again button |

There is no separate bomb button or ammunition inventory. In front-facing ground-attack mode, FIRE sends the projectile straight downward and serves as the bombing action.

## 7. Helicopter behavior

### 7.1 Movement

- The helicopter uses acceleration and velocity rather than moving at a fixed step.
- Horizontal acceleration is 430 px/s²; vertical acceleration is 360 px/s².
- Maximum velocity is 360 px/s horizontally and 265 px/s vertically.
- Releasing an axis applies damping so the helicopter eases rather than stopping instantly.
- World and altitude bounds keep the helicopter inside the playable area.

### 7.2 Landing and takeoff

- The ground landing height is `GROUND_Y - 32`.
- A landing below 120 px/s vertical impact speed is safe.
- A landing above 235 px/s causes a hard-landing crash.
- Pressing climb while landed moves the helicopter two pixels clear of the landing clamp and gives it an initial upward velocity of 110 px/s.
- The takeoff frame must not be reclassified as a landing; the helicopter must always be able to take off after landing.

### 7.3 Direction changes and rotation

- Side-facing states are east and west; a third texture represents the front/ground-attack view.
- Reversing horizontal direction automatically shows the front-facing frame for 170 ms before settling into the opposite side view.
- Firing is suppressed during that automatic turn transition.
- `X`, `Shift`, or ROTATE manually toggles between the current side view and front-facing ground-attack view.
- The HUD displays `SIDE · EAST`, `SIDE · WEST`, `TURNING · EAST/WEST`, or `ATTACK · GROUND` as appropriate.

### 7.4 Flight inclination

- Inclination applies only while airborne in a side view.
- Holding a horizontal direction pitches the helicopter 11 degrees nose-down toward that direction.
- Releasing horizontal input while moving faster than 45 px/s produces a 5-degree nose-up flare opposite the travel direction.
- The angle eases smoothly toward its target and returns toward level when landed, slow, front-facing, or turning.
- A replacement aircraft always respawns level.

### 7.5 Helicopter silhouette

The procedural side-view helicopter must read clearly as a helicopter at game scale. It includes:

- main rotor and mast;
- tail boom and vertical stabilizer;
- visible tail rotor;
- rounded cabin and nose;
- contrasting cockpit canopy;
- rescue cross, intake, lights, and landing skids.

A separate, narrower front-view texture is used for turning and ground attack. Collision bodies change with the texture.

## 8. Weapons

### 8.1 Side view

- FIRE launches a projectile from the helicopter’s nose at 760 px/s.
- The muzzle position, sprite angle, and velocity follow the helicopter’s current inclination.
- Nose-down flight therefore fires diagonally downward.
- A nose-up flare fires diagonally upward.
- East- and west-facing shots mirror correctly.

### 8.2 Front/ground-attack view

- FIRE launches straight down from beneath the helicopter at 610 px/s.
- Ground-attack fire is blocked while landed, with a message instructing the player to lift off.

### 8.3 Combat effects

- Shots destroy tanks, jets, and drones on contact.
- The active closed barrack requires two hits to open.
- Player and enemy projectiles can kill civilians, increasing `LOST`.
- Projectiles expire after their configured lifetime or when leaving the playable world.

## 9. Civilian behavior

### 9.1 Waiting and boarding

- Opening a barrack creates 16 civilians distributed around it.
- Waiting civilians wander near their home position.
- When the helicopter is landed within 255 px and has capacity, civilians enter the `boarding` state and run toward it at 82 px/s.
- A civilian boards when within 52 px of the landed helicopter.
- Boarding destroys the field sprite, decrements the barrack’s remaining count, increments `ABOARD`, plays feedback, and updates the mission message.
- If the helicopter takes off, moves more than 300 px away, or becomes full, approaching civilians return to `waiting`.

### 9.2 Collision safety

- A civilian already in the `boarding` state cannot be classified as crushed while approaching the helicopter.
- Crushing applies only to a non-boarding civilian when the landed helicopter is sliding horizontally faster than 70 px/s and overlaps that civilian.
- This ordering is required so the boarding radius is reached before any harmful overlap can remove the civilian.

### 9.3 Home-base unloading

- Unloading is automatic; no additional button is required.
- The helicopter counts as settled when it is landed, or when it is within three pixels of landing height and vertical speed is below 45 px/s.
- Home-pad detection uses the full helicopter collision-body footprint, not only its center point.
- The valid region includes a 96 px margin around the visible striped pad so a visually correct landing is accepted.
- One passenger exits every 125 ms while the helicopter remains settled in the valid area.
- Each exit decrements `ABOARD`, increments `SAVED`, shows a civilian moving toward the rescue post, and updates the mission message.

## 10. Threats and difficulty

Difficulty scales using the number of civilians already accounted for: `SAVED + LOST + ABOARD`.

### Tanks

- Spawn near the active barrack and move along the ground.
- Fire shells toward the helicopter in enemy territory or toward the active rescue area.
- Continue spawning while a barrack remains active.

### Jets

- Begin appearing after at least eight civilians are accounted for and the helicopter is beyond the frontier.
- Enter from either side of the camera, cross at speed, and fire one homing missile when close enough.
- Contact with a jet crashes the helicopter.

### Drone mines

- Begin appearing after at least 32 civilians are accounted for.
- Home continuously toward the helicopter.
- Contact destroys the drone and crashes the helicopter.

### Threat display

| Civilians accounted for | HUD level |
| --- | --- |
| 0–7 | LOW |
| 8–23 | ELEVATED |
| 24–47 | HIGH |
| 48–64 | SEVERE |

## 11. World and presentation

- Logical canvas: 1280 × 720.
- Horizontal world width: 5800 px.
- The camera follows the helicopter with a dead zone and smooth tracking.
- The home rescue post and striped pad occupy the west end of the world.
- A marked frontier separates the base from enemy territory.
- Four barracks are placed progressively farther east.
- A compact radar shows the player and barrack states.
- Visual style is original, high-contrast procedural pixel art with layered parallax terrain.
- Audio is synthesized at runtime with the Web Audio API and starts only after player interaction.

## 12. Web experience

- The game is the primary interactive surface inside a responsive editorial shell.
- React owns the start, restart, pause, mute, touch controls, result overlay, and mission counters.
- Phaser owns the simulation, physics, drawing, collisions, camera, effects, and synthesized gameplay events.
- Phaser sends a deduplicated `MissionReport` to React containing phase, counters, aircraft, and the latest message.
- The canvas scales to fit its container while retaining a 1280 × 720 logical resolution.
- On screens at or below 700 px, the viewport switches to 4:3 and displays touch flight and action controls.
- Control buttons have accessible labels; mission counters use an `aria-live` region.
- The page supports keyboard, pointer, and touch input.

## 13. Technical architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Page shell | React 19 / Next-compatible Vinext | Layout, copy, overlays, controls, counters |
| Game runtime | Phaser 4 Arcade Physics | Simulation, sprites, enemies, collisions, camera |
| Styling | CSS | Responsive layout and console presentation |
| Audio | Web Audio API | Procedural tones without downloaded assets |
| Hosting | OpenAI Sites / Cloudflare Workers-compatible output | Production delivery |
| Tests | Node test runner | Server-render and critical mechanic assertions |

Key files:

- `game/createGame.ts`: complete Phaser scene and rules.
- `components/LifelineGame.tsx`: React-to-Phaser bridge and player controls.
- `app/page.tsx`: product page and briefing.
- `app/globals.css`: responsive visual system.
- `tests/rendered-html.test.mjs`: render and mechanic regression checks.

No persistent database, account system, multiplayer, leaderboard, downloadable asset pack, or server-side game simulation is required.

## 14. Mission states

| State | Meaning |
| --- | --- |
| `ready` | Game loaded; waiting for player interaction |
| `playing` | Simulation active |
| `paused` | Physics suspended; can resume |
| `won` | All 64 civilians saved |
| `lost` | No aircraft remain, or the rescue can no longer be completed |

Restart resets all counters, barracks, threats, helicopter orientation, inclination, and timing state.

## 15. Acceptance criteria

### Playability

- The game starts from its overlay and supports a complete 64-civilian mission.
- Keyboard and touch controls operate the same gameplay actions.
- Pause, mute, restart, win, and loss states function without reloading the page.

### Helicopter

- The sprite is recognizably a helicopter in both side and front views.
- Direction reversal visibly transitions through the front view.
- The helicopter pitches down under horizontal input and flares up while coasting.
- Side shots follow the displayed pitch both upward and downward.
- Front-view shots fire downward.
- The helicopter can take off after every safe landing.

### Rescue

- Landing near an active civilian group causes civilians to run toward the helicopter.
- Each successful boarding visibly increments `ABOARD` up to 16.
- Approaching civilians are not accidentally crushed by the boarding overlap.
- Landing across the visible home-base pad automatically unloads all passengers.
- Every unload decrements `ABOARD` and increments `SAVED`.

### Progression and failure

- The first barrack starts open; later barracks require two hits and resolve in order.
- Tanks, jets, and drones appear at their specified progression thresholds.
- Crashing removes one aircraft and converts current passengers to `LOST`.
- Saving all 64 reaches `won`; exhausting aircraft or losing any chance of a perfect rescue reaches `lost`.

### Delivery

- `npm run build` succeeds.
- `npm test` succeeds.
- TypeScript validation succeeds with `npx tsc --noEmit --incremental false`.
- The production deployment remains playable at the live URL above.

## 16. Incorporated feedback history

This specification includes the original brief plus the following requested corrections:

1. Documented how to fire downward: rotate to ground-attack view and fire.
2. Made direction changes rotate through the front-facing frame automatically.
3. Reworked the helicopter silhouette with recognizable rotor, tail, cabin, canopy, and skids.
4. Fixed takeoff after landing by preventing the landing clamp from canceling the first lift-off frame.
5. Expanded home-pad detection so passengers unload after a visually valid base landing.
6. Fixed civilian boarding so the boarding collision wins over the crushing collision and `ABOARD` changes correctly.
7. Added realistic airborne inclination in either horizontal direction.
8. Made side-fired projectiles travel upward or downward with the helicopter’s inclination.

## 17. Explicit non-goals

- Pixel-for-pixel replication of the 1982 game.
- Reuse of Brøderbund branding, original artwork, music, sound effects, or code.
- Multiple missions, campaigns, saves, achievements, or online accounts.
- Multiplayer or networked state.
- Configurable weapons, ammunition inventory, or a separate bomb system.
- General-purpose game-engine abstractions beyond this single mission.
