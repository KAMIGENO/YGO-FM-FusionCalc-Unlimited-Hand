/*
 * Equip Statistics
 *
 * Shows every Equip card ranked by the number of
 * different monster cards it can be used with.
 *
 * Ranking uses competition ranking:
 *
 * Rank 1
 * Rank 2
 * Rank 3--6
 * Rank 3--6
 * Rank 3--6
 * Rank 3--6
 * Rank 7
 *
 * Ties therefore occupy all of the positions in the tie,
 * and the next rank skips those positions.
 */

(function () {

    "use strict";


    var cardById = {};
    var statistics = [];


    var sortSelect = document.getElementById("equip-sort");
    var filterInput = document.getElementById("equip-filter");
    var tableBody = document.getElementById("equip-stats-body");

    var detailsSection = document.getElementById("equip-details-section");
    var detailsTitle = document.getElementById("equip-details-title");
    var detailsContainer = document.getElementById("equip-details");


    /*
     * ------------------------------------------------------------
     * BUILD CARD LOOKUP
     * ------------------------------------------------------------
     */

    card_db().get().forEach(function (card) {

        cardById[card.Id] = card;

    });


    /*
     * ------------------------------------------------------------
     * CHECK IF CARD IS A MONSTER
     * ------------------------------------------------------------
     */

    function isMonster(card) {

        return card && card.Type < 20;

    }


    /*
     * ------------------------------------------------------------
     * BUILD EQUIP STATISTICS
     * ------------------------------------------------------------
     *
     * equipsList contains both directions of the Equip relationship.
     *
     * For an Equip card:
     *
     *     equipsList[equipId]
     *
     * contains the cards that the Equip can be used with.
     *
     * We only count monster cards.
     *
     * A monster is counted only once, even if duplicate data
     * somehow exists.
     */

    card_db().get().forEach(function (card) {

        /*
         * Type 23 is Equip in types_and_stars.js.
         *
         * We use cardTypes here instead of hard-coding the type
         * number so this remains consistent with the project's
         * existing card type definitions.
         */

        if (cardTypes[card.Type] !== "Equip") {
            return;
        }


        var partnerIds = [];
        var seen = {};


        var equipList = equipsList[card.Id] || [];


        equipList.forEach(function (targetId) {

            var targetCard = cardById[targetId];


            /*
             * Only count actual monster cards.
             */

            if (!isMonster(targetCard)) {
                return;
            }


            /*
             * Make sure each monster is counted only once.
             */

            if (seen[targetId]) {
                return;
            }


            seen[targetId] = true;

            partnerIds.push(targetId);

        });


        statistics.push({

            card: card,

            partnerIds: partnerIds,

            count: partnerIds.length

        });

    });


    /*
     * ------------------------------------------------------------
     * SORTING
     * ------------------------------------------------------------
     */

    function sortStatistics(results) {

        var sortMode = sortSelect.value;


        results.sort(function (a, b) {

            if (sortMode === "count-desc") {

                if (b.count !== a.count) {
                    return b.count - a.count;
                }

                return a.card.Name.localeCompare(b.card.Name);

            }


            if (sortMode === "count-asc") {

                if (a.count !== b.count) {
                    return a.count - b.count;
                }

                return a.card.Name.localeCompare(b.card.Name);

            }


            if (sortMode === "name-asc") {

                return a.card.Name.localeCompare(b.card.Name);

            }


            if (sortMode === "name-desc") {

                return b.card.Name.localeCompare(a.card.Name);

            }


            return 0;

        });

    }


    /*
     * ------------------------------------------------------------
     * COMPETITION RANKING
     * ------------------------------------------------------------
     *
     * Example:
     *
     * 100
     * 90
     * 80
     * 80
     * 80
     * 70
     *
     * becomes:
     *
     * Rank 1
     * Rank 2
     * Rank 3--5
     * Rank 3--5
     * Rank 3--5
     * Rank 6
     */

    function getRankLabels(results) {

        var rankLabels = new Array(results.length);

        var i = 0;


        while (i < results.length) {

            var count = results[i].count;

            var startRank = i + 1;

            var j = i + 1;


            /*
             * Find the end of this group of tied cards.
             */

            while (
                j < results.length &&
                results[j].count === count
            ) {

                j++;

            }


            /*
             * j is one position past the final tied card.
             *
             * Therefore j is also the final rank occupied
             * by this group.
             */

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


            /*
             * Give every tied card the same rank label.
             */

            for (var k = i; k < j; k++) {

                rankLabels[k] = label;

            }


            i = j;

        }


        return rankLabels;

    }


    /*
     * ------------------------------------------------------------
     * FILTERING
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
     * RENDER MAIN TABLE
     * ------------------------------------------------------------
     */

    function renderStatistics() {

        var results = getFilteredStatistics();


        sortStatistics(results);


        /*
         * Calculate ranks AFTER sorting.
         */

        var rankLabels = getRankLabels(results);


        tableBody.innerHTML = "";


        results.forEach(function (entry, index) {

    var row = document.createElement("tr");

    row.className = "equip-stats-row";

    row.dataset.cardId = entry.card.Id;

    // ...

    tableBody.appendChild(row);

});

var lastRow = tableBody.lastElementChild;

if (lastRow) {
    lastRow.classList.add("equip-stats-bottom-row");
}

row.dataset.cardId = entry.card.Id;


            /*
             * Rank
             */

            var rankCell = document.createElement("td");

            rankCell.textContent = rankLabels[index];


            /*
             * Equip card name
             */

            var nameCell = document.createElement("td");

            nameCell.textContent = entry.card.Name;


            /*
             * Number of compatible monsters
             */

            var countCell = document.createElement("td");

            countCell.textContent = entry.count;


            row.appendChild(rankCell);
            row.appendChild(nameCell);
            row.appendChild(countCell);


            tableBody.appendChild(row);

        });

    }


    /*
     * ------------------------------------------------------------
     * RENDER EQUIP DETAILS
     * ------------------------------------------------------------
     *
     * Clicking an Equip card shows every monster that
     * the Equip can be used with.
     */

    function showEquipDetails(cardId) {

        var entry = statistics.find(function (item) {

            return String(item.card.Id) === String(cardId);

        });


        if (!entry) {
            return;
        }


        detailsTitle.textContent =
            entry.card.Name +
            " — " +
            entry.count +
            " Compatible Monsters";


        detailsContainer.innerHTML = "";


        /*
         * Create the details table.
         */

        var table = document.createElement("table");

        table.className =
            "table table-striped table-bordered";


        /*
         * Table header.
         */

        var thead = document.createElement("thead");

        var headerRow = document.createElement("tr");


        var monsterHeader = document.createElement("th");

        monsterHeader.textContent =
            "Compatible Monster";


        headerRow.appendChild(monsterHeader);

        thead.appendChild(headerRow);

        table.appendChild(thead);


        /*
         * Table body.
         */

        var tbody = document.createElement("tbody");


        /*
         * Sort the monsters alphabetically
         * for the detail view.
         */

        var monsterIds = entry.partnerIds.slice();


        monsterIds.sort(function (a, b) {

            var cardA = cardById[a];
            var cardB = cardById[b];


            return cardA.Name.localeCompare(cardB.Name);

        });


        monsterIds.forEach(function (monsterId) {

            var monsterCard = cardById[monsterId];


            if (!monsterCard) {
                return;
            }


            var row = document.createElement("tr");

            var monsterCell = document.createElement("td");


            monsterCell.textContent =
                monsterCard.Name;


            row.appendChild(monsterCell);

            tbody.appendChild(row);

        });


        table.appendChild(tbody);

        detailsContainer.appendChild(table);


        /*
         * Show the details section.
         */

        detailsSection.style.display = "";


        /*
         * Scroll to the details.
         */

        detailsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }


    /*
     * ------------------------------------------------------------
     * TABLE CLICK HANDLER
     * ------------------------------------------------------------
     */

    tableBody.addEventListener("click", function (event) {

        var row = event.target.closest(".equip-stats-row");


        if (!row) {
            return;
        }


        showEquipDetails(row.dataset.cardId);

    });


    /*
     * ------------------------------------------------------------
     * CONTROLS
     * ------------------------------------------------------------
     */

    sortSelect.addEventListener("change", function () {

        renderStatistics();

    });


    filterInput.addEventListener("input", function () {

        renderStatistics();

    });


    /*
     * ------------------------------------------------------------
     * INITIAL RENDER
     * ------------------------------------------------------------
     */

    renderStatistics();

})();
