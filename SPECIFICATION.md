# Tiny Rails Diorama — Technical & Product Specification (v2: Organic 3D & Splines)

## 1. Vision & Core Inspiration
**Tiny Rails Diorama** is a cozy, tactile miniature train and village sandbox inspired by *Townscaper*, *Tiny Glade*, *Station to Station*, and hand-crafted museum railway dioramas. The world is a **sculpted, continuous 3D landscape slab** viewed from a single iconic isometric perspective, where clicking and dragging weaves smooth, sweeping spline railway tracks across rolling hills, alpine bluffs, and meandering river valleys.

---

## 2. Core Design Pillars & Decisions

### 2.1. Fixed Isometric Perspective ("True Tabletop Diorama")
* **Projection:** True Orthographic projection (`<OrthographicCamera>` positioned at `[22, 22, 22]` looking at `[0, 0, 0]`).
* **Rotation Lock:** Camera rotation is **strictly disabled** (`enableRotate={false}`).
* **Contoured Cutaway Plinth:** The vertical sides of the diorama dynamically match the undulating perimeter height of the 3D terrain mesh down to a carved walnut base, looking like a real physical cross-section slice of earth.

### 2.2. Continuous Sculpted 3D Landscape & Real-Time Terraforming
* **High-Resolution Terrain Mesh:** An $84 \times 84$ vertex `BufferGeometry` spanning $16 \times 16$ world units, displaced by multi-octave value noise, domain warping, and a sinusoidal river canyon.
* **Vertex-Blended Biomes:** Smooth vertex color gradients transition organically from wet river sand to lush meadow greens, highland sage, steep rocky cliff faces (computed from surface slope), and snow-dusted peaks.
* **Reactive Track Terraforming:**
  * The terrain mesh dynamically queries distance to the railway spline.
  * Across hills and slopes, the terrain smoothly flattens to meet the track bed elevation, automatically carving realistic **sloped cuttings** and **raised earth embankments** along the track corridor.
  * Across rivers and deep basins, the riverbed remains submerged while the track spawns an **arched stone viaduct bridge**.

### 2.3. Organic Catmull-Rom Spline Tracks
* **Gridless Free-Form Placement:**
  * Clicking or dragging anywhere on the 3D terrain appends smooth 3D control points (`Vec3Point`) with automatic minimum-distance filtering and elevation grade smoothing.
  * Control points can form either an open point-to-point line or a seamless closed loop.
* **Continuous Procedural Geometry:**
  * **Ballast Ribbon:** A custom continuous 3D mesh ribbon with sloped shoulders following the spline curve.
  * **Dual Extruded Steel Rails:** Continuous 3D rail tubes offset by $\pm \frac{\text{gauge}}{2}$ along the curve's horizontal normal vector.
  * **Tangent-Aligned Sleepers:** Wooden ties placed at uniform arc-length intervals perpendicular to the local spline tangent.
  * **Curved Stone Viaducts:** Mason piers and bridge parapets automatically generated wherever the spline crosses water or deep valleys.

### 2.4. Free-Form Structures & Multi-Car Train Simulation
* **World-Space Raycast Placement:**
  * **Cottages:** Placed at exact 3D terrain coordinates; clicking near an existing cottage stacks an additional story (up to 3 stories).
  * **Rural Stations:** Automatically rotate to align parallel to the nearest railway spline tangent.
* **Multi-Carriage Spline Train:**
  * A miniature steam locomotive, coal tender, and two passenger coaches traverse the arc-length parameterized spline with accurate 3D pitch, yaw, and rising steam puffs.
