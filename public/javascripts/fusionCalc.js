var outputLeft = document.getElementById("outputarealeft");
var outputRight = document.getElementById("outputarearight");
var handInputGroup = document.getElementById("hand-input-group");

var HAND_SIZE = 400;
var PAGE_SIZE = 20;

// Store the cards independently from the DOM.
// This means we don't need 400 inputs sitting in the document.
var handCards = new Array(HAND_SIZE).fill(null);

// Currently displayed page.
var currentPage = 1;
var totalPages = Math.ceil(HAND_SIZE / PAGE_SIZE);

var cardNames = card_db()
    .get()
    .map((c) => c.Name);

// Cache cards by name and ID.
// This eliminates thousands of repeated Taffy database queries.
var cardByName = {};
var cardById = {};

card_db()
    .get()
    .forEach(function (card) {
        cardByName[card.Name.toLowerCase()] = card;
        cardById[card.Id] = card;
    });

function getCardByName(cardname) {
    if (!cardname) {
        return null;
    }

    return cardByName[cardname.toLowerCase()] || null;
}

function getCardById(id) {
    return cardById[id] || null;
}

// Build O(1) lookup tables for fusions and equips.
//
// Instead of doing this for every pair:
//
//     card1Fuses.find(...)
//     card1Equips.find(...)
//
// we can simply do:
//
//     fusionLookup[id1][id2]
//
// This matters a lot at 300-400 cards.
var fusionLookup = {};
var equipLookup = {};

fusionsList.forEach(function (fusionList, cardId) {
    if (!fusionList) {
        return;
    }

    fusionLookup[cardId] = {};

    fusionList.forEach(function (fusion) {
        fusionLookup[cardId][fusion.card] = fusion.result;
    });
});

equipsList.forEach(function (equipList, cardId) {
    if (!equipList) {
        return;
    }

    equipLookup[cardId] = {};

    equipList.forEach(function (targetId) {
        equipLookup[cardId][targetId] = true;
    });
});

function formatStats(attack, defense) {
    return "(" + attack + "/" + defense + ")";
}

// Returns true if the given card is a monster.
function isMonster(card) {
    return card.Type < 20;
}

// Creates the HTML for fusion/equip results.
function fusesToHTML(fuselist) {
    return fuselist
        .map(function (fusion) {
            var res =
                "<div class='result-div'>Input: " +
                fusion.card1.Name +
                "<br>Input: " +
                fusion.card2.Name;

            if (fusion.result) {
                res += "<br>Result: " + fusion.result.Name;

                if (isMonster(fusion.result)) {
                    res += " " + formatStats(fusion.result.Attack, fusion.result.Defense);
                } else {
                    res += " [" + cardTypes[fusion.result.Type] + "]";
                }
            }

            return res + "<br><br></div>";
        })
        .join("\n");
}

// ------------------------------------------------------------
// FUSION CALCULATION
// ------------------------------------------------------------

function findFusions() {
    // Only populated slots participate in fusion calculations.
    var cards = handCards.filter(function (card) {
        return card !== null;
    });

    var fuses = [];
    var equips = [];

    // N cards = N(N-1)/2 pair checks.
    //
    // At 400 cards this is 79,800 checks, but each check now uses
    // a direct object lookup instead of Array.find() + database lookup.
    for (var i = 0; i < cards.length - 1; i++) {
        var card1 = cards[i];

        var card1Fusions = fusionLookup[card1.Id] || {};
        var card1Equips = equipLookup[card1.Id] || {};

        for (var j = i + 1; j < cards.length; j++) {
            var card2 = cards[j];

            var fusionResultId = card1Fusions[card2.Id];

            if (fusionResultId) {
                fuses.push({
                    card1: card1,
                    card2: card2,
                    result: getCardById(fusionResultId),
                });
            }

            if (card1Equips[card2.Id]) {
                equips.push({
                    card1: card1,
                    card2: card2,
                });
            }
        }
    }

    // Sort fusions by result ATK.
    fuses.sort(function (a, b) {
        return b.result.Attack - a.result.Attack;
    });

    outputLeft.innerHTML =
        "<h2 class='center'>Fusions:</h2>" +
        fusesToHTML(fuses);

    outputRight.innerHTML =
        "<h2 class='center'>Equips:</h2>" +
        fusesToHTML(equips);
}

// ------------------------------------------------------------
// INPUT / CARD DISPLAY
// ------------------------------------------------------------

function updateCardInfo(input, info) {
    var card = getCardByName(input.value);

    if (!card) {
        info.innerHTML = input.value === "" ? "" : "Invalid card name";
        return;
    }

    if (isMonster(card)) {
        info.innerHTML =
            formatStats(card.Attack, card.Defense) +
            " [" +
            cardTypes[card.Type] +
            "]";
    } else {
        info.innerHTML = "[" + cardTypes[card.Type] + "]";
    }
}

function createInput(slotNumber) {
    var wrapper = document.createElement("div");
    wrapper.className = "hand-slot";

    var number = document.createElement("span");
    number.className = "hand-slot-number";
    number.textContent = slotNumber + ".";

    var input = document.createElement("input");
    input.type = "text";
    input.id = "hand" + slotNumber;
    input.className = "hand-card-input";
    input.autocomplete = "off";

    var info = document.createElement("span");
    info.id = "hand" + slotNumber + "-info";
    info.className = "hand-card-info";

    wrapper.appendChild(number);
    wrapper.appendChild(input);
    wrapper.appendChild(info);

    return {
        wrapper: wrapper,
        input: input,
        info: info,
    };
}

// ------------------------------------------------------------
// PAGINATION
// ------------------------------------------------------------

function renderPage() {
    handInputGroup.innerHTML = "";

    var start = (currentPage - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, HAND_SIZE);

    for (var slot = start; slot < end; slot++) {
        var slotNumber = slot + 1;
        var elements = createInput(slotNumber);

        handInputGroup.appendChild(elements.wrapper);

        var card = handCards[slot];

        if (card) {
            elements.input.value = card.Name;
            updateCardInfo(elements.input, elements.info);
        }

        initializeAutocomplete(
            elements.input,
            elements.info,
            slot
        );
    }

    updatePagination();
}

function initializeAutocomplete(input, info, slotIndex) {
    var completion = new Awesomplete(input, {
        list: cardNames,
        autoFirst: true,
        filter: Awesomplete.FILTER_STARTSWITH,
    });

    input.addEventListener("change", function () {
        completion.select();

        var card = getCardByName(input.value);

        handCards[slotIndex] = card;

        updateCardInfo(input, info);

        findFusions();
    });

    input.addEventListener("awesomplete-selectcomplete", function () {
        var card = getCardByName(input.value);

        handCards[slotIndex] = card;

        updateCardInfo(input, info);

        findFusions();
    });
}

// ------------------------------------------------------------
// PAGINATION CONTROLS
// ------------------------------------------------------------

function updatePagination() {
    var pageLabel = document.getElementById("hand-page-label");
    var previousButton = document.getElementById("hand-prev");
    var nextButton = document.getElementById("hand-next");

    pageLabel.textContent =
        "Slots " +
        ((currentPage - 1) * PAGE_SIZE + 1) +
        "-" +
        Math.min(currentPage * PAGE_SIZE, HAND_SIZE) +
        " of " +
        HAND_SIZE;

    previousButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
}

function changePage(page) {
    if (page < 1 || page > totalPages) {
        return;
    }

    currentPage = page;
    renderPage();

    // Put focus on the first input on the new page.
    var firstInput = document.getElementById(
        "hand" + ((currentPage - 1) * PAGE_SIZE + 1)
    );

    if (firstInput) {
        firstInput.focus();
    }
}

document.getElementById("hand-prev").addEventListener("click", function () {
    changePage(currentPage - 1);
});

document.getElementById("hand-next").addEventListener("click", function () {
    changePage(currentPage + 1);
});

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------

function resultsClear() {
    outputLeft.innerHTML = "";
    outputRight.innerHTML = "";
}

function inputsClear() {
    handCards.fill(null);

    currentPage = 1;

    renderPage();
    resultsClear();
}

document.getElementById("resetBtn").addEventListener("click", function () {
    inputsClear();
});

// Initial render.
renderPage();
