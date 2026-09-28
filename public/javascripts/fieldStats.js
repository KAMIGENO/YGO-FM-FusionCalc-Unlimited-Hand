/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/fieldStats.js
 * ------------------------------------------------------------
 *
 * Shows the six Field cards that change monster power in
 * Yu-Gi-Oh! Forbidden Memories.
 *
 * Each affected monster card receives the standard Field
 * modifier of +500 or -500 ATK/DEF.
 *
 * The page keeps two levels of detail:
 * 1. Individual monster cards by name.
 * 2. Aggregated monster-type groups.
 *
 * Ranks are GLOBAL. Filtering changes which rows are visible,
 * but it does not recalculate a Field's rank from the filtered
 * subset.
 */

(function () {

    "use strict";


    var cardById = {};
    var statistics = [];
    var positiveRankLabels = {};
    var negativeRankLabels = {};


    var sortSelect = document.getElementById("field-sort");
    var filterInput = document.getElementById("field-filter");
    var tableBody = document.getElementById("field-stats-body");

    var detailsSection = document.getElementById("field-details-section");
    var detailsTitle = document.getElementById("field-details-title");
    var detailsContainer = document.getElementById("field-details");


    /*
     * ------------------------------------------------------------
     * 1. CARD LOOKUP
     * ------------------------------------------------------------
     */

    card_db().get().forEach(function (card) {

        cardById[card.Id] = card;

    });


    /*
     * ------------------------------------------------------------
     * 2. FIELD EFFECT DEFINITIONS
     *
     * The card IDs and monster Type IDs come directly from the
     * project's Cards.json / types_and_stars.js data.
     *
     * The six Field cards that modify monster power are:
     * Forest, Wasteland, Mountain, Sogen, Umi, and Yami.
     * ------------------------------------------------------------
     */

    var fieldDefinitions = [

        {
            cardId: 330,
            positiveTypes: [4, 9, 19, 5],
            negativeTypes: []
        },

        {
            cardId: 331,
            positiveTypes: [2, 10, 18],
            negativeTypes: []
        },

        {
            cardId: 332,
            positiveTypes: [0, 6, 15],
            negativeTypes: []
        },

        {
            cardId: 333,
            positiveTypes: [3, 4],
            negativeTypes: []
        },

        {
            cardId: 334,
            positiveTypes: [16, 15],
            negativeTypes: [14, 17]
        },

        {
            cardId: 335,
            positiveTypes: [1, 7],
            negativeTypes: [8]
        }

    ];


    function isMonster(card) {

        return !!card && card.Type < 20;

    }


    function getCardsForTypes(typeIds) {

        return card_db().get().filter(function (card) {

            return isMonster(card) && typeIds.indexOf(card.Type) !== -1;

        }).sort(function (a, b) {

            return a.Name.localeCompare(b.Name);

        });

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
                    typeName: cardTypes[typeId] || "Unknown",
                    cards: groups[typeId].sort(function (a, b) {
                        return a.Name.localeCompare(b.Name);
                    })
                };

            })
            .sort(function (a, b) {
                return a.typeName.localeCompare(b.typeName);
            });

    }


    /*
     * ------------------------------------------------------------
     * 3. BUILD FIELD STATISTICS
     * ------------------------------------------------------------
     */

    fieldDefinitions.forEach(function (definition) {

        var fieldCard = cardById[definition.cardId];


        if (!fieldCard) {
            return;
        }


        var positiveCards = getCardsForTypes(definition.positiveTypes);
        var negativeCards = getCardsForTypes(definition.negativeTypes);


        statistics.push({
            card: fieldCard,
            positiveCards: positiveCards,
            negativeCards: negativeCards,
            positiveCount: positiveCards.length,
            negativeCount: negativeCards.length,
            totalCount: positiveCards.length + negativeCards.length,
            positiveGroups: buildTypeGroups(positiveCards),
            negativeGroups: buildTypeGroups(negativeCards)
        });

    });


    /*
     * ------------------------------------------------------------
     * 4. CALCULATE GLOBAL RANKS
     * ------------------------------------------------------------
     */

    function calculateRankLabels(propertyName, destination) {

        var rankedResults = statistics.filter(function (entry) {

            return entry[propertyName] > 0;

        });


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
                label =
                    "Rank " +
                    startRank +
                    "--" +
                    endRank;
            }


            for (var k = i; k < j; k++) {
                destination[rankedResults[k].card.Id] = label;
            }


            i = j;

        }

    }


    calculateRankLabels("positiveCount", positiveRankLabels);
    calculateRankLabels("negativeCount", negativeRankLabels);


    /*
     * ------------------------------------------------------------
     * 5. SORTING
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


            if (sortType === "total-desc") {

                if (b.totalCount !== a.totalCount) {
                    return b.totalCount - a.totalCount;
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
     * 6. FILTERING
     * ------------------------------------------------------------
     */

    function getFilteredStatistics() {

        var searchText = filterInput.value
            .trim()
            .toLowerCase();


        if (!searchText) {
            return statistics.slice();
        }


        return statistics.filter(function (entry) {

            return entry.card.Name
                .toLowerCase()
                .indexOf(searchText) !== -1;

        });

    }


    /*
     * ------------------------------------------------------------
     * 7. RENDER MAIN TABLE
     * ------------------------------------------------------------
     */

    function renderStatistics() {

        var results = getFilteredStatistics();

        sortStatistics(results);

        tableBody.innerHTML = "";


        results.forEach(function (entry) {

            var row = document.createElement("tr");

            row.className = "field-stats-row";
            row.dataset.cardId = entry.card.Id;
            row.style.cursor = "pointer";


            var positiveRankCell = document.createElement("td");
            positiveRankCell.textContent = positiveRankLabels[entry.card.Id];


            var nameCell = document.createElement("td");
            nameCell.textContent = entry.card.Name;


            var positiveCountCell = document.createElement("td");
            positiveCountCell.textContent = entry.positiveCount;


            var negativeCountCell = document.createElement("td");
            negativeCountCell.textContent = entry.negativeCount;


            var negativeRankCell = document.createElement("td");
            negativeRankCell.textContent =
                entry.negativeCount > 0
                    ? negativeRankLabels[entry.card.Id]
                    : "—";


            row.appendChild(positiveRankCell);
            row.appendChild(nameCell);
            row.appendChild(positiveCountCell);
            row.appendChild(negativeCountCell);
            row.appendChild(negativeRankCell);

            tableBody.appendChild(row);

        });


        /*
         * Add a blank row at the bottom, matching the other
         * statistics pages.
         */

        var blankRow = document.createElement("tr");

        blankRow.className = "field-stats-blank-row";
        blankRow.style.backgroundColor = "#F8F9FA";


        for (var blankCellIndex = 0; blankCellIndex < 5; blankCellIndex++) {

            var blankCell = document.createElement("td");

            blankCell.innerHTML = "&nbsp;";
            blankRow.appendChild(blankCell);

        }


        tableBody.appendChild(blankRow);

    }


    /*
     * ------------------------------------------------------------
     * 8. DETAIL HELPERS
     * ------------------------------------------------------------
     */

    function createEffectTable(title, cards, effectText) {

        var wrapper = document.createElement("div");
        wrapper.className = "mb-5";


        var heading = document.createElement("h4");
        heading.className = "text-main my-4";
        heading.textContent = title;
        wrapper.appendChild(heading);


        var table = document.createElement("table");
        table.className = "table table-striped table-bordered";


        var thead = document.createElement("thead");
        var headerRow = document.createElement("tr");

        ["Monster Card", "Monster Type", "Effect"].forEach(function (text) {

            var th = document.createElement("th");
            th.textContent = text;
            headerRow.appendChild(th);

        });

        thead.appendChild(headerRow);
        table.appendChild(thead);


        var tbody = document.createElement("tbody");


        cards.forEach(function (card) {

            var row = document.createElement("tr");

            var nameCell = document.createElement("td");
            nameCell.textContent = card.Name;

            var typeCell = document.createElement("td");
            typeCell.textContent = cardTypes[card.Type] || "Unknown";

            var effectCell = document.createElement("td");
            effectCell.textContent = effectText;

            row.appendChild(nameCell);
            row.appendChild(typeCell);
            row.appendChild(effectCell);
            tbody.appendChild(row);

        });


        table.appendChild(tbody);
        wrapper.appendChild(table);


        return wrapper;

    }


    function createTypeGroupTable(title, groups, effectText) {

        var wrapper = document.createElement("div");
        wrapper.className = "mb-5";


        var heading = document.createElement("h4");
        heading.className = "text-main my-4";
        heading.textContent = title;
        wrapper.appendChild(heading);


        var table = document.createElement("table");
        table.className = "table table-striped table-bordered";


        var thead = document.createElement("thead");
        var headerRow = document.createElement("tr");

        ["Monster Type", "Cards Affected", "Effect", "Affected Cards"].forEach(function (text) {

            var th = document.createElement("th");
            th.textContent = text;
            headerRow.appendChild(th);

        });

        thead.appendChild(headerRow);
        table.appendChild(thead);


        var tbody = document.createElement("tbody");


        groups.forEach(function (group) {

            var row = document.createElement("tr");

            var typeCell = document.createElement("td");
            typeCell.textContent = group.typeName;

            var countCell = document.createElement("td");
            countCell.textContent = group.cards.length;

            var effectCell = document.createElement("td");
            effectCell.textContent = effectText;

            var cardsCell = document.createElement("td");
            cardsCell.textContent = group.cards
                .map(function (card) {
                    return card.Name;
                })
                .join(", ");

            row.appendChild(typeCell);
            row.appendChild(countCell);
            row.appendChild(effectCell);
            row.appendChild(cardsCell);
            tbody.appendChild(row);

        });


        table.appendChild(tbody);
        wrapper.appendChild(table);


        return wrapper;

    }


    /*
     * ------------------------------------------------------------
     * 9. RENDER FIELD DETAILS
     * ------------------------------------------------------------
     */

    function showFieldDetails(cardId) {

        var entry = statistics.find(function (item) {

            return String(item.card.Id) === String(cardId);

        });


        if (!entry) {
            return;
        }


        detailsTitle.textContent =
            entry.card.Name +
            " — " +
            entry.positiveCount +
            " Positive / " +
            entry.negativeCount +
            " Negative";


        detailsContainer.innerHTML = "";


        var summary = document.createElement("p");
        summary.className = "text-center";
        summary.textContent =
            "Clicking a Field row shows every affected monster card by name " +
            "and the same cards grouped by monster Type.";
        detailsContainer.appendChild(summary);


        if (entry.positiveCards.length) {
            detailsContainer.appendChild(
                createEffectTable(
                    "Positive Card Effects",
                    entry.positiveCards,
                    "+500 ATK/DEF"
                )
            );

            detailsContainer.appendChild(
                createTypeGroupTable(
                    "Positive Monster Type Groups",
                    entry.positiveGroups,
                    "+500 ATK/DEF"
                )
            );
        }


        if (entry.negativeCards.length) {
            detailsContainer.appendChild(
                createEffectTable(
                    "Negative Card Effects",
                    entry.negativeCards,
                    "-500 ATK/DEF"
                )
            );

            detailsContainer.appendChild(
                createTypeGroupTable(
                    "Negative Monster Type Groups",
                    entry.negativeGroups,
                    "-500 ATK/DEF"
                )
            );
        }


        detailsSection.style.display = "block";

        detailsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }


    /*
     * ------------------------------------------------------------
     * 10. EVENTS
     * ------------------------------------------------------------
     */

    sortSelect.addEventListener("change", renderStatistics);
    filterInput.addEventListener("input", renderStatistics);


    tableBody.addEventListener("click", function (event) {

        var row = event.target.closest("tr.field-stats-row");

        if (!row) {
            return;
        }

        showFieldDetails(row.dataset.cardId);

    });


    renderStatistics();

})();
