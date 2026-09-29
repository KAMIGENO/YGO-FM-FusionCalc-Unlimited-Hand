/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/fieldStats.js
 * ------------------------------------------------------------
 *
 * Field Statistics
 *
 * Shows all Field cards as expandable sections and provides a
 * reverse lookup that starts with a monster card and shows how
 * every Field affects it.
 *
 * Field identity/effect definitions live in data/fields.js.
 * The main card database still classifies these cards as Magic
 * (Type 20); fieldList provides the additional Field designation.
 * ------------------------------------------------------------
 */

(function () {

    "use strict";


    var cardById = {};
    var statistics = [];
    var fieldEffectsByCardId = {};


    var sortSelect = document.getElementById("field-sort");
    var fieldListContainer = document.getElementById("field-list");
    var monsterFilterInput = document.getElementById("monster-filter");
    var monsterSearchBody = document.getElementById("monster-field-search-body");


    /*
     * ------------------------------------------------------------
     * 1. CARD LOOKUP
     * ------------------------------------------------------------
     */

    var allCards = card_db().get();


    allCards.forEach(function (card) {

        cardById[card.Id] = card;

    });


    function isMonster(card) {

        return !!card && card.Type < 20;

    }


    var monsterCards = allCards.filter(function (card) {

        return isMonster(card);

    });

    var monsterCardsByName = monsterCards.slice().sort(function (a, b) {

        return a.Name.localeCompare(b.Name);

    });


    function getCardsForTypes(typeIds) {

        return monsterCardsByName.filter(function (card) {

            return typeIds.indexOf(card.Type) !== -1;

        });

    }


    function getTypeName(typeId) {

        if (cardTypes[typeId] === "Spellcaster") {
            return "Magic-User (Spellcaster)";
        }

        return cardTypes[typeId] || "Unknown";

    }


    function buildTypeGroups(cards) {

        var groups = {};


        cards.forEach(function (card) {

            if (!groups[card.Type]) {
                groups[card.Type] = [];
            }

            groups[card.Type].push(card);

        });


        return Object.keys(groups)
            .map(function (typeId) {

                return {
                    typeId: Number(typeId),
                    typeName: getTypeName(Number(typeId)),
                    cards: groups[typeId]
                };

            })
            .sort(function (a, b) {
                return a.typeName.localeCompare(b.typeName);
            });

    }


    /*
     * ------------------------------------------------------------
     * 2. BUILD FIELD STATISTICS FROM data/fields.js
     * ------------------------------------------------------------
     */

    fieldList.forEach(function (definition) {

        var fieldCard = cardById[definition.CardId];


        if (!fieldCard) {
            return;
        }


        /*
         * A Field card must remain a Magic card in the main card
         * database. fieldList is the additional designation that
         * identifies it as a Field card.
         */

        if (fieldCard.Type !== 20) {
            return;
        }


        var positiveCards = getCardsForTypes(definition.PositiveTypes);
        var negativeCards = getCardsForTypes(definition.NegativeTypes);
        var positiveIds = {};
        var negativeIds = {};


        positiveCards.forEach(function (card) {
            positiveIds[card.Id] = true;
        });


        negativeCards.forEach(function (card) {
            negativeIds[card.Id] = true;
        });


        var neutralCards = monsterCardsByName
            .filter(function (card) {

                return !positiveIds[card.Id] && !negativeIds[card.Id];

            })
            .sort(function (a, b) {

                return a.Name.localeCompare(b.Name);

            });


        var statistic = {
            card: fieldCard,
            positiveCards: positiveCards,
            neutralCards: neutralCards,
            negativeCards: negativeCards,
            positiveCount: positiveCards.length,
            neutralCount: neutralCards.length,
            negativeCount: negativeCards.length,
            nonNeutralCount: positiveCards.length + negativeCards.length,
            positiveGroups: buildTypeGroups(positiveCards),
            neutralGroups: buildTypeGroups(neutralCards),
            negativeGroups: buildTypeGroups(negativeCards)
        };

        positiveCards.forEach(function (card) {

            if (!fieldEffectsByCardId[card.Id]) {
                fieldEffectsByCardId[card.Id] = {
                    positive: [],
                    negative: []
                };
            }

            fieldEffectsByCardId[card.Id].positive.push(fieldCard.Name);

        });

        negativeCards.forEach(function (card) {

            if (!fieldEffectsByCardId[card.Id]) {
                fieldEffectsByCardId[card.Id] = {
                    positive: [],
                    negative: []
                };
            }

            fieldEffectsByCardId[card.Id].negative.push(fieldCard.Name);

        });

        statistics.push(statistic);

    });


    /*
     * ------------------------------------------------------------
     * 3. RANK LABELS
     * ------------------------------------------------------------
     */

    var positiveRankLabels = {};
    var neutralRankLabels = {};
    var negativeRankLabels = {};


    function calculateRankLabels(propertyName, destination) {

        var rankedResults = statistics.slice();


        rankedResults.sort(function (a, b) {

            if (b[propertyName] !== a[propertyName]) {
                return b[propertyName] - a[propertyName];
            }

            return a.card.Name.localeCompare(b.card.Name);

        });


        var i = 0;


        while (i < rankedResults.length) {

            var count = rankedResults[i][propertyName];
            var startRank = i + 1;
            var j = i + 1;


            while (
                j < rankedResults.length &&
                rankedResults[j][propertyName] === count
            ) {

                j++;

            }


            var endRank = j;
            var label;


            if (startRank === endRank) {
                label = "Rank " + startRank;
            } else {
                label = "Rank " + startRank + "–" + endRank;
            }


            for (var k = i; k < j; k++) {
                destination[rankedResults[k].card.Id] = label;
            }


            i = j;

        }

    }


    calculateRankLabels("positiveCount", positiveRankLabels);
    calculateRankLabels("neutralCount", neutralRankLabels);
    calculateRankLabels("negativeCount", negativeRankLabels);


    /*
     * ------------------------------------------------------------
     * 4. SORTING
     * ------------------------------------------------------------
     */

    function sortStatistics(results) {

        var sortType = sortSelect.value;


        results.sort(function (a, b) {

            if (sortType === "positive-desc") {

                if (b.positiveCount !== a.positiveCount) {
                    return b.positiveCount - a.positiveCount;
                }

                return a.card.Name.localeCompare(b.card.Name);

            }


            if (sortType === "negative-desc") {

                if (b.negativeCount !== a.negativeCount) {
                    return b.negativeCount - a.negativeCount;
                }

                return a.card.Name.localeCompare(b.card.Name);

            }


            if (sortType === "non-neutral-desc") {

                if (b.nonNeutralCount !== a.nonNeutralCount) {
                    return b.nonNeutralCount - a.nonNeutralCount;
                }

                return a.card.Name.localeCompare(b.card.Name);

            }


            if (sortType === "name-desc") {
                return b.card.Name.localeCompare(a.card.Name);
            }


            return a.card.Name.localeCompare(b.card.Name);

        });

    }


    /*
     * ------------------------------------------------------------
     * 5. EFFECT HELPERS
     * ------------------------------------------------------------
     */

    function getGuardianStarName(starId) {

        if (starId == null) {
            return "-";
        }


        return starNames[starId - 1] || "-";

    }


    function createFieldEffectCell(card) {

        var cell = document.createElement("td");
        var effects = fieldEffectsByCardId[card.Id];


        if (!effects) {
            cell.textContent = "-";
            return cell;
        }


        effects.positive.forEach(function (fieldName) {

            var positive = document.createElement("div");
            var positiveSign = document.createElement("span");

            positiveSign.className = "text-success font-weight-bold";
            positiveSign.textContent = "+";

            positive.appendChild(positiveSign);
            positive.appendChild(document.createTextNode(" " + fieldName));
            cell.appendChild(positive);

        });


        effects.negative.forEach(function (fieldName) {

            var negative = document.createElement("div");
            var negativeSign = document.createElement("span");

            negativeSign.className = "text-danger font-weight-bold";
            negativeSign.textContent = "-";

            negative.appendChild(negativeSign);
            negative.appendChild(document.createTextNode(" " + fieldName));
            cell.appendChild(negative);

        });


        if (!effects.positive.length && !effects.negative.length) {
            cell.textContent = "-";
        }


        return cell;

    }


    function createCardDataCell(card, value) {

        var cell = document.createElement("td");
        cell.textContent = value;
        return cell;

    }


    function getFilteredCards() {

        var searchText = monsterFilterInput.value
            .trim()
            .toLowerCase();


        if (!searchText) {
            return [];
        }


        return allCards
            .filter(function (card) {

                return card.Name
                    .toLowerCase()
                    .indexOf(searchText) !== -1;

            })
            .sort(function (a, b) {

                return a.Name.localeCompare(b.Name);

            });

    }


    /*
     * ------------------------------------------------------------
     * 7. CARD SEARCH
     * ------------------------------------------------------------
     */

    function renderMonsterSearch() {

        var cards = getFilteredCards();

        monsterSearchBody.innerHTML = "";


        if (!monsterFilterInput.value.trim()) {

            var emptySearchRow = document.createElement("tr");
            var emptySearchCell = document.createElement("td");

            emptySearchCell.colSpan = 7;
            emptySearchCell.className = "text-center";
            emptySearchCell.textContent = "Type a card name to search.";

            emptySearchRow.appendChild(emptySearchCell);
            monsterSearchBody.appendChild(emptySearchRow);

            return;

        }


        if (!cards.length) {

            var noResultsRow = document.createElement("tr");
            var noResultsCell = document.createElement("td");

            noResultsCell.colSpan = 7;
            noResultsCell.className = "text-center";
            noResultsCell.textContent = "No cards found.";

            noResultsRow.appendChild(noResultsCell);
            monsterSearchBody.appendChild(noResultsRow);

            return;

        }


        var fragment = document.createDocumentFragment();


        cards.forEach(function (card) {

            var row = document.createElement("tr");
            var monster = isMonster(card);

            row.appendChild(createCardDataCell(card, card.Id));
            row.appendChild(createCardDataCell(card, card.Name));
            row.appendChild(createCardDataCell(card, getTypeName(card.Type)));
            row.appendChild(createCardDataCell(
                card,
                monster ? getGuardianStarName(card.GuardianStarA) : "-"
            ));
            row.appendChild(createCardDataCell(
                card,
                monster ? getGuardianStarName(card.GuardianStarB) : "-"
            ));

            var attack = monster && card.Attack != null ? card.Attack : "-";
            var defense = monster && card.Defense != null ? card.Defense : "-";
            row.appendChild(createCardDataCell(
                card,
                attack + "A / " + defense + "D"
            ));

            row.appendChild(monster ? createFieldEffectCell(card) : createCardDataCell(card, "-"));

            fragment.appendChild(row);

        });


        monsterSearchBody.appendChild(fragment);

    }


    /*
     * ------------------------------------------------------------
     * 8. EVENTS
     * ------------------------------------------------------------
     */

    sortSelect.addEventListener("change", renderFields);
    monsterFilterInput.addEventListener("input", renderMonsterSearch);


    renderFields();
    renderMonsterSearch();

})();
