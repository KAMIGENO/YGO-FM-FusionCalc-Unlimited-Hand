/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/fusionCalc.js
 * ------------------------------------------------------------
 *
 * Handles the 400-slot Fusion Calculator.
 * Only the currently visible 20 inputs exist in the DOM;
 * all 400 card selections are stored in handCards.
 */


/*
 * ------------------------------------------------------------
 * 1. INITIALIZATION
 * ------------------------------------------------------------
 */

var outputLeft = document.getElementById("outputarealeft");
var outputRight = document.getElementById("outputarearight");
var handInputGroup = document.getElementById("hand-input-group");

var HAND_SIZE = 400;
var PAGE_SIZE = 10;

var handCards = new Array(HAND_SIZE).fill(null);
var currentPage = 1;
var totalPages = Math.ceil(HAND_SIZE / PAGE_SIZE);

var allCards = card_db().get();
var cardNames = allCards.map(function (card) {
    return card.Name;
});


/*
 * ------------------------------------------------------------
 * 2. CARD LOOKUPS
 *
 * Cache cards by name and ID so large hands do not repeatedly
 * query Taffy for the same information.
 * ------------------------------------------------------------
 */

var cardByName = {};
var cardById = {};


allCards.forEach(function (card) {

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


/*
 * ------------------------------------------------------------
 * 3. FUSION AND EQUIP LOOKUPS
 *
 * Build O(1) pair lookups for the 79,800 possible pairs in a
 * completely filled 400-card hand.
 * ------------------------------------------------------------
 */

var fusionLookup = {};
var glitchFusionLookup = {};
var equipLookup = {};
var ritualDefinitions = [];


fusionsList.forEach(function (fusionList, cardId) {

    if (!fusionList) {
        return;
    }

    fusionLookup[cardId] = {};


    fusionList.forEach(function (fusion) {

        if (!fusion || fusion.card == null) {
            return;
        }

        fusionLookup[cardId][fusion.card] = fusion.result;

    });

});


glitchFusions.forEach(function (fusion) {

    var card1 = getCardByName(fusion.card1);
    var card2 = getCardByName(fusion.card2);
    var result = getCardByName(fusion.result);


    if (!card1 || !card2 || !result) {
        return;
    }


    if (!glitchFusionLookup[card1.Id]) {
        glitchFusionLookup[card1.Id] = {};
    }

    if (!glitchFusionLookup[card2.Id]) {
        glitchFusionLookup[card2.Id] = {};
    }


    glitchFusionLookup[card1.Id][card2.Id] = result.Id;
    glitchFusionLookup[card2.Id][card1.Id] = result.Id;

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


ritualsList.forEach(function (ritualList) {

    if (!ritualList) {
        return;
    }

    ritualList.forEach(function (ritual) {

        if (!ritual) {
            return;
        }

        ritualDefinitions.push(ritual);

    });

});


/*
 * ------------------------------------------------------------
 * 4. DISPLAY HELPERS
 * ------------------------------------------------------------
 */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}


function formatStats(attack, defense) {
    return attack + "A / " + defense + "D";
}


function isMonster(card) {
    return !!card && card.Type < 20;
}


function formatCardId(id) {
    return "#" + String(id).padStart(3, "0");
}


function formatGuardianStar(value) {
    if (value === 10) {
        return starNames[9];
    }

    return starNames[value] || starNames[0];
}


function formatGuardianStars(card) {
    return formatGuardianStar(card.GuardianStarA) + " / " + formatGuardianStar(card.GuardianStarB);
}


function formatCardDetails(card) {
    if (!card) {
        return "";
    }

    var details =
        "Type: " +
        (cardTypes[card.Type] || "Unknown");

    if (isMonster(card)) {
        details +=
            " — Guardian Stars: " +
            formatGuardianStars(card) +
            " — " +
            card.Attack +
            "A / " +
            card.Defense +
            "D";
    }

    return details;
}


function formatCardSummary(card) {
    if (!card) {
        return "";
    }

    return (
        formatCardId(card.Id) +
        " " +
        card.Name +
        "\n" +
        formatCardDetails(card)
    );
}


function formatInputCard(card) {
    return formatCardId(card.Id) + " " + card.Name;
}


function formatResultCard(card) {
    return formatCardSummary(card);
}


function fusesToHTML(fuselist) {

    return fuselist
        .map(function (fusion) {

            var res =
                "<div class='result-div'>";

            if (fusion.glitch) {
                res += "<strong>Glitch Fusion</strong><br>";
            }

            res +=
                escapeHTML(formatInputCard(fusion.card1)) +
                "<br>" +
                escapeHTML(formatInputCard(fusion.card2));

            if (fusion.result) {
                res +=
                    "<br>Result: " +
                    escapeHTML(formatCardSummary(fusion.result)).replace(/\n/g, "<br>");
            }

            return res + "</div>";

        })
        .join("\n");

}



/*
 * ------------------------------------------------------------
 * 6. FUSION CALCULATION
 * ------------------------------------------------------------
 */

function findFusions() {

    var cards = handCards.filter(function (card) {
        return card !== null;
    });

    var fuses = [];
    var equips = [];

    for (var i = 0; i < cards.length - 1; i++) {

        var card1 = cards[i];
        var card1Fusions = fusionLookup[card1.Id] || {};
        var card1Equips = equipLookup[card1.Id] || {};

        for (var j = i + 1; j < cards.length; j++) {

            var card2 = cards[j];
            var fusionResultId = card1Fusions[card2.Id];

            if (fusionResultId) {
                var fusionResult = getCardById(fusionResultId);

                if (fusionResult) {
                    fuses.push({
                        card1: card1,
                        card2: card2,
                        result: fusionResult
                    });
                }
            }

            var glitchResultId =
                (glitchFusionLookup[card1.Id] || {})[card2.Id];

            if (glitchResultId) {
                var glitchResult = getCardById(glitchResultId);

                if (glitchResult) {
                    fuses.push({
                        card1: card1,
                        card2: card2,
                        result: glitchResult,
                        glitch: true
                    });
                }
            }

            if (card1Equips[card2.Id]) {
                equips.push({
                    card1: card1,
                    card2: card2
                });
            }
        }
    }

    fuses.sort(function (a, b) {
        return b.result.Attack - a.result.Attack;
    });

    outputLeft.innerHTML =
        "<h2 class='text-left'>Fusions:</h2>" +
        fusesToHTML(fuses);

    var rituals = findRituals(cards);

    outputRight.innerHTML =
        "<h2 class='text-left'>Equips:</h2>" +
        fusesToHTML(equips) +
        "<h2 class='text-left'>Rituals:</h2>" +
        ritualsToHTML(rituals);

}


/*
 * ------------------------------------------------------------
 * 6. RITUAL CALCULATION
 * ------------------------------------------------------------
 */

function findRituals(cards) {

    var cardCounts = {};


    cards.forEach(function (card) {

        cardCounts[card.Id] = (cardCounts[card.Id] || 0) + 1;

    });


    return ritualDefinitions
        .map(function (ritual) {

            var requiredCards = [
                ritual.ritual_card,
                ritual.card1,
                ritual.card2,
                ritual.card3
            ];

            var requiredCounts = {};


            requiredCards.forEach(function (cardId) {
                requiredCounts[cardId] = (requiredCounts[cardId] || 0) + 1;
            });


            var canRitual = Object.keys(requiredCounts).every(function (cardId) {

                return (cardCounts[cardId] || 0) >= requiredCounts[cardId];

            });


            if (!canRitual) {
                return null;
            }


            return {
                ritualCard: getCardById(ritual.ritual_card),
                card1: getCardById(ritual.card1),
                card2: getCardById(ritual.card2),
                card3: getCardById(ritual.card3),
                result: getCardById(ritual.result)
            };

        })
        .filter(function (ritual) {
            return ritual &&
                ritual.ritualCard &&
                ritual.card1 &&
                ritual.card2 &&
                ritual.card3 &&
                ritual.result;
        });

}


function ritualsToHTML(ritualList) {

    return ritualList
        .map(function (ritual) {

            return (
                "<div class='result-div'>Ritual: " +
                formatInputCard(ritual.ritualCard) +
                "<br>Material: " +
                formatInputCard(ritual.card1) +
                "<br>Material: " +
                formatInputCard(ritual.card2) +
                "<br>Material: " +
                formatInputCard(ritual.card3) +
                "<br>Result: " +
                formatResultCard(ritual.result) +
                "<br><br></div>"
            );

        })
        .join("\n");

}


/*
 * ------------------------------------------------------------
 * 7. INPUT / CARD DISPLAY
 * ------------------------------------------------------------
 */

function updateCardInfo(input, info) {

    var card = getCardByName(input.value);


    if (!card) {

        info.textContent =
            input.value === ""
                ? ""
                : "Invalid card name";

        return;

    }


    if (isMonster(card)) {

        info.textContent =
            formatCardDetails(card);

    } else {

        info.textContent = formatCardSummary(card);

    }

}


function createInput(slotNumber) {

    var wrapper = document.createElement("div");
    wrapper.className = "hand-slot";


    var number = document.createElement("span");
    number.className = "hand-slot-number";

    var paddedSlotNumber =
        slotNumber < 10
            ? "00" + slotNumber
            : slotNumber < 100
                ? "0" + slotNumber
                : String(slotNumber);

    number.textContent = paddedSlotNumber + ". ";


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
        info: info
    };

}


/*
 * ------------------------------------------------------------
 * 8. PAGINATION
 * ------------------------------------------------------------
 */

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
        filter: Awesomplete.FILTER_STARTSWITH
    });


    input.addEventListener("change", function () {

        completion.select();

        handCards[slotIndex] = getCardByName(input.value);

        updateCardInfo(input, info);

        findFusions();

    });


    input.addEventListener("awesomplete-selectcomplete", function () {

        handCards[slotIndex] = getCardByName(input.value);

        updateCardInfo(input, info);

        findFusions();

    });

}


/*
 * ------------------------------------------------------------
 * 9. PAGINATION CONTROLS
 * ------------------------------------------------------------
 */

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


/*
 * ------------------------------------------------------------
 * 10. RESET
 * ------------------------------------------------------------
 */

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


/*
 * ------------------------------------------------------------
 * 11. INITIAL RENDER
 * ------------------------------------------------------------
 */

renderPage();


/*
 * ------------------------------------------------------------
 * END OF FILE
 * ------------------------------------------------------------
 */
