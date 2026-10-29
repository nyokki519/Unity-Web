# Static UV card renderer

`CurlRenderer` uploads a 729-vertex UV grid and 3,840 triangle indices once. The vertex shader evaluates the same cylindrical fold and paper lighting. Draws update four uniforms; they do not allocate meshes, triangles or upload vertex buffers. A reused numeric array retains the reference implementation's exact sampled centre and projected bounds. The fragment shader, decoded image cache, disposal latch and context-loss draw guard are unchanged.

Reproduce against a running app:

```sh
UNITY_URL=http://127.0.0.1:3483 python3 test/baccarat-renderer_browser.py
```

The test serves the original CPU renderer as a browser-only route fixture and uses the actual authored face and reverse artwork. Chromium compares RGBA pixels at progress 0, .25, .5, .75 and 1 with grip -.7, 0 and .7. The checked-in run had maximum mean absolute channel error 0.00781 on the 0–255 scale; at most 0.02225% of channels differed by more than four. Initial projected width was 295.77px in a 320px canvas (92.43%). The paired screenshot shows the reference at left and static grid at right at progress .5 / grip .7.

Five batches of 120 immediate draws, each followed by `gl.finish()`, measured median 117ms for the reference and 5ms for the static grid in this headless Chromium environment. These are draw submission benchmark results, not animation FPS or an end-to-end device performance guarantee. The JSON contains all samples. Run page-level frame measurements separately with the ordinary game UI.

Verification also passed Node syntax checking, Python compilation and the three pure curl geometry tests. Existing asynchronous texture loading, resize observer and disposal behavior remains in the renderer.
