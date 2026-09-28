var statsBody = document.getElementById("fusion-stats-body");
var sortSelect = document.getElementById("fusion-sort");
var filterInput = document.getElementById("fusion-filter");

var detailsSection = document.getElementById("fusion-details-section");
var detailsTitle = document.getElementById("fusion-details-title");
var detailsContainer = document.getElementById("fusion-details");


// ------------------------------------------------------------
// CARD LOOKUPS
// ------------------------------------------------------------

var cardById = {};

card_db()
    .get()
    .forEach(function (card) {
        cardById[card.Id] = card;
    });


// ------------------------------------------------------------
// BUILD FUSION STATISTICS
// ------------------------------------------------------------

var fusionStats = [];

fusionsList.forEach(function (fusionList, cardId) {

    if (!fusionList) {
        return;
    }

    var card = cardById[cardId];

    if (!card) {
        return;
    }

    /*
     * Use an object as a set so that each possible fusion
     * partner is counted only once.
     */
    var partners = {};

    fusionList.forEach(function (fusion) {

        if (fusion.card && cardById[fusion.card]) {
            partners[fusion.card] = true;
        }

    });

    fusionStats.push({
        card: card,
        partnerIds: Object.keys(partners).map(Number),
        count: Object.keys(partners).length
    });
});


// ------------------------------------------------------------
// SORTING
// ------------------------------------------------------------

function sortFusionStats(stats) {

    var sortMode = sortSelect.value;

    stats.sort(function (a, b) {

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

    return stats;
}


// ------------------------------------------------------------
// RENDER TABLE
// ------------------------------------------------------------

function renderStats() {

    var filter = filterInput.value.trim().toLowerCase();

    var filteredStats = fusionStats.filter(function (entry) {

        return entry.card.Name.toLowerCase().includes(filter);

    });

    sortFusionStats(filteredStats);

    statsBody.innerHTML = "";

    filteredStats.forEach(function (entry, index) {

        var row = document.createElement("tr");

        var rankCell = document.createElement("td");
        var nameCell = document.createElement("td");
        var countCell = document.createElement("td");

        rankCell.textContent = index + 1;

        nameCell.textContent = entry.card.Name;

        countCell.textContent = entry.count;

        row.appendChild(rankCell);
        row.appendChild(nameCell);
        row.appendChild(countCell);

        row.classList.add("fusion-stats-row");

        row.addEventListener("click", function () {
            showFusionDetails(entry);
        });

        statsBody.appendChild(row);
    });
}


// ------------------------------------------------------------
// SHOW INDIVIDUAL CARD FUSIONS
// ------------------------------------------------------------

function showFusionDetails(entry) {

    detailsSection.style.display = "block";

    detailsTitle.textContent =
        entry.card.Name +
        " — " +
        entry.count +
        " Fusion Partners";

    detailsContainer.innerHTML = "";

    var table = document.createElement("table");

    table.className = "table table-striped";

    var thead = document.createElement("thead");

    thead.innerHTML =
        "<tr>" +
        "<th>Fusion Partner</th>" +
        "<th>Fusion Result</th>" +
        "</tr>";

    table.appendChild(thead);

    var tbody = document.createElement("tbody");

    var partners = entry.partnerIds
        .map(function (id) {
            return cardById[id];
        })
        .filter(function (card) {
            return card !== undefined;
        });

    partners.sort(function (a, b) {
        return a.Name.localeCompare(b.Name);
    });

    partners.forEach(function (partner) {

        var row = document.createElement("tr");

        var partnerCell = document.createElement("td");
        var resultCell = document.createElement("td");

        partnerCell.textContent = partner.Name;

        var fusionResultId = null;

        var fusionList = fusionsList[entry.card.Id] || [];

        fusionList.forEach(function (fusion) {

            if (fusion.card === partner.Id) {
                fusionResultId = fusion.result;
            }

        });

        var resultCard = cardById[fusionResultId];

        resultCell.textContent =
            resultCard
                ? resultCard.Name
                : "Unknown";

        row.appendChild(partnerCell);
        row.appendChild(resultCell);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);

    detailsContainer.appendChild(table);

    detailsSection.scrollIntoView({
        behavior: "smooth"
    });
}


// ------------------------------------------------------------
// EVENTS
// ------------------------------------------------------------

sortSelect.addEventListener("change", function () {
    renderStats();
});

filterInput.addEventListener("input", function () {
    renderStats();
});


// ------------------------------------------------------------
// INITIAL RENDER
// ------------------------------------------------------------

renderStats();
