/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/fusionStats.js
 * ------------------------------------------------------------
 *
 * Shows every card ranked by the number of unique cards
 * it can fuse with.
 *
 * Ranks are GLOBAL. Filtering changes which rows are visible,
 * but it does not recalculate a card's rank from the filtered
 * subset.
 */


/*
 * ------------------------------------------------------------
 * 1. INITIALIZATION
 *
 * Build the card lookup and the statistics data once.
 * ------------------------------------------------------------
 */

(function () {

    "use strict";


    var cardById = {};
    var statistics = [];
    var globalRankLabels = {};
    var glitchFusionDetails = {};


    var sortSelect = document.getElementById("fusion-sort");
    var filterInput = document.getElementById("fusion-filter");
    var tableBody = document.getElementById("fusion-stats-body");

    var detailsSection = document.getElementById("fusion-details-section");
    var detailsTitle = document.getElementById("fusion-details-title");
    var detailsContainer = document.getElementById("fusion-details");


    card_db().get().forEach(function (card) {

        cardById[card.Id] = card;

    });


    /*
     * ------------------------------------------------------------
     * 2. BUILD FUSION STATISTICS
     *
     * Each card is counted against UNIQUE fusion partners.
     * ------------------------------------------------------------
     */

    fusionsList.forEach(function (fusionList, cardId) {

        var partners = new Set();
        var card = cardById[cardId];


        if (!card) {
            return;
        }


        (fusionList || []).forEach(function (fusion) {

            if (!fusion || fusion.card == null) {
                return;
            }

            partners.add(fusion.card);

        });


        glitchFusions.forEach(function (glitchFusion) {

            var glitchCard1 = null;
            var glitchCard2 = null;
            var glitchResult = null;

            Object.keys(cardById).forEach(function (id) {

                var candidate = cardById[id];

                if (candidate.Name === glitchFusion.card1) {
                    glitchCard1 = candidate;
                }

                if (candidate.Name === glitchFusion.card2) {
                    glitchCard2 = candidate;
                }

                if (candidate.Name === glitchFusion.result) {
                    glitchResult = candidate;
                }

            });


            if (!glitchCard1 || !glitchCard2 || !glitchResult) {
                return;
            }


            if (glitchCard1.Id === cardId) {

                partners.add(glitchCard2.Id);

                if (!glitchFusionDetails[cardId]) {
                    glitchFusionDetails[cardId] = [];
                }

                glitchFusionDetails[cardId].push({
                    partnerId: glitchCard2.Id,
                    resultId: glitchResult.Id
                });

            }


            if (glitchCard2.Id === cardId) {

                partners.add(glitchCard1.Id);

                if (!glitchFusionDetails[cardId]) {
                    glitchFusionDetails[cardId] = [];
                }

                glitchFusionDetails[cardId].push({
                    partnerId: glitchCard1.Id,
                    resultId: glitchResult.Id
                });

            }

        });


        var partnerIds = Array.from(partners);


        statistics.push({
            card: card,
            partnerIds: partnerIds,
            count: partnerIds.length
        });

    });


    /*
     * ------------------------------------------------------------
     * 3. CALCULATE GLOBAL RANKS
     *
     * Global ranks are always based on count descending.
     * Filtering never changes these labels.
     * ------------------------------------------------------------
     */

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
                    "--" +
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
     * 4. SORTING
     * ------------------------------------------------------------
     */

    function sortStatistics(results) {

        var sortType = sortSelect.value;


        results.sort(function (a, b) {

            if (sortType === "count-desc") {

                if (b.count !== a.count) {
                    return b.count - a.count;
                }

                return a.card.Name.localeCompare(b.card.Name);

            }


            if (sortType === "count-asc") {

                if (a.count !== b.count) {
                    return a.count - b.count;
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
     * 5. FILTERING
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
     * 6. RENDER MAIN TABLE
     * ------------------------------------------------------------
     */

    function renderStatistics() {

        var results = getFilteredStatistics();

        sortStatistics(results);

        tableBody.innerHTML = "";


        results.forEach(function (entry) {

            var row = document.createElement("tr");

            row.className = "fusion-stats-row";
            row.dataset.cardId = entry.card.Id;


            var rankCell = document.createElement("td");
            rankCell.textContent = globalRankLabels[entry.card.Id];


            var nameCell = document.createElement("td");
            nameCell.textContent = entry.card.Name;


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

        blankRow.className = "fusion-stats-blank-row";
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
     * 7. RENDER CARD DETAILS
     * ------------------------------------------------------------
     */

    function showCardDetails(cardId) {

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
            " Fusion Partners";


        detailsContainer.innerHTML = "";


        var table = document.createElement("table");

        table.className = "table table-striped table-bordered";


        var thead = document.createElement("thead");
        var headerRow = document.createElement("tr");
        var partnerHeader = document.createElement("th");
        var resultHeader = document.createElement("th");

        partnerHeader.textContent = "Fusion Partner";
        resultHeader.textContent = "Result";

        headerRow.appendChild(partnerHeader);
        headerRow.appendChild(resultHeader);
        thead.appendChild(headerRow);
        table.appendChild(thead);


        var tbody = document.createElement("tbody");
        var fusionList = fusionsList[entry.card.Id] || [];


        var detailEntries = entry.partnerIds.map(function (partnerId) {

            var partnerCard = cardById[partnerId];
            var fusionEntry = fusionList.find(function (fusion) {

                return String(fusion.card) === String(partnerId);

            });

            return {
                partnerCard: partnerCard,
                resultCard: fusionEntry
                    ? cardById[fusionEntry.result]
                    : null
            };

        });


        detailEntries.sort(function (a, b) {

            var nameA = a.partnerCard ? a.partnerCard.Name : "";
            var nameB = b.partnerCard ? b.partnerCard.Name : "";

            return nameA.localeCompare(nameB);

        });


        detailEntries.forEach(function (detail) {

            var row = document.createElement("tr");
            var partnerCell = document.createElement("td");
            var resultCell = document.createElement("td");

            partnerCell.textContent = detail.partnerCard
                ? detail.partnerCard.Name
                : "Unknown Card";

            resultCell.textContent = detail.resultCard
                ? detail.resultCard.Name
                : "Unknown Result";

            row.appendChild(partnerCell);
            row.appendChild(resultCell);
            tbody.appendChild(row);

        });


        (glitchFusionDetails[entry.card.Id] || []).forEach(function (glitch) {

            var row = document.createElement("tr");
            var partnerCell = document.createElement("td");
            var resultCell = document.createElement("td");

            var partnerCard = cardById[glitch.partnerId];
            var resultCard = cardById[glitch.resultId];

            partnerCell.textContent = partnerCard
                ? partnerCard.Name
                : "Unknown Card";

            resultCell.innerHTML =
                "<strong>Glitch Fusion</strong><br>" +
                (resultCard ? resultCard.Name : "Unknown Result");

            row.appendChild(partnerCell);
            row.appendChild(resultCell);
            tbody.appendChild(row);

        });


        /*
         * Add the requested blank row at the bottom of the details table.
         */

        var blankDetailRow = document.createElement("tr");

        blankDetailRow.className = "fusion-stats-blank-row";
        blankDetailRow.style.backgroundColor = "#F8F9FA";


        for (var blankDetailCellIndex = 0; blankDetailCellIndex < 2; blankDetailCellIndex++) {

            var blankDetailCell = document.createElement("td");

            blankDetailCell.innerHTML = "&nbsp;";
            blankDetailRow.appendChild(blankDetailCell);

        }


        tbody.appendChild(blankDetailRow);

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
     * 8. EVENT HANDLERS
     * ------------------------------------------------------------
     */

    tableBody.addEventListener("click", function (event) {

        var row = event.target.closest(".fusion-stats-row");

        if (!row) {
            return;
        }

        showCardDetails(row.dataset.cardId);

    });


    sortSelect.addEventListener("change", function () {
        renderStatistics();
    });


    filterInput.addEventListener("input", function () {
        renderStatistics();
    });


    /*
     * ------------------------------------------------------------
     * 9. INITIAL RENDER
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
