/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/fusionCalc.js
 * ------------------------------------------------------------
 *
 * Handles the 800-slot Fusion Calculator.
 * Only the currently visible 10 inputs exist in the DOM;
 * all 800 card selections are stored in handCards.
 */


/*
 * ------------------------------------------------------------
 * 1. INITIALIZATION
 * ------------------------------------------------------------
 */

var outputLeft = document.getElementById("outputarealeft");
var outputRight = document.getElementById("outputarearight");
var handInputGroup = document.getElementById("hand-input-group");

var HAND_SIZE = 800;
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
 * completely filled 800-card hand.
 * ------------------------------------------------------------
 */

var fusionLookup = {};
var glitchFusionLookup = {};
var equipLookup = {};
var ritualDefinitions = [];
var fieldCardIds = {};


fieldList.forEach(function (definition) {
    fieldCardIds[definition.CardId] = true;
});


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


var guardianStarSymbols = {
    "Sun": "☉",
    "Mercury": "☿",
    "Venus": "♀",
    "Moon": "☾",
    "Mars": "♂",
    "Jupiter": "♃",
    "Saturn": "♄",
    "Uranus": "⛢",
    "Neptune": "♆",
    "Pluto": "♇"
};


function formatGuardianStar(value) {
    return starNames[value - 1] || starNames[0];
}


function formatGuardianStarWithSymbol(value) {
    var name = formatGuardianStar(value);
    return (guardianStarSymbols[name] || "") + " " + name;
}


function formatGuardianStars(card) {
    return (
        formatGuardianStarWithSymbol(card.GuardianStarA) +
        " / " +
        formatGuardianStarWithSymbol(card.GuardianStarB)
    );
}


function formatCardDetails(card) {
    if (!card) {
        return "";
    }

    var details =
        "Type: " +
        getCardTypeName(card);

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


function formatBoldInputCard(card) {
    return "<strong>" + escapeHTML(formatInputCard(card)) + "</strong>";
}


function formatResultCard(card) {
    return formatCardSummary(card);
}


function formatBoldResultCard(card) {
    if (!card) {
        return "";
    }

    return (
        "<strong>" +
        escapeHTML(formatCardId(card.Id) + " " + card.Name) +
        "</strong><br>" +
        escapeHTML(formatCardDetails(card))
    );
}




function formatStandardResultCard(card) {
    if (!card) {
        return "";
    }

    var html =
        "<strong>" +
        escapeHTML(formatCardId(card.Id) + " " + card.Name) +
        "</strong><br>" +
        "Type: " +
        escapeHTML(getCardTypeName(card));

    if (isMonster(card)) {
        html +=
            "<br>Guardian Stars: " +
            escapeHTML(formatGuardianStars(card)) +
            "<br>" +
            escapeHTML(card.Attack) +
            "A / " +
            escapeHTML(card.Defense) +
            "D";
    }

    return html;
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
                formatBoldInputCard(fusion.card1) +
                "<br>" +
                formatBoldInputCard(fusion.card2);

            if (fusion.result) {
                res +=
                    "<br><strong>RESULT: " +
                    escapeHTML(formatCardId(fusion.result.Id) + " " + fusion.result.Name) +
                    "</strong><br>" +
                    escapeHTML(formatCardDetails(fusion.result));
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

function getFusion(card1, card2) {

    var resultId =
        (fusionLookup[card1.Id] || {})[card2.Id];


    if (resultId) {

        return {
            result: getCardById(resultId),
            glitch: false
        };

    }


    resultId =
        (fusionLookup[card2.Id] || {})[card1.Id];


    if (resultId) {

        return {
            result: getCardById(resultId),
            glitch: false
        };

    }


    resultId =
        (glitchFusionLookup[card1.Id] || {})[card2.Id];


    if (resultId) {

        return {
            result: getCardById(resultId),
            glitch: true
        };

    }


    return null;

}


function extendFusionChain(resultCard, cards, usedIndexes, steps, chains) {

    var extended = false;


    for (var i = 0; i < cards.length; i++) {

        if (usedIndexes.indexOf(i) !== -1) {
            continue;
        }


        var nextFusion = getFusion(resultCard, cards[i]);


        if (!nextFusion || !nextFusion.result) {
            continue;
        }


        extended = true;


        var nextUsedIndexes = usedIndexes.concat(i);
        var nextSteps = steps.concat({
            card1: resultCard,
            card2: cards[i],
            result: nextFusion.result,
            glitch: nextFusion.glitch
        });


        extendFusionChain(
            nextFusion.result,
            cards,
            nextUsedIndexes,
            nextSteps,
            chains
        );

    }


    if (!extended) {
        chains.push(steps);
    }

}


function buildFusionChains(cards) {

    var chains = [];


    for (var i = 0; i < cards.length - 1; i++) {

        for (var j = i + 1; j < cards.length; j++) {

            var fusion = getFusion(cards[i], cards[j]);


            if (!fusion || !fusion.result) {
                continue;
            }


            extendFusionChain(
                fusion.result,
                cards,
                [i, j],
                [{
                    card1: cards[i],
                    card2: cards[j],
                    result: fusion.result,
                    glitch: fusion.glitch
                }],
                chains
            );

        }

    }


    return chains;

}


function canEquip(equipCard, targetCard) {

    return !!(
        equipCard &&
        targetCard &&
        equipLookup[equipCard.Id] &&
        equipLookup[equipCard.Id][targetCard.Id]
    );

}


function buildEquipTargets(cards, chains) {

    var equipCards = cards.filter(function (card) {
        return !!equipLookup[card.Id];
    });


    if (equipCards.length === 0) {
        return [];
    }


    var targets = [];
    var targetIds = {};


    cards.forEach(function (card) {

        if (!targetIds[card.Id]) {
            targetIds[card.Id] = true;
            targets.push(card);
        }

    });


    chains.forEach(function (chain) {

        chain.forEach(function (step) {

            if (step.result && !targetIds[step.result.Id]) {
                targetIds[step.result.Id] = true;
                targets.push(step.result);
            }

        });

    });


    return equipCards.map(function (equipCard) {

        return {
            equip: equipCard,
            targets: targets.filter(function (targetCard) {
                return (
                    targetCard.Id !== equipCard.Id &&
                    canEquip(equipCard, targetCard)
                );
            })
        };

    }).filter(function (entry) {
        return entry.targets.length > 0;
    });

}


function formatFusionStep(step, index) {

    var html =
        "<div class='fusion-chain-step" +
        (index === 0 ? "" : " fusion-chain-followup") +
        "' style='margin-left: " + (index * 2) + "rem;'>";


    if (step.glitch) {
        html += "<strong>Glitch Fusion</strong><br>";
    }


    html +=
        formatBoldInputCard(step.card1) +
        " + " +
        formatBoldInputCard(step.card2) +
        " = " +
        formatBoldInputCard(step.result);


    html +=
        "<br>" +
        escapeHTML(formatCardDetails(step.result));


    return html + "</div>";

}


function fusionChainsToHTML(chains) {

    return chains
        .slice()
        .sort(function (a, b) {
            var aResult = a[a.length - 1].result;
            var bResult = b[b.length - 1].result;
            return aResult.Id - bResult.Id;
        })
        .map(function (chain) {

            return (
                "<div class='result-div fusion-chain-result'>" +
                chain.map(function (step, index) {
                    return formatFusionStep(step, index);
                }).join("") +
                "</div>"
            );

        })
        .join("\n");

}


function equipsToHTML(equipEntries) {

    return equipEntries
        .slice()
        .sort(function (a, b) {
            return a.equip.Id - b.equip.Id;
        })
        .map(function (entry) {

            return (
                "<div class='result-div equip-result'>" +
                formatBoldInputCard(entry.equip) +
                entry.targets.slice().sort(function (a, b) {
                    return a.Id - b.Id;
                }).map(function (target) {
                    return (
                        "<br>Equips: " +
                        formatBoldInputCard(target)
                    );
                }).join("") +
                "</div>"
            );

        })
        .join("\n");

}


function getFieldsForCard(card) {

    if (!card || !isMonster(card)) {
        return [];
    }


    return fieldList
        .map(function (definition) {

            var fieldCard = getCardById(definition.CardId);


            if (!fieldCard) {
                return null;
            }


            if (definition.PositiveTypes.indexOf(card.Type) !== -1) {
                return {
                    card: fieldCard,
                    positive: true
                };
            }


            if (definition.NegativeTypes.indexOf(card.Type) !== -1) {
                return {
                    card: fieldCard,
                    positive: false
                };
            }


            return null;

        })
        .filter(function (entry) {
            return !!entry;
        });

}


function fieldsToHTML(cards, chains) {

    var fields = {};
    var handCardIds = {};
    var fusionDepths = {};


    cards.forEach(function (card) {

        handCardIds[card.Id] = true;

    });


    chains.forEach(function (chain) {

        chain.forEach(function (step, index) {

            if (!step.result || handCardIds[step.result.Id]) {
                return;
            }


            var depth = index + 1;


            if (
                fusionDepths[step.result.Id] === undefined ||
                depth < fusionDepths[step.result.Id]
            ) {
                fusionDepths[step.result.Id] = depth;
            }

        });

    });


    fieldList.forEach(function (definition) {

        var fieldCard = getCardById(definition.CardId);


        if (!fieldCard) {
            return;
        }


        [true, false].forEach(function (positive) {

            var affected = [];
            var seen = {};


            cards.forEach(function (card) {

                if (!isMonster(card) || seen[card.Id]) {
                    return;
                }


                var applies = positive
                    ? definition.PositiveTypes.indexOf(card.Type) !== -1
                    : definition.NegativeTypes.indexOf(card.Type) !== -1;


                if (!applies) {
                    return;
                }


                seen[card.Id] = true;
                affected.push({
                    card: card,
                    depth: 0
                });

            });


            Object.keys(fusionDepths).forEach(function (cardId) {

                var card = getCardById(Number(cardId));


                if (!card || !isMonster(card) || seen[card.Id]) {
                    return;
                }


                var applies = positive
                    ? definition.PositiveTypes.indexOf(card.Type) !== -1
                    : definition.NegativeTypes.indexOf(card.Type) !== -1;


                if (!applies) {
                    return;
                }


                seen[card.Id] = true;
                affected.push({
                    card: card,
                    depth: fusionDepths[card.Id]
                });

            });


            if (affected.length === 0) {
                return;
            }


            affected.sort(function (a, b) {
                return a.card.Id - b.card.Id;
            });


            fields[fieldCard.Id + ":" + (positive ? "positive" : "negative")] = {
                card: fieldCard,
                affected: affected,
                positive: positive
            };

        });

    });


    return Object.keys(fields)
        .map(function (fieldKey) {

            return fields[fieldKey];

        })
        .sort(function (a, b) {

            if (a.card.Id !== b.card.Id) {
                return a.card.Id - b.card.Id;
            }

            return a.positive === b.positive
                ? 0
                : a.positive ? -1 : 1;

        })
        .map(function (field) {

            var html =
                "<div class='result-div field-result'>" +
                "<div class='field-header " +
                (field.positive ? "field-positive" : "field-negative") +
                "'>" +
                "<strong>" +
                (field.positive ? "+" : "-") +
                "</strong> " +
                formatBoldInputCard(field.card) +
                "</div>";


            field.affected.forEach(function (entry) {

                html +=
                    "<div class='field-fusion-card' style='margin-left: " +
                    (entry.depth * 2) +
                    "rem;'>" +
                    formatBoldInputCard(entry.card) +
                    "</div>";

            });


            return html + "</div>";

        })
        .join("\n");

}


function findFusions() {

    var cards = handCards.filter(function (card) {
        return card !== null;
    });


    var chains = buildFusionChains(cards);
    var equipEntries = buildEquipTargets(cards, chains);


    var rituals = findRituals(cards);
    var fields = fieldsToHTML(
        cards.filter(function (card) {
            return isMonster(card);
        }),
        chains
    );


    outputLeft.innerHTML =
        "<h2 class='text-left'>Fusions:</h2>" +
        fusionChainsToHTML(chains) +
        "<h2 class='text-left'>Rituals:</h2>" +
        ritualsToHTML(rituals);


    outputRight.innerHTML =
        "<h2 class='text-left'>Equips:</h2>" +
        equipsToHTML(equipEntries) +
        "<h2 class='text-left'>Fields:</h2>" +
        fields;

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
        .slice()
        .sort(function (a, b) {
            return a.result.Id - b.result.Id;
        })
        .map(function (ritual) {

            return (
                "<div class='result-div ritual-result'>" +
                "<div><strong>Ritual:</strong> " +
                formatBoldInputCard(ritual.ritualCard) +
                "</div>" +
                "<div><strong>Material:</strong> " +
                formatBoldInputCard(ritual.card1) +
                "</div>" +
                "<div><strong>Material:</strong> " +
                formatBoldInputCard(ritual.card2) +
                "</div>" +
                "<div><strong>Material:</strong> " +
                formatBoldInputCard(ritual.card3) +
                "</div>" +
                "<div><strong>RESULT: " +
                escapeHTML(formatCardId(ritual.result.Id) + " " + ritual.result.Name) +
                "</strong><br>" +
                escapeHTML("Type: " + getCardTypeName(ritual.result)) +
                (isMonster(ritual.result)
                    ? "<br>Guardian Stars: " +
                      escapeHTML(formatGuardianStars(ritual.result)) +
                      "<br>" +
                      escapeHTML(ritual.result.Attack) +
                      "A / " +
                      escapeHTML(ritual.result.Defense) +
                      "D"
                    : "") +
                "</div>" +
                "</div>"
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

        return;

    }


    var typeLabel = cardTypes[card.Type];


    if (card.Type === 20) {
        typeLabel = fieldCardIds[card.Id]
            ? "Magic (Field)"
            : "Magic (Effect)";
    }


    info.textContent = "Type: " + typeLabel;

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


    input.addEventListener("input", function () {

        if (input.value.trim() === "") {
            handCards[slotIndex] = null;
            updateCardInfo(input, info);
            findFusions();
        }

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
