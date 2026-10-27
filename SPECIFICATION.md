# Tiny Rails Diorama — Technical & Product Specification (v3: Wild West & Arches Desert)

## 1. Vision & Core Inspiration
**Tiny Rails Diorama** is a tactile tabletop model railway diorama builder inspired by *Townscaper*, *Station to Station*, and the dramatic sandstone landscapes of the American Southwest (Utah’s *Arches National Park*, Monument Valley, and classic frontier narrow-gauge railroads). The world is presented as a **carved museum diorama block** with exposed horizontal rock strata, terraced sandstone cliffs, a dry arroyo (wash), flat sandy basins, and rugged frontier railway infrastructure.

---

## 2. Core Design Pillars & Architecture

### 2.1. Fixed Isometric Perspective & Museum Cutaway Plinth
* **Projection:** True Orthographic projection (`<OrthographicCamera>` positioned at `[22, 22, 22]` looking at `[0, 0, 0]`).
* **Rotation Lock:** Rotation is strictly disabled (`enableRotate={false}`). Smooth pan and clamped zoom (`26`–`68`) allow inspecting details while preserving the diorama composition.
* **Geological Strata Cutaway:** The 4 vertical sides trace the contour of the terrain and are mapped with procedurally synthesized horizontal rock strata bands corresponding to real Colorado Plateau formations (Moenkopi, Entrada, and Navajo sandstone caps).

### 2.2. Untouched Natural Landscape & Grade-Conforming Tracks
* **Zero Landscape Modification:** The terrain is 100% natural and never carved, flattened, or excavated by tracks. Dramatic cliffs, mesas, and dry arroyos remain completely untouched and pristine.
* **Classical Model Railroad Theatrical Backdrop Layout:**
  * Higher elevations (mountains and mesas) are positioned predominantly in the rear/backdrop ($-X, -Z$ direction relative to the isometric camera at $[22, 22, 22]$).
  * The foreground ($+X, +Z$) remains an open, flat desert valley floor ($y \approx 0.35$m) and dry arroyo wash, guaranteeing 100% unobstructed sightlines of all trains running on the tracks, the depot, and town settlements.
* **Two Distinct Mesa Plateau Levels:**
  * **Level 1 (Lower Mesa Plateau Shelf):** Mid-tier sandstone bench rising by $+0.78$m to $y \approx 1.20$m with vertical cliff faces and talus slopes.
  * **Level 2 (Upper Mesa Backdrop Ridge):** Grand high-tier sandstone plateau rising an additional $+0.86$m to $y \approx 2.06$m, creating the majestic rear skyline of the diorama.
* **Landscape-Aligned 3D Track Profile:** Tracks rise and fall with the natural landscape contours.
* **Grade-Limiting Relaxation & Adaptive Substructures:**
  * To prevent excessively steep inclines over cliffs or canyons, multi-pass vertical relaxation caps the maximum rail grade at 14%.
  * Where the natural terrain drops beneath the track, adaptive supporting structures are generated below the rails:
    * **Flush Ground Contact ($h \le 0.10$m):** Standard gravel ballast bed resting directly on the desert sand.
    * **Low/Moderate Fills ($0.10 < h \le 0.30$m):** Stacked timber cribbing walls and retaining abutments.
    * **High Spans & Canyon Crossings ($h > 0.30$m):** Multi-tier frontier timber trestle bents with splayed batter posts, horizontal girt braces, and stone footing blocks.

### 2.3. Timber Trestles, Cribbing & Continuous Spline Rails
* **Continuous Spline Tracks:** Free-form `CatmullRomCurve3` with extruded steel rails and gravel ballast ribbon conforming to 3D track elevation.
* **Full Substructure System:** Dynamic timber cribbing and trestles anchor the tracks into the terrain while preserving the natural landscape below.

### 2.4. Southwestern Architecture & Desert Props
* **Adobe Pueblos:** Stackable Southwestern adobes with stepped back stories, projecting roof vigas, parapets, and wooden ladders.
* **Frontier Depot:** Board-and-batten wooden depot with a passenger platform awning and an elevated timber water tower.
* **Landmark Natural Arches & Desert Flora:**
  * Saguaro cacti with multi-tier branching arms.
  * Prickly-pear cacti, dusty sagebrush, gnarled pinon-juniper trees, and sandstone hoodoos.
  * Weathered natural sandstone arches straddling scenic rock outcrops.

### 2.5. Constant Physical Arc-Length Frame Distribution (Invariant Tie & Trestle Spacing)
* **Problem Solved:** Track ties ("Querbalken") previously scaled with track length due to fixed sample counts ($N = 160$), resulting in cramped ties on short loops and sparse ties on extended routes.
* **Constant Arc-Length Metric:** Spline arc lengths are computed numerically:
  $$\Delta s_i = \sqrt{(x_{i+1} - x_i)^2 + (y_{i+1} - y_i)^2 + (z_{i+1} - z_i)^2}$$
* **Invariant Physical Spacing:**
  * **Railroad Ties / Sleepers:** Fixed at $\Delta s = 0.16\text{m}$ spacing along the entire track geometry.
  * **Timber Trestle Bents & Cribbing Piers:** Placed at uniform $\Delta s = 0.52\text{m}$ intervals wherever terrain clearance necessitates substructures.
  * Number of ties scales dynamically with length: $N_{\text{ties}} = \text{round}(L_{\text{total}} / 0.16\text{m})$, guaranteeing identical visual density across any route length.

### 2.6. Photorealistic Diorama Textures
* **Sedimentary Sandstone Strata (`public/textures/sandstone_strata.jpg`):** High-resolution Utah red rock cliff face texture displaying horizontal geological sedimentation, ochre/terracotta/salmon banding, and micro-fissures applied to the carved museum diorama skirt.
* **Desert Sand & Arroyo Wash (`public/textures/desert_sand.jpg`):** Top-down seamless sand texture with natural ripples, fine pebbles, and gravel applied as surface color and micro bump map, composited with macro vertex coloring for natural geological variation.

### 2.7. Physical Based Rendering (PBR), IBL Lighting & Pin-Sharp Orthographic Clarity
* **Soft "Modelling Clay" Visual Style:** Smooth, matte terracotta clay surfaces (`[0.89, 0.48, 0.25]`) with alternating horizontal sedimentary rock strata bands on cliff slopes (`smoothRange(0.26, 0.75, slope)`), pale sandy dry wash trails, and subtle dune-ripple normal mapping.
* **Theatrical Backdrop Mesas & Grounded Valley Tracks:** Two-tier backdrop mesas positioned in the rear (`-X, -Z`), keeping the central valley flat and unobstructed so train tracks remain grounded with flush ties and gravel ballast beds, creating wooden trestle bridges only when traversing the dry arroyo wash.
* **Baked Cavity Occlusion:** Per-vertex ambient occlusion (`computeCavityOcclusion`) darkens cliff feet and wash banks and slightly brightens convex rims, giving handcrafted clay depth.
* **Warm High-Contrast Cinematic Lighting:** Sun key light positioned at `[-16, 22, 20]` casting clean diagonal shadows (`ratio dy/dx = -0.48`), warm golden illumination (`#ffe2c2`), restrained ambient fill (`0.18`), and PCSS soft shadows (`size: 6, samples: 16`).
* **Layered Display Plinth:** A thin terracotta slab on top of a dark rounded plinth (`RoundedBox`) on an architectural studio tabletop.
* **Pin-Sharp Native Orthographic Clarity:** Post-processing blurring is completely disabled in favor of crystal-clear, high-DPI anti-aliased rendering across the entire diorama.
* **Guaranteed Track-Over-Terrain Elevation:** Track elevations along every spline sample strictly enforce $y_i \ge \text{terrainY}_i + \text{TRACK\_BED\_OFFSET}$ followed by multi-pass grade smoothing ($14\%$). Tracks never clip through or get buried inside mountain cliffs or rock outcrops.
* **Tangent-Space Normal Mapping:** Tangent-space normal map synthesis (`generateSandNormalPixels`) producing micro surface relief, sand ripples, and pebble boundaries reacting dynamically to oblique sunlight.
* **Polished Steel Rails & Brass Fixtures:** Extruded steel rails configured with `metalness: 0.92`, `roughness: 0.2`, catching specular gleams from sunset IBL environment maps. Locomotive brass fittings (bell, roof trim) rendered with `metalness: 0.92`, `roughness: 0.16`.
* **Atmospheric Train Lighting & Particles:** Working forward-facing incandescent locomotive spotlight casting real-time illuminated beams on tracks ahead, with synchronized steam puff particle puffs billowing from the smokestack.
* **Museum Tabletop Presentation:** Polished dark walnut diorama plinth resting on an architectural studio tabletop with soft contact shadows (`<ContactShadows />`) grounding the display piece.
