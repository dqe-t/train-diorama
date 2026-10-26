# Tiny Rails Diorama — Technical & Product Specification (v3: Wild West & Arches Desert)

## 1. Vision & Core Inspiration
**Tiny Rails Diorama** is a tactile tabletop model railway diorama builder inspired by *Townscaper*, *Station to Station*, and the dramatic sandstone landscapes of the American Southwest (Utah’s *Arches National Park*, Monument Valley, and classic frontier narrow-gauge railroads). The world is presented as a **carved museum diorama block** with exposed horizontal rock strata, terraced sandstone cliffs, a dry arroyo (wash), flat sandy basins, and rugged frontier railway infrastructure.

---

## 2. Core Design Pillars & Architecture

### 2.1. Fixed Isometric Perspective & Museum Cutaway Plinth
* **Projection:** True Orthographic projection (`<OrthographicCamera>` positioned at `[22, 22, 22]` looking at `[0, 0, 0]`).
* **Rotation Lock:** Rotation is strictly disabled (`enableRotate={false}`). Smooth pan and clamped zoom (`26`–`68`) allow inspecting details while preserving the diorama composition.
* **Geological Strata Cutaway:** The 4 vertical sides trace the contour of the terrain and are mapped with procedurally synthesized horizontal rock strata bands corresponding to real Colorado Plateau formations (Moenkopi, Entrada, and Navajo sandstone caps).

### 2.2. Dramatic Desert Landscape & Terraforming
* **Terraced Sandstone Mesas & Buttes:** Multi-tier step function creates sheer near-vertical cliffs interspersed with flat mesa tops.
* **Flat Basin Floor:** A broad, gentle central basin accommodates frontier settlements, railway yards, and looping tracks without jagged terrain collisions.
* **Dry Arroyo (Wash):** A winding dry riverbed carved through sandstone with pale sand and scattered gravel pebbles.
* **Realistic Procedural Textures:**
  * **Sand Grain & Bump Map:** Tileable periodic noise texture providing fine sand surface bump, specular highlights, and pebble speckles.
  * **Strata UV Mapping:** Vertical cutaway skirts sample procedural strata bands indexed to world elevation.
* **Dynamic Railway Grading:**
  * Through mesas, tracks carve sloped rock cuttings down to grade.
  * Over the dry wash, the ground remains depressed and the railway automatically spawns a timber trestle bridge.

### 2.3. Timber Trestle Bridges & Narrow-Gauge Tracks
* **Continuous Spline Tracks:** Free-form `CatmullRomCurve3` with extruded steel rails and gravel ballast ribbon.
* **Frontier Timber Trestles:** Wherever rails cross the dry wash or deep chasms, the system generates battered timber trestle bents with splayed upright posts, girts, cap beams, and wooden deck walkways.

### 2.4. Southwestern Architecture & Desert Props
* **Adobe Pueblos:** Stackable Southwestern adobes with stepped back stories, projecting roof vigas, parapets, and wooden ladders.
* **Frontier Depot:** Board-and-batten wooden depot with a passenger platform awning and an elevated timber water tower.
* **Landmark Natural Arches & Desert Flora:**
  * Saguaro cacti with multi-tier branching arms.
  * Prickly-pear cacti, dusty sagebrush, gnarled pinon-juniper trees, and sandstone hoodoos.
  * Weathered natural sandstone arches straddling scenic rock outcrops.
