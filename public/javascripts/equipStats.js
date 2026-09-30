/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/equipStats.js
 * ------------------------------------------------------------
 *
 * Shows every Equip card ranked by the number of unique
 * monster cards it can be used with.
 *
 * Ranks are GLOBAL. Filtering changes which rows are visible,
 * but it does not recalculate a card's rank from the filtered
 * subset.
 */


/*
 * ------------------------------------------------------------
 * 1. INITIALIZATION
 * ------------------------------------------------------------
 */

(function () {

    "use strict";


    var cardById = {};
    var statistics = [];
    var statisticsById = {};
    var globalRankLabels = {};


    var sortSelect = document.getElementById("equip-sort");
    var filterInput = document.getElementById("equip-filter");
    var tableBody = document.getElementById("equip-stats-body");

    var detailsSection = document.getElementById("equip-details-section");
    var detailsTitle = document.getElementById("equip-details-title");
    var detailsContainer = document.getElementById("equip-details");


    var allCards = card_db().get();


    allCards.forEach(function (card) {

        cardById[card.Id] = card;

    });


    /*
     * ------------------------------------------------------------
     * 2. CARD TYPE HELPERS
     * ------------------------------------------------------------
     */

    function isMonster(card) {

        return !!card && card.Type < 20;

    }


    function isEquip(card) {

        return !!card && cardTypes[card.Type] === "Equip";

    }


    /*
     * ------------------------------------------------------------
     * 3. BUILD EQUIP STATISTICS
     *
     * Each Equip counts UNIQUE monster cards only.
     * ------------------------------------------------------------
     */

    allCards.forEach(function (card) {

        if (!isEquip(card)) {
            return;
        }


        var partnerIds = [];
        var seen = new Set();
        var equipList = equipsList[card.Id] || [];


        equipList.forEach(function (targetId) {

            var targetCard = cardById[targetId];

            if (!isMonster(targetCard)) {
                return;
            }

            if (seen.has(targetId)) {
                return;
            }

            seen.add(targetId);
            partnerIds.push(targetId);

        });


        var statistic = {
            card: card,
            partnerIds: partnerIds,
            count: partnerIds.length
        };

        statistics.push(statistic);
        statisticsById[card.Id] = statistic;

    });


    /*
     * ------------------------------------------------------------
     * 4. CALCULATE GLOBAL RANKS
     * ------------------------------------------------------------
     */

        function formatCardId(id) {
        return "#" + String(id).padStart(3, "0");
    }


    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/\'/g, "&#039;");
    }


    function formatBoldCardLabel(card) {
        return "<strong>" +
            escapeHTML(formatCardId(card.Id) + " " + card.Name) +
            "</strong>";
    }


    function formatGuardianStar(value) {
        if (value === 10) {
            return starNames[9];
        }

        return starNames[value] || starNames[0];
    }


    function formatMonsterSummary(card) {
        return (
            formatBoldCardLabel(card) +
            "<br>Type: " +
            escapeHTML(cardTypes[card.Type] || "Unknown") +
            " — Guardian Stars: " +
            escapeHTML(formatGuardianStar(card.GuardianStarA)) +
            " / " +
            escapeHTML(formatGuardianStar(card.GuardianStarB)) +
            " — " +
            escapeHTML(card.Attack) +
            "A / " +
            escapeHTML(card.Defense) +
            "D"
        );
    }


function calculateGlobalRanks() {

        var rankedResults = statistics.slice();


        rankedResults.sort(function (a, b) {

            if (b.count !== a.count) {
                return b.count - a.count;
            }

            return a.card.Name.localeCompare(b.card.Name);

        });


        var i = 0;


        while (i < rankedResults.length) {

            var count = rankedResults[i].count;
            var startRank = i + 1;
            var j = i + 1;


            while (
                j < rankedResults.length &&
                rankedResults[j].count === count
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
                    "–" +
                    endRank;
            }


            for (var k = i; k < j; k++) {
                globalRankLabels[rankedResults[k].card.Id] = label;
            }


            i = j;

        }

    }


    calculateGlobalRanks();


    /*
     * ------------------------------------------------------------
     * 5. SORTING
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


            if (sortMode === "name-desc") {
                return b.card.Name.localeCompare(a.card.Name);
            }


            return a.card.Name.localeCompare(b.card.Name);

        });

    }


    /*
     * ------------------------------------------------------------
     * 6. FILTERING
     * ------------------------------------------------------------
     *
     * Filtering only controls visibility.
     * Global rank values are preserved.
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

            row.className = "equip-stats-row";
            row.dataset.cardId = entry.card.Id;


            var rankCell = document.createElement("td");
            rankCell.textContent = globalRankLabels[entry.card.Id];


            var nameCell = document.createElement("td");
            nameCell.innerHTML = formatBoldCardLabel(entry.card);


            var countCell = document.createElement("td");
            countCell.textContent = entry.count;


            row.appendChild(rankCell);
            row.appendChild(nameCell);
            row.appendChild(countCell);

            tableBody.appendChild(row);

        });


        /*
         * Add the requested blank row at the bottom.
         */

        var blankRow = document.createElement("tr");

        blankRow.className = "equip-stats-blank-row";
        blankRow.style.backgroundColor = "#F8F9FA";


        for (var blankCellIndex = 0; blankCellIndex < 3; blankCellIndex++) {

            var blankCell = document.createElement("td");

            blankCell.innerHTML = "&nbsp;";
            blankRow.appendChild(blankCell);

        }


        tableBody.appendChild(blankRow);

    }


    /*
     * ------------------------------------------------------------
     * 8. RENDER EQUIP DETAILS
     * ------------------------------------------------------------
     */

    function showEquipDetails(cardId) {

        var entry = statisticsById[cardId];


        if (!entry) {
            return;
        }


        detailsTitle.innerHTML =
            formatBoldCardLabel(entry.card) +
            " — " +
            entry.count +
            " Compatible Monsters";


        detailsContainer.innerHTML = "";


        var table = document.createElement("table");

        table.className = "table table-striped table-bordered";


        var thead = document.createElement("thead");
        var headerRow = document.createElement("tr");
        var monsterHeader = document.createElement("th");

        monsterHeader.textContent = "Compatible Monster";

        headerRow.appendChild(monsterHeader);
        thead.appendChild(headerRow);
        table.appendChild(thead);


        var tbody = document.createElement("tbody");

        var monsterCards = entry.partnerIds
            .map(function (monsterId) {
                return cardById[monsterId];
            })
            .filter(function (monsterCard) {
                return !!monsterCard;
            });


        monsterCards.sort(function (a, b) {
            return a.Id - b.Id;
        });


        monsterCards.forEach(function (monsterCard) {

            var row = document.createElement("tr");
            var monsterCell = document.createElement("td");
            monsterCell.className = "equip-monster-summary";
            monsterCell.innerHTML = formatMonsterSummary(monsterCard);

            row.appendChild(monsterCell);
            tbody.appendChild(row);

        });


        table.appendChild(tbody);
        detailsContainer.appendChild(table);

        detailsSection.style.display = "";

        detailsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }


    /*
     * ------------------------------------------------------------
     * 9. EVENT HANDLERS
     * ------------------------------------------------------------
     */

    tableBody.addEventListener("click", function (event) {

        var row = event.target.closest(".equip-stats-row");

        if (!row) {
            return;
        }

        showEquipDetails(row.dataset.cardId);

    });


    sortSelect.addEventListener("change", function () {
        renderStatistics();
    });


    filterInput.addEventListener("input", function () {
        renderStatistics();
    });


    /*
     * ------------------------------------------------------------
     * 10. INITIAL RENDER
     * ------------------------------------------------------------
     */

    detailsSection.style.display = "none";

    renderStatistics();

})();


/*
 * ------------------------------------------------------------
 * END OF FILE
 * ------------------------------------------------------------
 */
