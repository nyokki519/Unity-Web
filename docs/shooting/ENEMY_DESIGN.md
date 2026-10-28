# Enemy and pattern design

Twelve enemy archetypes carry stable IDs: drift scout, straight bee, sine wing, aimed eye, armored crab, spread flower, chase fish, stationary turret, dash lance, carrier shell, orbit wheel and elite guard. Their behavior strings identify motion families; simulation handles exact trajectories and health.

Twenty pattern IDs cover aimed shots, three/five fans, radial and double rings, clockwise/counterclockwise spirals, crossing rows, waves, tracking bundles, petals, accelerating spokes, slow walls, fast needles, rotating crosses, alternate fans, delayed bursts, convergent rain, oscillating grids and composite stars. Catalog names do not replace executable pattern code. Every dense pattern requires spacing appropriate to logical player hit radius, usable warning and a readable escape direction.

Difficulty adjusts speed, density, health, firing rate and rewards. Enemy hull colors remain distinct from bullets and player shots. Offscreen spawn positions cannot become invisible collision traps. Targets must retire from pools and stop firing after destruction. Combined formations must be reviewed as a whole, since two fair isolated patterns can remove all safe routes when overlapped.

Implemented IDs follow exact core behavior: 0 straight, 1 mild sine, 2 fast wide sine, 3 narrow slow sine, 4 horizontal pursuit, 5 hover at y220, 6 acceleration after two seconds, 7 retreat after four seconds, 8 heavy sine, 9 wait at y180 then depart after eight seconds, 10 carrier spawning scouts every five seconds, 11 broad elite sine. Pattern IDs now match core cases, including straight warned laser14, rotating laser15, net17 and timed explosion18.
