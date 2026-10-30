# Independent review and fixes

A separate reviewer inspected code and actual390px play, not just screenshots.

Important: normal click scrolling hid the bowl during throw. Reproduced (canvas y=-271), browser test failed, fixed mobile roll-start scrolling, same test green (y213 at390×700). Durable check also exists in chinchiro-salon_browser.py.
Minor:28px range target →44px.
Minor: earlier draft described sticky mobile controls, but those overlapped the stake. Removed sticky behavior; natural scrolling + roll-start focus now documented.
Self-review: early match ending must not mark unplayed rounds complete. RED/GREEN assertion added to the four-round marker test.
Test fixture race: injecting a CPU result while its real timer ran produced a busy state. Fixed the fixture to apply both legal Match rolls synchronously before rendering; no production timing workaround added.
Performance: retained existing512 shadow map rather than768; final same-seed comparison preserved physical outputs.
No deferred important issues. Physical iPhone / real-GPU performance remain unverified.
