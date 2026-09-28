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


    function getMonsterCards() {

        return allCards.filter(function (card) {

            return isMonster(card);

        });

    }


    function getCardsForTypes(typeIds) {

        return getMonsterCards()
            .filter(function (card) {

                return typeIds.indexOf(card.Type) !== -1;

            })
            .sort(function (a, b) {

                return a.Name.localeCompare(b.Name);

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


        var neutralCards = getMonsterCards()
            .filter(function (card) {

                return !positiveIds[card.Id] && !negativeIds[card.Id];

            })
            .sort(function (a, b) {

                return a.Name.localeCompare(b.Name);

            });


        statistics.push({
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
        });

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
                label = "Rank " + startRank + "--" + endRank;
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

    function getEffect(entry, monsterCard) {

        if (entry.positiveCards.some(function (card) {
            return card.Id === monsterCard.Id;
        })) {
            return {
                label: "Positive",
                change: "+500 ATK/DEF"
            };
        }


        if (entry.negativeCards.some(function (card) {
            return card.Id === monsterCard.Id;
        })) {
            return {
                label: "Negative",
                change: "-500 ATK/DEF"
            };
        }


        return {
            label: "Neutral",
            change: "No ATK/DEF change"
        };

    }


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
            typeCell.textContent = getTypeName(card.Type);

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


    function createFieldDetails(entry) {

        var wrapper = document.createElement("div");
        wrapper.className = "mt-3";


        var description = document.createElement("p");
        description.className = "text-center";
        description.textContent =
            "Positive: " + entry.positiveCount +
            " | Neutral: " + entry.neutralCount +
            " | Negative: " + entry.negativeCount;
        wrapper.appendChild(description);


        if (entry.positiveCards.length) {
            wrapper.appendChild(
                createEffectTable(
                    "Positive Card Effects",
                    entry.positiveCards,
                    "+500 ATK/DEF"
                )
            );

            wrapper.appendChild(
                createTypeGroupTable(
                    "Positive Monster Type Groups",
                    entry.positiveGroups,
                    "+500 ATK/DEF"
                )
            );
        }


        wrapper.appendChild(
            createEffectTable(
                "Neutral Card Effects",
                entry.neutralCards,
                "No ATK/DEF change"
            )
        );

        wrapper.appendChild(
            createTypeGroupTable(
                "Neutral Monster Type Groups",
                entry.neutralGroups,
                "No ATK/DEF change"
            )
        );


        if (entry.negativeCards.length) {
            wrapper.appendChild(
                createEffectTable(
                    "Negative Card Effects",
                    entry.negativeCards,
                    "-500 ATK/DEF"
                )
            );

            wrapper.appendChild(
                createTypeGroupTable(
                    "Negative Monster Type Groups",
                    entry.negativeGroups,
                    "-500 ATK/DEF"
                )
            );
        }


        return wrapper;

    }


    /*
     * ------------------------------------------------------------
     * 6. RENDER EXPANDABLE FIELD LIST
     * ------------------------------------------------------------
     */

    function renderFields() {

        var results = statistics.slice();

        sortStatistics(results);

        fieldListContainer.innerHTML = "";


        results.forEach(function (entry) {

            var details = document.createElement("details");
            details.className = "mb-3 border rounded bg-white p-2";


            var summary = document.createElement("summary");
            summary.className = "font-weight-bold p-2";
            summary.style.cursor = "pointer";

            var positiveRank = positiveRankLabels[entry.card.Id] || "—";
            var neutralRank = neutralRankLabels[entry.card.Id] || "—";
            var negativeRank = negativeRankLabels[entry.card.Id] || "—";

            summary.textContent =
                entry.card.Name +
                " — + " + entry.positiveCount +
                " / ± " + entry.neutralCount +
                " / - " + entry.negativeCount +
                " | POSITIVE " + positiveRank.replace("Rank ", "Rank: ") +
                " / NEUTRAL " + neutralRank.replace("Rank ", "Rank: ") +
                " / NEGATIVE " + negativeRank.replace("Rank ", "Rank: ");

            details.appendChild(summary);
            details.appendChild(createFieldDetails(entry));

            fieldListContainer.appendChild(details);

        });


        var blankRow = document.createElement("div");
        blankRow.style.height = "20px";
        fieldListContainer.appendChild(blankRow);

    }


    /*
     * ------------------------------------------------------------
     * 7. MONSTER SEARCH
     * ------------------------------------------------------------
     */

    function getFilteredMonsters() {

        var searchText = monsterFilterInput.value
            .trim()
            .toLowerCase();


        if (!searchText) {
            return [];
        }


        return getMonsterCards()
            .filter(function (card) {

                return card.Name
                    .toLowerCase()
                    .indexOf(searchText) !== -1;

            })
            .sort(function (a, b) {

                return a.Name.localeCompare(b.Name);

            });

    }


    function renderMonsterSearch() {

        var monsters = getFilteredMonsters();

        monsterSearchBody.innerHTML = "";


        if (!monsterFilterInput.value.trim()) {

            var emptySearchRow = document.createElement("tr");
            var emptySearchCell = document.createElement("td");

            emptySearchCell.colSpan = 5;
            emptySearchCell.className = "text-center";
            emptySearchCell.textContent = "Type a monster name to search.";

            emptySearchRow.appendChild(emptySearchCell);
            monsterSearchBody.appendChild(emptySearchRow);

            return;

        }


        if (!monsters.length) {

            var noResultsRow = document.createElement("tr");
            var noResultsCell = document.createElement("td");

            noResultsCell.colSpan = 5;
            noResultsCell.className = "text-center";
            noResultsCell.textContent = "No monster cards found.";

            noResultsRow.appendChild(noResultsCell);
            monsterSearchBody.appendChild(noResultsRow);

            return;

        }


        monsters.forEach(function (monsterCard) {

            statistics.forEach(function (entry) {

                var effect = getEffect(entry, monsterCard);
                var row = document.createElement("tr");

                var nameCell = document.createElement("td");
                nameCell.textContent = monsterCard.Name;

                var typeCell = document.createElement("td");
                typeCell.textContent = getTypeName(monsterCard.Type);

                var fieldCell = document.createElement("td");
                fieldCell.textContent = entry.card.Name;

                var effectCell = document.createElement("td");
                effectCell.textContent = effect.label;

                var changeCell = document.createElement("td");
                changeCell.textContent = effect.change;

                row.appendChild(nameCell);
                row.appendChild(typeCell);
                row.appendChild(fieldCell);
                row.appendChild(effectCell);
                row.appendChild(changeCell);

                monsterSearchBody.appendChild(row);

            });

        });

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
