import type { CalloutId } from "./layout";

export const EVIDENCE =
  "Scientific schematic with idealized control and synthetic readout.";

export const CALLOUT_TEXT: Record<CalloutId, string> = {
  transmon: "Transmon",
  drive: "Drive line",
  resonator: "Readout resonator",
  feed: "Feedline",
  junction: "Josephson junction.",
  barrier: "Thin insulating barrier.",
  phase: "Superconducting phase difference \u03c6",
  mag: "Schematic magnification",
};

export const CAPTIONS: { t: number; text: string }[] = [
  {
    t: 0,
    text: "Packaged fixed-frequency transmon at the cold stage. Millikelvin operation. Idealized initial state: |0\u27e9.",
  },
  {
    t: 1.1,
    text: "The lid becomes transparent as an explanatory reveal. The device is operated enclosed. Cooling alone is not initialization.",
  },
  {
    t: 2.7,
    text: "Representative hardware\u2014not a fabrication layout. No device dimensions, frequencies, coherence times, or gate fidelities are shown.",
  },
  {
    t: 4.1,
    text: "Drive line, capacitive electrodes, readout resonator, and feedline. Couplings are gaps. The cyan and gold marks are signal overlays, not extra metal.",
  },
  {
    t: 5.1,
    text: "Two capacitive electrodes, separated except through one Josephson junction. Idealized initial state: |0\u27e9.",
  },
  {
    t: 6.5,
    text: "Josephson junction. Thin insulating barrier. The barrier remains intact.",
  },
  {
    t: 7.4,
    text: "Schematic magnification. The change of scale is explicit, and the barrier thickness is not a measured value. Coherent Cooper-pair tunneling \u00b7 schematic.",
  },
  {
    t: 8.5,
    text: "Equivalent circuit: Josephson junction in parallel with the shunting capacitance. The superconducting phase difference \u03c6 is a junction variable, not a Bloch coordinate.",
  },
  {
    t: 10.1,
    text: "Unequal transition spacings. The |1\u27e9 to |2\u27e9 gap is drawn smaller than the |0\u27e9 to |1\u27e9 gap. Spacings are qualitative.",
  },
  {
    t: 12.3,
    text: "Computational subspace: |0\u27e9, |1\u27e9. Higher levels remain. The physical transmon is not drawn as an exact two-level object.",
  },
  {
    t: 14.1,
    text: "Junction nonlinearity enables selective control. Large shunting capacitance reduces charge sensitivity. This is not immunity to noise, not automatic removal of leakage, and not perfect selectivity.",
  },
  {
    t: 16.1,
    text: "Idealized initial state: |0\u27e9. Cooling alone is not a guarantee of initialization or error-free operation.",
  },
  {
    t: 17.05,
    text: "Microwave envelope \u00b7 time-expanded. The drawn speed is not the physical propagation speed. Ideal two-level control model; leakage and decoherence omitted.",
  },
  {
    t: 18.15,
    text: "Positive control envelope produces rotation about +X. |0\u27e9 is +Z. |1\u27e9 is \u2212Z. H_rot(t) = \u210f \u03a9(t) \u03c3_x / 2. \u03b8(t) = \u222b \u03a9(\u03c4) d\u03c4.",
  },
  {
    t: 19.5,
    text: "Carrier oscillation slowed for illustration. The ribbon is an envelope, not a march of photons.",
  },
  {
    t: 23.05,
    text: "Final ideal state (|0\u27e9 \u2212 i|1\u27e9)/\u221a2. Bloch vector at \u2212Y. P(0) = P(1) = 1/2 in this ideal preparation.",
  },
  {
    t: 24.05,
    text: "Equal basis probabilities do not determine the relative phase. The prepared state still carries the factor \u2212i.",
  },
  {
    t: 25.05,
    text: "Dispersive readout \u00b7 schematic. Qubit-dependent resonator response. This is not extraction of the full wavefunction, and practical measurement is not shown as error-free.",
  },
  {
    t: 26.35,
    text: "Gold probe on the feedline. The incoming motion is generic. A superposition is not drawn as a deterministic halfway response.",
  },
  {
    t: 28.05,
    text: "The two conditioned traces are explanatory alternatives from the reference means. They are not this shot.",
  },
  {
    t: 29.25,
    text: "Outgoing probe amplitude and phase match one synthetic integrated record. This is not the continuous quantum measurement trajectory.",
  },
  {
    t: 30.55,
    text: "Amplification at staged temperatures. Room-temperature demodulation and processing. The chain is off the qubit chip. Amplifier internals are not modeled.",
  },
  {
    t: 31.45,
    text: "Prepared-state model\u2014not live state tracking. The sphere is a preparation diagram, then it leaves before the reported result.",
  },
  {
    t: 32.25,
    text: "Repeated preparations: |0\u27e9. Repeated preparations: |1\u27e9. Those clouds are reference shots, not simultaneous readings. One synthetic shot. The dot is a demodulated, integrated record, in arbitrary units.",
  },
];

export function captionAt(t: number): string {
  let text = CAPTIONS[0].text;
  for (const cue of CAPTIONS) {
    if (t >= cue.t) text = cue.text;
  }
  return text;
}

export const PANEL = {
  circuitTitle: "Equivalent circuit",
  circuitNote: "Josephson junction in parallel with the shunting capacitance. Drive and readout couple through capacitors, matching the gaps on the chip.",
  levelsTitle: "Unequal transition spacings.",
  levelsNote: "Computational subspace: |0\u27e9, |1\u27e9. Higher levels remain.",
  blochTitle: "Quantum-state representation.",
  blochSubtitle: "Ideal rotating-frame model.",
  blochConvention: "Convention: |0\u27e9 at +Z, |1\u27e9 at \u2212Z, positive \u03a9 rotates about +X, from +Z toward \u2212Y.",
  qualifier: "Prepared-state model\u2014not live state tracking.",
  iqTitle: "Ideal computational-basis measurement plus synthetic readout noise.",
  iqNote:
    "Reference clouds are repeated preparations, not simultaneous readings of this qubit. The decision boundary is derived from these synthetic distributions. No measured assignment fidelity is claimed.",
  basisLine:
    "The basis sample is a simulation variable created when the shot is drawn. It is not a pre-existing hidden state, and it is not displayed as information known from the record.",
  recordLine: "One synthetic shot.",
  integratedLine: "Demodulated, integrated record. Not an instantaneous field sample, not a Bloch point, and not both amplitudes.",
  axisI: "I: integrated in-phase signal.",
  axisQ: "Q: integrated quadrature signal.",
  units: "Arbitrary units.",
  cloud0: "Repeated preparations: |0\u27e9.",
  cloud1: "Repeated preparations: |1\u27e9.",
  alt0: "|0\u27e9-conditioned response \u00b7 explanatory alternative, not this shot.",
  alt1: "|1\u27e9-conditioned response \u00b7 explanatory alternative, not this shot.",
  stageAmp: "Amplification at staged temperatures.",
  stageRoom: "Room-temperature demodulation and processing.",
  stageChip: "On chip: probe and resonator only.",
  hamiltonian: "H_rot(t) = \u210f \u03a9(t) \u03c3_x / 2. \u03b8(t) = \u222b \u03a9(\u03c4) d\u03c4.",
  stateLaw: "|\u03c8(t)\u27e9 = cos[\u03b8(t)/2]|0\u27e9 \u2212 i sin[\u03b8(t)/2]|1\u27e9.",
  audioNote: "Original score and presentation sounds. Not microwave audio and not a quantum-state sonification.",
};

export const REQUIRED_PHRASES = [
  "Millikelvin operation.",
  "Representative hardware\u2014not a fabrication layout.",
  "Idealized initial state: |0\u27e9.",
  "Josephson junction.",
  "Thin insulating barrier.",
  "Coherent Cooper-pair tunneling \u00b7 schematic.",
  "Unequal transition spacings.",
  "Computational subspace: |0\u27e9, |1\u27e9.",
  "Higher levels remain.",
  "Junction nonlinearity enables selective control.",
  "Large shunting capacitance reduces charge sensitivity.",
  "Ideal two-level control model; leakage and decoherence omitted.",
  "P(0) = P(1) = 1/2 in this ideal preparation.",
  "Quantum-state representation.",
  "Ideal rotating-frame model.",
  "Microwave envelope \u00b7 time-expanded.",
  "Carrier oscillation slowed for illustration.",
  "Dispersive readout \u00b7 schematic.",
  "Qubit-dependent resonator response.",
  "Amplification at staged temperatures.",
  "Room-temperature demodulation and processing.",
  "Ideal computational-basis measurement plus synthetic readout noise.",
  "I: integrated in-phase signal.",
  "Q: integrated quadrature signal.",
  "Arbitrary units.",
  "Repeated preparations: |0\u27e9.",
  "Repeated preparations: |1\u27e9.",
  "One synthetic shot.",
  "Prepared-state model\u2014not live state tracking.",
  "Scientific schematic with idealized control and synthetic readout.",
  "not a pre-existing hidden state",
];

export function staticCopyBlob(): string {
  const chunks = [
    EVIDENCE,
    ...Object.values(CALLOUT_TEXT),
    ...CAPTIONS.map((c) => c.text),
    ...Object.values(PANEL),
  ];
  return chunks.join("\n");
}
