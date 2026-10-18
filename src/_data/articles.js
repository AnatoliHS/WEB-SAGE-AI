// Articles for the "Evidence-Based Dental Advice" section.
// `short` is the label shown sideways on a closed window; `points` are [title, detail] pairs.
// `height` and `offset` (px) give each window its staggered position on desktop.

module.exports = [
    {
        topic: "Brushing",
        date: "2026-08-31",
        dateLabel: "Aug 31, 2026",
        short: "Electric vs. manual",
        title: "Electric vs. Manual Toothbrushes: The Clinical Evidence",
        image: "/assets/images/topic_toothbrush.jpg",
        excerpt: "Many patients ask if upgrading to an electric toothbrush is truly worth it. Clinical trials show electric toothbrushes remove up to 21% more plaque and significantly reduce gum disease compared to manual brushing.",
        lead: "Key clinical advantages",
        points: [
            ["Better plaque removal", "High-end sonic or rotating-oscillating toothbrushes remove up to 21% more plaque than manual brushes."],
            ["Pressure sensors", "Built-in alerts stop the aggressive scrubbing that leads to gum recession and enamel wear."],
            ["Built-in timers", "A full two-minute cycle, with a nudge every 30 seconds to move to the next quarter of your mouth."]
        ],
        height: 480,
        offset: 30
    },
    {
        topic: "Flossing",
        date: "2026-08-15",
        dateLabel: "Aug 15, 2026",
        short: "Why flossing matters",
        title: "Why Flossing Is Non-Negotiable (Brushing Only Cleans 60%)",
        image: "/assets/images/topic_flossing.jpg",
        excerpt: "Brushing cleans the front, back and biting surfaces of your teeth. The sides between your teeth are nearly 40% of the total surface, and leaving them uncleaned lets plaque build up where you can't see it.",
        lead: "Plaque between teeth is the main cause of",
        points: [
            ["Cavities between teeth", "Decay that starts between teeth and often needs X-rays to find."],
            ["Gingivitis between teeth", "Inflamed gum points that bleed and cause bad breath."],
            ["Floss or water flosser", "String floss scrapes plaque off; a water flosser flushes deep pockets, wider gaps and braces."]
        ],
        height: 430,
        offset: 90
    },
    {
        topic: "Gum health",
        date: "2026-08-01",
        dateLabel: "Aug 1, 2026",
        short: "Gingivitis vs. periodontitis",
        title: "Understanding Gum Disease: Gingivitis vs. Periodontitis",
        image: "/assets/images/topic_gum_health.jpg",
        excerpt: "Gum disease is a progressive infection with two main stages. Knowing the difference between reversible gum swelling and irreversible bone loss is essential to protecting your smile.",
        lead: "The two stages",
        points: [
            ["Gingivitis (reversible)", "The first reaction to plaque. Gums bleed, but the bone is unaffected. Fully reversible with cleanings and home care."],
            ["Periodontitis (irreversible)", "Untreated inflammation causes bone loss and deep pockets. Care shifts to lifelong periodontal maintenance."]
        ],
        height: 500,
        offset: 0
    },
    {
        topic: "Treatment",
        date: "2026-07-20",
        dateLabel: "Jul 20, 2026",
        short: "Inside a scaling",
        title: "What Actually Happens During a Scaling (Deep Cleaning)?",
        image: "/assets/images/topic_scaling.jpg",
        excerpt: "Plaque left on teeth for 24 to 48 hours hardens into tartar that brushing can't remove. Professional scaling and root planing clear it away so the gums can heal and reattach.",
        lead: "The professional cleaning process",
        points: [
            ["Ultrasonic scaling", "Fast micro-vibrations break up hard tartar and flush away bacteria."],
            ["Hand instruments", "Fine curettes remove what's left on the roots, leaving them smooth so the gums can heal."]
        ],
        height: 450,
        offset: 60
    }
];
