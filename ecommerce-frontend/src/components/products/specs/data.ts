type Field = {
    label: string,
    name: string,
    placeholder?: string,
    type?: string,
}

const bike: Field[] = [
    { label: "Model", name: "model", placeholder: "Model" },
    { label: "Model Year", name: "modelYear", placeholder: "2023" },
    { label: "Engine Capacity", name: "engineCapacity", placeholder: "150cc" },
    { label: "Transmission", name: "transmission", placeholder: "Manual" },
    { label: "Fuel Type", name: "fuelType", placeholder: "Diesel" },
    { label: "Mileage", name: "mileage", placeholder: "40kmpl" },
    { label: "Seat Height", name: "seatHeight", placeholder: "cm" },
    { label: "Weight", name: "weight", placeholder: "kg" },
    { label: "Colors", name: "colors", placeholder: "Add color and press Enter" },
    { label: "Number of Gears", name: "numberOfGears", placeholder: "6" },
    { label: "Top Speed", name: "topSpeed", placeholder: "km/h" },
    { label: "Fuel Capacity", name: "fuelTankCapacity", placeholder: "litres" },
    { label: "Registration Number", name: "registrationNumber", placeholder: "ABC-123" },
    { label: "Extras", name: "extras", placeholder: "Add extra and press Enter", type: "tags" },
];

const helmet: Field[] = [
    { label: "Sizes", name: "sizes", placeholder: "Add size and press Enter", type: "tags" },
    { label: "Material", name: "material", placeholder: "Material" },
    { label: "Safety Standards", name: "sizes", placeholder: "Add standard and press Enter", type: "tags" },
    { label: "Weight (grams)", name: "sizes", placeholder: "grams" },
    { label: "Visor Included", name: "sizes", type: "checkbox" },
    { label: "Ventilation", name: "sizes", type: "checkbox" },
    { label: "Colors", name: "sizes", placeholder: "Add color and press Enter", type: "tags" },
    { label: "Extras", name: "sizes", placeholder: "Add extra and press Enter", type: "tags" },
];

const gloves: Field[] = [
    { label: "Sizes", name: "sizes", placeholder: "Add size and press Enter", type: "tags" },
    { label: "Material", name: "material", placeholder: "Material" },
    { label: "Palm Protection", name: "palmProtection", type: "checkbox" },
    { label: "Waterproof", name: "waterproof", type: "checkbox" },
    { label: "Touchscreen Compatible", name: "touchscreenCompatible", type: "checkbox" },
    { label: "Reinforced Knuckles", name: "reinforcedKnuckles", type: "checkbox" },
    { label: "Colors", name: "colors", placeholder: "Material", type: "tags" },
    { label: "Extras", name: "extras", placeholder: "Material", type: "tags" },
];

const suit: Field[] = [
    { label: "Sizes", name: "sizes", placeholder: "Add size and press Enter", type: "tags" },
    { label: "Material", name: "material", placeholder: "Material" },
    { label: "Waterproof", name: "waterproof", type: "checkbox" },
    { label: "Thermal Insulation", name: "thermalInsulation", type: "checkbox" },
    { label: "Armor Included", name: "armorIncluded", type: "checkbox" },
    { label: "Thermal Insulation", name: "thermalInsulation", type: "checkbox" },
    { label: "Season", name: "season", placeholder: "All" },
    { label: "Colors", name: "colors", placeholder: "Material", type: "tags" },
    { label: "Extras", name: "extras", placeholder: "Material", type: "tags" },
]

const SPECFIELDS = { suit, gloves, bike, helmet };

export default SPECFIELDS