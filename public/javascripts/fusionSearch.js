/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/fusionSearch.js
 * ------------------------------------------------------------
 *
 * Searches cards by name and shows their fusion, equip, and
 * result relationships.
 */


/*
 * ------------------------------------------------------------
 * 1. INITIALIZATION
 * ------------------------------------------------------------
 */

var nameInput = document.getElementById("cardname");
var outputLeft = document.getElementById("output-area-left");
var outputRight = document.getElementById("output-area-right");
var outputCard = document.getElementById("outputcard");
var searchMessage = document.getElementById("search-msg");
var resetBtn = document.getElementById("reset-btn");
var searchResultsBtn = document.getElementById("search-results-btn");
var searchNameBtn = document.getElementById("search-name-btn");


/*
 * ------------------------------------------------------------
 * 2. CARD LOOKUPS AND DISPLAY HELPERS
 * ------------------------------------------------------------
 */

var cardByName = {};
var cardById = {};


card_db()
    .get()
    .forEach(function (card) {

        cardByName[card.Name.toLowerCase()] = card;
        cardById[card.Id] = card;

    });


var ritualDefinitions = [];


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


function getCardById(id) {
    return cardById[id] || null;
}


function getCardByName(name) {

    if (!name) {
        return null;
    }

    return cardByName[name.toLowerCase()] || null;

}


var glitchFusionDefinitions = glitchFusions.map(function (fusion) {

    return {
        card1: getCardByName(fusion.card1),
        card2: getCardByName(fusion.card2),
        result: getCardByName(fusion.result),
        glitch: true
    };

}).filter(function (fusion) {

    return fusion.card1 && fusion.card2 && fusion.result;

});


var glitchFusionsByCardId = {};
var glitchFusionsByResultId = {};


glitchFusionDefinitions.forEach(function (fusion) {

    if (!glitchFusionsByCardId[fusion.card1.Id]) {
        glitchFusionsByCardId[fusion.card1.Id] = [];
    }

    if (!glitchFusionsByCardId[fusion.card2.Id]) {
        glitchFusionsByCardId[fusion.card2.Id] = [];
    }

    glitchFusionsByCardId[fusion.card1.Id].push(fusion);
    glitchFusionsByCardId[fusion.card2.Id].push(fusion);

    if (!glitchFusionsByResultId[fusion.result.Id]) {
        glitchFusionsByResultId[fusion.result.Id] = [];
    }

    glitchFusionsByResultId[fusion.result.Id].push(fusion);

});

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}


/*
 * ------------------------------------------------------------
 * 3. CLEAR AND ERROR MESSAGES
 * ------------------------------------------------------------
 */

function resultsClear() {

    outputLeft.innerHTML = "";
    outputRight.innerHTML = "";
    outputCard.innerHTML = "";
    searchMessage.innerHTML = "";

}


function createDangerMessage(input) {

    if (!input) {
        return "<div class=\"alert alert-danger\" role=\"alert\">Please enter a search term</div>";
    }


    return (
        "<div class=\"alert alert-danger\" role=\"alert\">" +
        "No card for " +
        escapeHTML(input) +
        " found</div>"
    );

}


/*
 * ------------------------------------------------------------
 * 4. CARD DISPLAY
 * ------------------------------------------------------------
 */

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


function createSideCard(card) {

    var modelCard =
        "<div class=\"card ml-1\" style=\"max-width: 540px\">" +
        "<div class=\"row no-gutters\">" +
        "<div class=\"col\">" +
        "<div class=\"card-body\">" +
        "<h5 class=\"card-title\">" +
        formatCardId(card.Id) + " " + escapeHTML(card.Name) +
        "</h5>" +
        "<p class=\"card-text\">" +
        escapeHTML(card.Description) +
        "</p>" +
        "<p class=\"card-text\"><strong>Type:</strong> " +
        escapeHTML(cardTypes[card.Type]) +
        "</p>";


    if (isMonster(card)) {
        modelCard +=
            "<p class=\"card-text\"><strong>Guardian Stars:</strong> " +
            escapeHTML(formatGuardianStars(card)) +
            "</p>" +
            "<p class=\"card-text\"><strong>ATK / DEF:</strong> " +
            card.Attack + "A / " + card.Defense + "D" +
            "</p>";
    }

    modelCard +=
        "<p class=\"card-text\"><strong>Stars:</strong> " +
        card.Stars +
        "</p>" +
        "<p class=\"card-text\"><strong>Password:</strong> " +
        escapeHTML(card.CardCode) +
        "</p>" +
        "</div></div></div></div>";

    return modelCard;
}


/*
 * ------------------------------------------------------------
 * 5. FUSION RESULT DISPLAY
 * ------------------------------------------------------------
 */

function fusesToHTML(fuselist) {

    return fuselist
        .map(function (fusion) {

            var res =
                "<div class=\"card border-dark mb-3 fusion-search-result-card\">" +
                "<div class=\"card-body text-dark\">";

            if (fusion.glitch) {
                res +=
                    "<p class=\"card-text\"><strong>Glitch Fusion</strong></p>";
            }

            res +=
                "<p class=\"card-text\">" +
                escapeHTML(formatInputCard(fusion.card1)) +
                "</p>" +
                "<p class=\"card-text\">" +
                escapeHTML(formatInputCard(fusion.card2)) +
                "</p>";

            if (fusion.result) {
                res +=
                    "<p class=\"card-text fusion-search-result\">" +
                    "<strong>Result: " +
                    escapeHTML(formatCardId(fusion.result.Id) + " " + fusion.result.Name) +
                    "</strong><br>" +
                    escapeHTML(formatCardDetails(fusion.result)) +
                    "</p>";
            }

            return res + "</div></div>";

        })
        .join("");

}


function equipsToHTML(equipList) {

    return equipList
        .map(function (equip) {

            return (
                "<div class=\"card border-dark mb-3 fusion-search-result-card\">" +
                "<div class=\"card-body text-dark\">" +
                "<p class=\"card-text\">" +
                escapeHTML(formatInputCard(equip.card2)) +
                "</p>" +
                "</div></div>"
            );

        })
        .join("");

}


function getFieldsForCard(card) {

    if (!card || !isMonster(card) || typeof fieldList === "undefined") {
        return [];
    }

    return fieldList.reduce(function (results, field) {

        var positive = field.PositiveTypes.indexOf(card.Type) !== -1;
        var negative = field.NegativeTypes.indexOf(card.Type) !== -1;

        if (positive || negative) {
            var fieldCard = getCardById(field.CardId);

            if (fieldCard) {
                if (positive) {
                    results.push({
                        card: fieldCard,
                        positive: true
                    });
                }

                if (negative) {
                    results.push({
                        card: fieldCard,
                        positive: false
                    });
                }
            }
        }

        return results;

    }, []);

}


function fieldsToHTML(fields) {

    return fields
        .map(function (entry) {

            return (
                "<div class=\"card border-dark mb-3 fusion-search-result-card\">" +
                "<div class=\"card-body text-dark\">" +
                "<p class=\"card-text mb-0\">" +
                "<span class=\"" +
                (entry.positive ? "field-positive" : "field-negative") +
                "\">" +
                (entry.positive ? "+" : "-") +
                escapeHTML(entry.card.Name) +
                "</span>" +
                "</p>" +
                "</div></div>"
            );

        })
        .join("");

}


function ritualCardNames(ritual) {

    return [
        getCardById(ritual.card1),
        getCardById(ritual.card2),
        getCardById(ritual.card3)
    ].filter(function (card) {
        return !!card;
    });

}


function ritualsToHTML(ritualList) {

    return ritualList
        .map(function (ritual) {

            var ritualCard = getCardById(ritual.ritual_card);
            var materials = ritualCardNames(ritual);
            var result = getCardById(ritual.result);


            if (!ritualCard || materials.length !== 3 || !result) {
                return "";
            }


            return (
                "<div class=\"card border-dark mb-3\" style=\"max-width: 18rem;\">" +
                "<div class=\"card-body text-dark\">" +
                "<p class=\"card-text\"><strong>Ritual:</strong> " +
                formatInputCard(ritualCard) +
                "</p>" +
                "<p class=\"card-text\"><strong>Material:</strong> " +
                formatInputCard(materials[0]) +
                "</p>" +
                "<p class=\"card-text\"><strong>Material:</strong> " +
                formatInputCard(materials[1]) +
                "</p>" +
                "<p class=\"card-text\"><strong>Material:</strong> " +
                formatInputCard(materials[2]) +
                "</p>" +
                "<p class=\"card-text\"><strong>Result:</strong> " +
                formatCardSummary(result) +
                "</p>" +
                "</div></div>"
            );

        })
        .join("");

}


function getRitualsForCard(cardId) {

    return ritualDefinitions.filter(function (ritual) {

        return ritual.ritual_card === cardId ||
            ritual.card1 === cardId ||
            ritual.card2 === cardId ||
            ritual.card3 === cardId;

    });

}


function getRitualsForResult(cardId) {

    return ritualDefinitions.filter(function (ritual) {
        return ritual.result === cardId;
    });

}


/*
 * ------------------------------------------------------------
 * 6. SEARCH BY NAME
 * ------------------------------------------------------------
 */

function searchByName() {

    if (nameInput.value === "") {
        searchMessage.innerHTML = createDangerMessage();
        return;
    }


    var card = getCardByName(nameInput.value);


    if (!card) {
        searchMessage.innerHTML = createDangerMessage(nameInput.value);
        return;
    }


    outputCard.innerHTML = createSideCard(card);


    var fuses = (fusionsList[card.Id] || []).map(function (fusion) {

        return {
            card1: card,
            card2: getCardById(fusion.card),
            result: getCardById(fusion.result)
        };

    }).filter(function (fusion) {

        return fusion.card2 && fusion.result;

    });


    (glitchFusionsByCardId[card.Id] || []).forEach(function (fusion) {

        fuses.push({
            card1: fusion.card1,
            card2: fusion.card2,
            result: fusion.result,
            glitch: true
        });

    });


    var equips = (equipsList[card.Id] || [])
        .map(function (targetId) {

            return {
                card1: card,
                card2: getCardById(targetId)
            };

        })
        .filter(function (equip) {
            return !!equip.card2 && equip.card2.Id !== card.Id;
        });


    var rituals = getRitualsForCard(card.Id);
    var fields = getFieldsForCard(card);


    outputRight.innerHTML =
        "<h2 class='text-center my-4'>Equips</h2>" +
        equipsToHTML(equips) +
        (fields.length > 0
            ? "<h2 class='text-center my-4'>Fields</h2>" + fieldsToHTML(fields)
            : "");

    outputLeft.innerHTML =
        (fuses.length > 0
            ? "<h2 class='text-center my-4'>Fusions</h2>" + fusesToHTML(fuses)
            : "") +
        (rituals.length > 0
            ? "<h2 class='text-center my-4'>Rituals</h2>" + ritualsToHTML(rituals)
            : "");

}


/*
 * ------------------------------------------------------------
 * 7. SEARCH FOR RESULT
 * ------------------------------------------------------------
 */

function searchForResult() {

    if (nameInput.value === "") {
        searchMessage.innerHTML = createDangerMessage();
        return;
    }


    var card = getCardByName(nameInput.value);


    if (!card) {
        searchMessage.innerHTML = createDangerMessage(nameInput.value);
        return;
    }


    outputCard.innerHTML = createSideCard(card);


    var resultEntries = resultsList[card.Id] || [];
    var rituals = getRitualsForResult(card.Id);


    var results = resultEntries
        .map(function (fusion) {

            return {
                card1: getCardById(fusion.card1),
                card2: getCardById(fusion.card2)
            };

        })
        .filter(function (fusion) {
            return fusion.card1 && fusion.card2;
        });


    (glitchFusionsByResultId[card.Id] || []).forEach(function (fusion) {

        results.push({
            card1: fusion.card1,
            card2: fusion.card2,
            glitch: true
        });

    });


    outputLeft.innerHTML =
        (results.length > 0
            ? "<h2 class='text-center my-4'>Fusions</h2>" + fusesToHTML(results)
            : "") +
        (rituals.length > 0
            ? "<h2 class='text-center my-4'>Rituals</h2>" + ritualsToHTML(rituals)
            : "");

}


/*
 * ------------------------------------------------------------
 * 8. AUTOCOMPLETE AND BUTTON HANDLERS
 * ------------------------------------------------------------
 */

var cardNameCompletion = new Awesomplete(nameInput, {
    list: card_db()
        .get()
        .map(function (card) {
            return card.Name;
        }),
    autoFirst: true,
    filter: Awesomplete.FILTER_STARTSWITH
});


$("#cardname").on("change", function () {

    cardNameCompletion.select();
    resultsClear();
    searchByName();

});


$("#cardname").on("awesomplete-selectcomplete", function () {

    resultsClear();
    searchByName();

});


searchNameBtn.onclick = function () {

    cardNameCompletion.select();
    resultsClear();
    searchByName();

};


searchResultsBtn.onclick = function () {

    cardNameCompletion.select();
    resultsClear();
    searchForResult();

};


resetBtn.onclick = function () {

    resultsClear();
    nameInput.value = "";

};


/*
 * ------------------------------------------------------------
 * END OF FILE
 * ------------------------------------------------------------
 */
