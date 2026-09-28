/*
 * Fusion Statistics
 *
 * Shows every card ranked by the number of unique cards
 * it can fuse with.
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

    var sortSelect = document.getElementById("fusion-sort");
    var filterInput = document.getElementById("fusion-filter");
    var tableBody = document.getElementById("fusion-stats-body");

    var detailsSection = document.getElementById("fusion-details-section");
    var detailsTitle = document.getElementById("fusion-details-title");
    var detailsContainer = document.getElementById("fusion-details");


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
     * BUILD FUSION STATISTICS
     * ------------------------------------------------------------
     *
     * For each card, count the number of UNIQUE cards that
     * it can fuse with.
     *
     * Example:
     *
     * Card A + Card B -> Result 1
     * Card A + Card B -> Result 2
     *
     * Card B is still only counted ONCE as a fusion partner.
     */

    fusionsList.forEach(function (fusionList, cardId) {

        var partners = {};

        if (fusionList) {

            fusionList.forEach(function (fusion) {

                /*
                 * Each fusion entry is an object containing
                 * the partner card ID and the result card ID.
                 *
                 * fusionsList is an array, so the second
                 * forEach argument is only the array index.
                 * Using it as the partner ID incorrectly adds
                 * index 0 as "Unknown Card" and breaks result
                 * lookups.
                 */
                partners[fusion.card] = true;

            });

        }

        var card = cardById[cardId];

        if (!card) {
            return;
        }

        var partnerIds = Object.keys(partners).map(function (id) {
            return Number(id);
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


            /*
             * Default:
             * name-asc
             */

            return a.card.Name.localeCompare(b.card.Name);

        });

    }


    /*
     * ------------------------------------------------------------
     * RANK CALCULATION
     * ------------------------------------------------------------
     *
     * IMPORTANT:
     *
     * This is competition ranking.
     *
     * Example:
     *
     * Counts:
     *
     * 20
     * 19
     * 18
     * 18
     * 18
     * 18
     * 17
     *
     * Ranks:
     *
     * 1
     * 2
     * 3--6
     * 3--6
     * 3--6
     * 3--6
     * 7
     */

    function getRankLabels(results) {

        var rankLabels = new Array(results.length);

        var i = 0;

        while (i < results.length) {

            /*
             * Only cards with the same fusion count are tied.
             */
            var count = results[i].count;

            /*
             * Array indexes start at zero,
             * but ranks start at one.
             */
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
             * Therefore j is also the final rank
             * occupied by this tie.
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

            /*
             * Continue with the next group.
             */
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

            row.className = "fusion-stats-row";

            row.dataset.cardId = entry.card.Id;


            /*
             * Rank
             */

            var rankCell = document.createElement("td");

            rankCell.textContent = rankLabels[index];


            /*
             * Card name
             */

            var nameCell = document.createElement("td");

            nameCell.textContent = entry.card.Name;


            /*
             * Number of fusion partners
             */

            var countCell = document.createElement("td");

            countCell.textContent = entry.count;


            row.appendChild(rankCell);
            row.appendChild(nameCell);
            row.appendChild(countCell);

            tableBody.appendChild(row);

        });


        /*
         * Add a blank row at the bottom of the table.
         *
         * This row is intentionally not clickable and uses the
         * requested #F8F9FA background color.
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
     * RENDER CARD DETAILS
     * ------------------------------------------------------------
     *
     * Clicking a card in the statistics table shows every card
     * that it can fuse with and the resulting card.
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

        var partnerHeader = document.createElement("th");

        partnerHeader.textContent = "Fusion Partner";

        var resultHeader = document.createElement("th");

        resultHeader.textContent = "Result";

        headerRow.appendChild(partnerHeader);
        headerRow.appendChild(resultHeader);

        thead.appendChild(headerRow);

        table.appendChild(thead);


        /*
         * Table body.
         */

        var tbody = document.createElement("tbody");


        /*
         * Get the fusion list for this card.
         */

        var fusionList = fusionsList[entry.card.Id];


        if (fusionList) {

            entry.partnerIds.forEach(function (partnerId) {

                var row = document.createElement("tr");

                var partnerCell = document.createElement("td");

                var resultCell = document.createElement("td");


                /*
                 * Find partner card.
                 */

                var partnerCard = cardById[partnerId];


                if (partnerCard) {

                    partnerCell.textContent =
                        partnerCard.Name;

                } else {

                    partnerCell.textContent =
                        "Unknown Card";

                }


                /*
                 * Find the fusion result.
                 *
                 * Each entry in fusionList is:
                 *
                 *     { card: partnerId, result: resultId }
                 */

                var fusionEntry = fusionList.find(function (fusion) {

                    return String(fusion.card) === String(partnerId);

                });

                var resultId = fusionEntry ? fusionEntry.result : null;

                var resultCard = cardById[resultId];


                if (resultCard) {

                    resultCell.textContent =
                        resultCard.Name;

                } else {

                    resultCell.textContent =
                        "Unknown Result";

                }


                row.appendChild(partnerCell);
                row.appendChild(resultCell);

                tbody.appendChild(row);

            });

        }


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

        var row = event.target.closest(".fusion-stats-row");

        if (!row) {
            return;
        }

        showCardDetails(row.dataset.cardId);

    });


    /*
     * ------------------------------------------------------------
     * SORT CHANGE
     * ------------------------------------------------------------
     */

    sortSelect.addEventListener("change", function () {

        renderStatistics();

    });


    /*
     * ------------------------------------------------------------
     * SEARCH FILTER
     * ------------------------------------------------------------
     */

    filterInput.addEventListener("input", function () {

        renderStatistics();

    });


    /*
     * ------------------------------------------------------------
     * INITIALIZE
     * ------------------------------------------------------------
     */

    detailsSection.style.display = "none";

    renderStatistics();

})();
