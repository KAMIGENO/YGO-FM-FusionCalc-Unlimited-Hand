var cardTypes = [
    "Dragon",
    "Spellcaster",
    "Zombie",
    "Warrior",
    "Beast-Warrior",
    "Beast",
    "Winged Beast",
    "Fiend",
    "Fairy",
    "Insect",
    "Dinosaur",
    "Reptile",
    "Fish",
    "Sea Serpent",
    "Machine",
    "Thunder",
    "Aqua",
    "Pyro",
    "Rock",
    "Plant",
    "Magic",
    "Trap",
    "Ritual",
    "Equip",
];

var starNames = [
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Pluto",
    "Neptune",
    "Mercury",
    "Sun",
    "Moon",
    "Venus",
];

var fieldCardIds = {
    330: true,
    331: true,
    332: true,
    333: true,
    334: true,
    335: true,
};

function getCardTypeName(card) {

    if (!card) {
        return "Unknown";
    }

    if (card.Type === 20) {
        return fieldCardIds[card.Id] ? "Magic (Field)" : "Magic (Effect)";
    }

    if (cardTypes[card.Type] === "Spellcaster") {
        return "Magic-User (Spellcaster)";
    }

    return cardTypes[card.Type] || "Unknown";

}
