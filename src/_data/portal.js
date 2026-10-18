// Exam Portal categories. `level` sets the risk colour: low, mid, elev or high.
// `routine` items become the daily checklist patients can tick off.

module.exports = {
    categories: [
        {
            n: 1,
            name: "Healthy & preventive",
            short: "Healthy",
            risk: "Low risk",
            level: "low",
            video: "/assets/brush.mp4",
            poster: "/assets/images/portal-brush.jpg",
            assessment: "Your gums are pink and firm, with little or no bleeding when you brush or floss, and healthy pockets of 1–3 mm. The goal is long-term maintenance and stopping plaque from building up.",
            goals: [
                "Keep plaque below the level that causes inflammation.",
                "Maintain healthy bone support around your teeth.",
                "Remineralize enamel daily to protect against early decay."
            ],
            routine: [
                "Brush twice a day for two minutes with a soft-bristled brush.",
                "Floss once a day, curving the floss around each tooth.",
                "Use a fluoride or remineralizing toothpaste."
            ]
        },
        {
            n: 2,
            name: "Active gingivitis",
            short: "Gingivitis",
            risk: "Moderate risk",
            level: "mid",
            video: "/assets/floss.mp4",
            poster: "/assets/images/portal-floss.jpg",
            assessment: "Your gums are red, puffy and bleed easily when you brush or floss. Pockets are slightly deeper, 3–4 mm, because of swelling, but there's no bone loss. Gingivitis is fully reversible with focused care.",
            goals: [
                "Stop the bleeding and calm gum swelling.",
                "Remove plaque from just under the gumline every day.",
                "Bring your gums back to health so they fit snugly around your teeth."
            ],
            routine: [
                "Brush with an electric toothbrush that has a pressure sensor.",
                "Floss every day. Don't stop if your gums bleed: it means the area needs more cleaning.",
                "Use an alcohol-free antiseptic mouthrinse.",
                "Rinse with warm salt water if your gums feel tender."
            ]
        },
        {
            n: 3,
            name: "Periodontal maintenance",
            short: "Periodontal",
            risk: "High risk",
            level: "high",
            video: "/assets/fdc-video.mp4",
            poster: "/assets/images/portal-clinic.jpg",
            assessment: "You have a history of periodontitis, meaning bone loss around the teeth. It's stable now, but you have receding gums, exposed roots or pockets of 4–5 mm. This needs lifelong maintenance to keep the disease from returning.",
            goals: [
                "Keep bacteria from settling back in deep under the gumline.",
                "Protect exposed, softer root surfaces from root cavities.",
                "Manage sensitivity caused by recession.",
                "Keep professional cleanings every 3 to 4 months."
            ],
            routine: [
                "Clean the wider gaps between teeth with interdental brushes.",
                "Use a water flosser to flush out deep pockets.",
                "Brush with a low-abrasion toothpaste for sensitive teeth, with fluoride or hydroxyapatite."
            ]
        },
        {
            n: 4,
            name: "High cavity risk & dry mouth",
            short: "Cavities & dry mouth",
            risk: "Elevated risk",
            level: "elev",
            video: "/assets/rinse.mp4",
            poster: "/assets/images/portal-rinse.jpg",
            assessment: "You've had new cavities recently, or you have dry mouth from medication, mouth breathing or a medical condition. Saliva is your mouth's natural defence, and without it enamel breaks down quickly.",
            goals: [
                "Encourage saliva flow and keep your mouth moist.",
                "Remineralize weakened enamel and reduce acidity.",
                "Protect roots and the edges of fillings and crowns from decay."
            ],
            routine: [
                "Sip plain water through the day, and avoid sipping acidic drinks.",
                "Brush with a high-fluoride or 10% nano-hydroxyapatite toothpaste.",
                "Chew sugar-free gum or lozenges made with 100% xylitol.",
                "Use an alcohol-free mouthwash for dry mouth before bed."
            ]
        }
    ]
};
