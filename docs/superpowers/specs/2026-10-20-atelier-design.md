# 喫茶Unity ATELIER: one-bowl playable prototype

User accepted a separate modern mode while preserving today's game as retro pachinko. Further design/plan approvals have explicitly been waived. Scope for this increment is one refined bowl, not a complete new three-stage pachinko cabinet.

Existing retro play remains at /?bonus=jackpot, with its files and rules untouched. Home offers a second link to /atelier/index.html. This independent full-page mode uses existing self-hosted Three.js and Rapier dependencies, no additional paid services or external assets.

One 360mm dish, 11mm steel balls, three 24mm openings (one success), a continuous curved surface and visibly deep exit tubes. Shared indexed geometry forms both render surface and static collision mesh: an opening has no hidden floor. Rapier handles gravity, rolling rotation, contact friction, ball collisions and CCD. Win/loss uses the actual opening crossed, never a post-entry lottery or scripted orbit. Trajectory is not forced toward holes. Fixed 240Hz updates and rendering are separate. A ball unable to resolve is explicitly returned and reported, not invisibly teleported into an outcome.

Modern dark ceramic, brushed metal, restrained brass, studio reflections, fine fasteners and ticks. Camera at a moderate oblique angle shows holes and orbit; orbital adjustment and reset are available. UI uses Japanese, ivory/green, large touch targets, safe-area padding and normal page scrolling. Defaults: 20 balls, 4 active maximum, audio off, reduced-motion respected. Single shot, held shot, power selection, pause/resume, restart; tab hidden pauses and must explicitly resume. Outcomes and credits are fictional.

Verification: geometry/aperture integrity, real physical success/failure, conservation and duplicate handling, multi-ball settling, seed replay, frame stepping, pause/visibility, teardown and rendering errors. Capture 375/390/414px Chromium; distinguish physical iPhone Safari untested. Neither 60fps on iPhone nor full simulator realism is claimed without measurement.
