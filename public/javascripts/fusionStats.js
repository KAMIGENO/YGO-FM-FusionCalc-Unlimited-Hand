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
    var cardByName = {};
    var glitchFusionDetails = {};
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
        cardByName[card.Name] = card;

    });


    /*
     * ------------------------------------------------------------
     * BUILD GLITCH FUSION LOOKUP
     * ------------------------------------------------------------
     */

    glitchFusions.forEach(function (fusion) {

        var card1 = cardByName[fusion.card1];
        var card2 = cardByName[fusion.card2];
        var result = cardByName[fusion.result];

        if (!card1 || !card2 || !result) {
            return;
        }

        if (!glitchFusionDetails[card1.Id]) {
            glitchFusionDetails[card1.Id] = [];
        }

        glitchFusionDetails[card1.Id].push({
            partnerId: card2.Id,
            resultId: result.Id
        });

        if (!glitchFusionDetails[card2.Id]) {
            glitchFusionDetails[card2.Id] = [];
        }

        glitchFusionDetails[card2.Id].push({
            partnerId: card1.Id,
            resultId: result.Id
        });

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

        var partners = new Set();

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

                partners.add(fusion.card);

            });

        }

        (glitchFusionDetails[cardId] || []).forEach(function (glitchDetail) {

            partners.add(glitchDetail.partnerId);

        });

        var card = cardById[cardId];

        if (!card) {
            return;
        }

        var partnerIds = Array.from(partners);

        statistics.push({
            card: card,
            partnerIds: partnerIds,
            count: partnerIds.length
        });

    });


    /*
     * ------------------------------------------------------------
     * DISPLAY HELPERS
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

        var details = "Type: " + getCardTypeName(card);

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


    function formatCardLabel(card) {
        return formatCardId(card.Id) + " " + card.Name;
    }


    function formatBoldCardLabel(card) {
        return "<strong>" + escapeHTML(formatCardLabel(card)) + "</strong>";
    }


    function formatCardCell(card) {
        return (
            formatBoldCardLabel(card) +
            "<br>" +
            escapeHTML(formatCardDetails(card))
        );
    }


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

    function getGlobalRankLabels() {

        var rankedResults = statistics.slice();

        sortStatistics(rankedResults);

        var rankLabels = {};

        var i = 0;

        while (i < rankedResults.length) {

            /*
             * Only cards with the same fusion count are tied.
             */

            var count = rankedResults[i].count;


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
                j < rankedResults.length &&
                rankedResults[j].count === count
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
                    "–" +
                    endRank;

            }


            /*
             * Give every tied card the same rank label.
             */

            for (var k = i; k < j; k++) {

                rankLabels[rankedResults[k].card.Id] = label;

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
         * Global ranks are calculated from the complete statistics set.
         * Filtering only changes which rows are visible.
         */

        var rankLabels = getGlobalRankLabels();


        tableBody.innerHTML = "";


        results.forEach(function (entry, index) {

            var row = document.createElement("tr");

            row.className = "fusion-stats-row";

            row.dataset.cardId = entry.card.Id;


            /*
             * Rank
             */

            var rankCell = document.createElement("td");

            rankCell.textContent = rankLabels[entry.card.Id];
            rankCell.style.verticalAlign = "middle";


            /*
             * Card name
             */

            var nameCell = document.createElement("td");

            nameCell.innerHTML = formatCardCell(entry.card);
            nameCell.style.verticalAlign = "middle";


            /*
             * Number of fusion partners
             */

            var countCell = document.createElement("td");

            countCell.textContent = entry.count;
            countCell.style.verticalAlign = "middle";


            row.appendChild(rankCell);
            row.appendChild(nameCell);
            row.appendChild(countCell);


            tableBody.appendChild(row);

        });


        /*
         * --------------------------------------------------------
         * BLANK ROW
         * --------------------------------------------------------
         *
         * Add a blank row at the bottom of the table.
         *
         * This row is intentionally not clickable and uses the
         * requested #F8F9FA background color.
         */

        var blankRow = document.createElement("tr");

        blankRow.className = "fusion-stats-blank-row";

        blankRow.style.backgroundColor = "#F8F9FA";


        /*
         * The main Fusion Statistics table has 3 columns:
         *
         * Rank | Card | Fusion Partners
         */

        for (
            var blankCellIndex = 0;
            blankCellIndex < 3;
            blankCellIndex++
        ) {

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


        detailsTitle.innerHTML =
            formatBoldCardLabel(entry.card) +
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


        var detailEntries = [];

        if (fusionList) {

            entry.partnerIds.forEach(function (partnerId) {

                var fusionEntry = fusionList.find(function (fusion) {
                    return String(fusion.card) === String(partnerId);
                });

                detailEntries.push({
                    partnerCard: cardById[partnerId],
                    resultCard: fusionEntry ? cardById[fusionEntry.result] : null,
                    isGlitch: false
                });

            });

        }


        (glitchFusionDetails[entry.card.Id] || []).forEach(function (glitchDetail) {

            detailEntries.push({
                partnerCard: cardById[glitchDetail.partnerId],
                resultCard: cardById[glitchDetail.resultId],
                isGlitch: true
            });

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

            if (detail.partnerCard) {
                partnerCell.innerHTML = formatCardCell(detail.partnerCard);
            } else {
                partnerCell.textContent = "Unknown Card";
            }

            if (detail.resultCard) {
                resultCell.innerHTML =
                    formatBoldCardLabel(detail.resultCard) +
                    (detail.isGlitch ? " <strong>(Glitch Fusion)</strong>" : "") +
                    "<br>" +
                    escapeHTML(formatCardDetails(detail.resultCard));
            } else {
                resultCell.textContent = "Unknown Result";
            }

            row.appendChild(partnerCell);
            row.appendChild(resultCell);
            tbody.appendChild(row);

        });


        /*
         * --------------------------------------------------------
         * BLANK ROW
         * --------------------------------------------------------
         *
         * Add a blank row at the bottom of the
         * Fusion Partner / Result table.
         *
         * This row is intentionally not clickable and uses the
         * requested #F8F9FA background color.
         */

        var blankDetailRow =
            document.createElement("tr");

        blankDetailRow.className =
            "fusion-stats-blank-row";

        blankDetailRow.style.backgroundColor =
            "#F8F9FA";


        /*
         * The details table has 2 columns:
         *
         * Fusion Partner | Result
         */

        for (
            var blankDetailCellIndex = 0;
            blankDetailCellIndex < 2;
            blankDetailCellIndex++
        ) {

            var blankDetailCell =
                document.createElement("td");

            blankDetailCell.innerHTML = "&nbsp;";

            blankDetailRow.appendChild(blankDetailCell);

        }


        tbody.appendChild(blankDetailRow);


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

        var row =
            event.target.closest(".fusion-stats-row");


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
