// Adult dental chart for the "Know Your Smile" section.
// Teeth are numbered with the FDI system hygienists use: first digit is the
// quadrant (1 upper right, 2 upper left, 3 lower left, 4 lower right), second
// digit counts back from the front tooth. The chart is drawn as if facing the
// patient, so their right side is on the viewer's left.

// Crown footprint per tooth type: [width along the arch, depth]
const DIM = { 1: [19, 17], 2: [16, 16], 3: [18, 20], 4: [20, 22], 5: [20, 22], 6: [28, 28], 7: [26, 26], 8: [23, 23] };

const QUADRANTS = { 1: "Upper right", 2: "Upper left", 3: "Lower left", 4: "Lower right" };

const TYPES = {
    1: {
        name: "Central incisor",
        role: "The two front teeth in each arch. They bite into and cut food, and shape much of how your smile looks.",
        tip: "Tartar builds up fastest behind the lower front teeth, near the salivary glands. Hold the brush upright and use the tip to clean the inside surfaces."
    },
    2: {
        name: "Lateral incisor",
        role: "Sits beside the central incisor and helps cut food. Slightly smaller and more rounded.",
        tip: "Crowding is common here, so plaque collects where teeth overlap. Floss gently into each gap rather than snapping it down."
    },
    3: {
        name: "Canine",
        role: "The pointed tooth at the corner of the smile. It has the longest root in the mouth and guides your bite when you move your jaw sideways.",
        tip: "Brushing too hard wears the gum back at the corner of the smile first. Use soft bristles and light pressure."
    },
    4: {
        name: "First premolar",
        role: "Has two cusps for tearing and crushing food, between the canine and the molars.",
        tip: "The gaps between premolars are easy to miss. Clean between them daily with floss or an interdental brush."
    },
    5: {
        name: "Second premolar",
        role: "Works with the first premolar to crush food before the molars grind it.",
        tip: "Angle the bristles toward the gumline at 45° and use small circles, a few teeth at a time."
    },
    6: {
        name: "First molar",
        role: "One of the first adult teeth to arrive, around age six. Broad and strong, it does much of the grinding.",
        tip: "Deep grooves on the chewing surface trap plaque. Ask at your visit whether sealants would help."
    },
    7: {
        name: "Second molar",
        role: "Arrives around age twelve and grinds food alongside the first molar.",
        tip: "Open your mouth a little less when brushing here. It relaxes the cheek and makes the back easier to reach."
    },
    8: {
        name: "Wisdom tooth",
        role: "The third molar, usually the last tooth to come in, from the late teens onward. Many people have some removed.",
        tip: "It is hard to reach and easy to miss. Angle the brush toward the very back, and mention any swelling or tenderness at your visit."
    }
};

function arch(upper) {
    const rx = 140, ry = 152, cy = upper ? -16 : 16, t0 = 0.1, t1 = Math.PI - 0.1, N = 500;
    const pts = [], cum = [0];
    for (let i = 0; i <= N; i++) {
        const t = t0 + (t1 - t0) * i / N;
        pts.push([-rx * Math.cos(t), upper ? cy - ry * Math.sin(t) : cy + ry * Math.sin(t)]);
        if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const order = upper
        ? [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
        : [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    const gap = 3;
    const total = order.reduce((sum, n) => sum + DIM[n % 10][0], 0) + gap * (order.length - 1);
    const scale = cum[N] / total;
    let s = 0;
    return order.map(n => {
        const [w, d] = DIM[n % 10].map(v => v * scale);
        const centre = s + w / 2;
        s += w + gap * scale;
        let i = cum.findIndex(v => v >= centre);
        i = Math.max(1, Math.min(N - 1, i));
        const [x, y] = pts[i];
        const angle = Math.atan2(pts[i + 1][1] - pts[i - 1][1], pts[i + 1][0] - pts[i - 1][0]) * 180 / Math.PI;
        const type = n % 10;
        // Groove lines: one for premolars, a cross for molars
        let groove = "";
        if (type >= 4) groove = `M${(-w * 0.22).toFixed(1)} 0H${(w * 0.22).toFixed(1)}`;
        if (type >= 6) groove += `M0 ${(-d * 0.2).toFixed(1)}V${(d * 0.2).toFixed(1)}`;
        return {
            n,
            label: `${QUADRANTS[Math.floor(n / 10)]} ${TYPES[type].name.toLowerCase()}`,
            transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})`,
            x: (-w / 2).toFixed(1),
            y: (-d / 2).toFixed(1),
            w: w.toFixed(1),
            d: d.toFixed(1),
            r: (Math.min(w, d) * 0.4).toFixed(1),
            groove
        };
    });
}

module.exports = {
    teeth: [...arch(true), ...arch(false)],
    quadrants: QUADRANTS,
    types: TYPES
};
