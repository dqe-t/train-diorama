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
* **Landscape-Aligned 3D Track Profile:** Tracks rise and fall with the natural landscape contours.
* **Grade-Limiting Relaxation & Adaptive Substructures:**
  * To prevent excessively steep inclines over cliffs or canyons, multi-pass vertical relaxation caps the maximum rail grade at 16%.
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
