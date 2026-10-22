# Transmon anatomy

A 34-second browser explainer of a fixed-frequency, single-junction transmon. The picture is a scientific schematic: idealized π/2 control and one synthetic integrated readout record. It is not a fabrication layout, a device model fit, or an experimental result.

## Run

```bash
npm install
npm test
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Node 22 or newer. The stack is TypeScript, Vite, and Three.js. Geometry, materials, and the score are generated in the page. No API keys and no paid assets.

The Vite `base` is `./`, so the built `dist/` can be served from a domain root or a project subpath.

## What is calculated

The control panel uses one shared model:

- `|0⟩` at +Z, `|1⟩` at −Z.
- Positive envelope rotates about +X.
- `H_rot(t) = ℏ Ω(t) σ_x / 2`
- `θ(t) = ∫ Ω(τ) dτ`
- `|ψ⟩ = cos(θ/2)|0⟩ − i sin(θ/2)|1⟩`
- Presentation-time raised cosine with area `θ = π/2`
- Final state `(|0⟩ − i|1⟩)/√2`, Bloch vector at −Y

The readout panel uses one seeded draw:

1. Sample a computational-basis result from `P(0) = P(1) = 1/2`.
2. Sample one noisy integrated I–Q point from that basis distribution.
3. Classify it with the linear boundary of the two synthetic clouds.

That basis sample is a simulator variable created when the shot is drawn. It is not a pre-existing hidden state. The point on the plot is a demodulated, integrated record. The outgoing probe uses that record’s amplitude and phase. Reference clouds are repeated preparations, not simultaneous readings. Replay and seeking reuse the same seed.

`npm test` checks topology, the π/2 convention, normalization, cloud overlap, and readout agreement. The command prints the seeded shot. It does not claim a measured fidelity.

Observed on 2026-10-20 from `npm test` in this workspace: the fixed seed drew an integrated record near I = −0.624, Q = −0.216, classified as assignment 0. For that same seed the simulator basis sample was also 0. Some reference-cloud points fall across the boundary, so the classifier is not forced to agree. That comparison is simulator information. It is not a measured fidelity.

## What is schematic

The chip geometry, the magnified junction, the qualitative ladder spacing, the dispersive path, and the staged-amplification blocks are explanatory drawings. Barrier thickness, frequencies, coherence, leakage, and assignment fidelity are not given because they were not calculated or measured. The lid fade is a reveal, not an instruction to operate the package open. Cooling is not initialization.

## Controls

Play, pause, replay, timeline, mute, music level, effects level, reduced motion, fullscreen where the browser allows it. Keyboard: Space, arrows, Shift+arrows, Home, End, M, R, F, 1–5. Audio starts only after Play or Replay. Reduced motion snaps the camera and drops decorative carrier motion. If WebGL fails, a static layout map and the same diagrams remain.

## Publication

Source: https://github.com/mizcausevic-dev/transmon-anatomy

The built site is on the `pages` branch: `index.html` and `assets/` at the branch root, with sourcemaps removed. `.github/workflows/pages.yml` runs the tests, builds `dist/`, and updates that branch on every push to `main`.

GitHub Pages is not serving the branch yet. In the repository settings, set Pages to deploy from the `pages` branch, folder `/`. The address after that setting is saved is https://mizcausevic-dev.github.io/transmon-anatomy/

The Medium draft is `article/transmon-qubit.md`, with the figure `article/transmon-schematic.svg`.

About line: “Cinematic schematic of a fixed-frequency transmon, with idealized control and one synthetic readout.” Topics, once the repository allows them: `quantum-computing`, `transmon`, `superconducting-qubit`, `threejs`, `visualization`, `typescript`, `scientific-visualization`, `webgl`, `education`.

## License

No license is granted by this repository until one is added.
