// Products for the "Recommended Oral Care" shelf.
// `group` must match one of the filter ids below.
// TODO: replace each `url` with the real product link.

module.exports = {
    filters: [
        { id: "all", label: "All" },
        { id: "brush", label: "Brushing" },
        { id: "between", label: "Between teeth" },
        { id: "paste", label: "Pastes & rinses" },
        { id: "drymouth", label: "Dry mouth" }
    ],
    items: [
        {
            name: "Philips Sonicare",
            category: "Electric toothbrush",
            group: "brush",
            image: "/assets/images/product_sonicare.jpg",
            url: "https://amazon.com",
            description: "Sonic toothbrush with up to 62,000 brush movements a minute and a sensor that warns when you press too hard.",
            note: "Crucial for gum recession and active gingivitis. The pressure sensor stops aggressive scrubbing."
        },
        {
            name: "Waterpik Cordless",
            category: "Water flosser",
            group: "between",
            image: "/assets/images/product_waterpik.jpg",
            url: "https://amazon.com",
            description: "Cordless water flosser that flushes plaque and food from between teeth and just below the gumline.",
            note: "Perfect for deep pockets or braces, where string floss is hard to get around."
        },
        {
            name: "TePe Interdental Brushes",
            category: "Interdental brushes",
            group: "between",
            image: "/assets/images/product_tepe.jpg",
            url: "https://amazon.com",
            description: "Small brushes sized to the gaps between your teeth, where a regular brush can't reach.",
            note: "Essential for Category 3 periodontal maintenance. Cleans the hollow root surfaces between teeth."
        },
        {
            name: "MI Paste Plus",
            category: "Remineralizing paste",
            group: "paste",
            image: "/assets/images/product_mipaste.jpg",
            url: "https://amazon.com",
            description: "Delivers calcium and phosphate (CPP-ACP) with fluoride to help strengthen enamel and ease sensitivity.",
            note: "My first choice for Category 4 patients. Helps rebuild enamel and calms root sensitivity."
        },
        {
            name: "TheraBreath Rinse",
            category: "Alcohol-free mouthwash",
            group: "paste",
            image: "/assets/images/product_therabreath.jpg",
            url: "https://amazon.com",
            description: "Alcohol-free rinse that freshens breath without the burn.",
            note: "With no alcohol, it won't dry out your mouth, which matters if you're at high risk of cavities."
        },
        {
            name: "XyliMelts Discs",
            category: "Dry mouth discs",
            group: "drymouth",
            image: "/assets/images/product_xylimelts.jpg",
            url: "https://amazon.com",
            description: "Slow-dissolving discs that stick to the gum, release xylitol and keep the mouth moist for hours.",
            note: "A nighttime lifesaver for dry mouth. Xylitol helps stop the bacteria that cause cavities."
        }
    ]
};
