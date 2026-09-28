/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/fusionSearch.js
 * ------------------------------------------------------------
 *
 * Searches cards by name and shows their fusion, equip, and
 * result relationships.
 */


/*
 * ------------------------------------------------------------
 * 1. INITIALIZATION
 * ------------------------------------------------------------
 */

var nameInput = document.getElementById("cardname");
var outputLeft = document.getElementById("output-area-left");
var outputRight = document.getElementById("output-area-right");
var outputCard = document.getElementById("outputcard");
var searchMessage = document.getElementById("search-msg");
var resetBtn = document.getElementById("reset-btn");
var searchResultsBtn = document.getElementById("search-results-btn");
var searchNameBtn = document.getElementById("search-name-btn");


/*
 * ------------------------------------------------------------
 * 2. CARD LOOKUPS AND DISPLAY HELPERS
 * ------------------------------------------------------------
 */

var cardByName = {};
var cardById = {};


card_db()
    .get()
    .forEach(function (card) {

        cardByName[card.Name.toLowerCase()] = card;
        cardById[card.Id] = card;

    });


function getCardById(id) {
    return cardById[id] || null;
}


function getCardByName(name) {

    if (!name) {
        return null;
    }

    return cardByName[name.toLowerCase()] || null;

}


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}


/*
 * ------------------------------------------------------------
 * 3. CLEAR AND ERROR MESSAGES
 * ------------------------------------------------------------
 */

function resultsClear() {

    outputLeft.innerHTML = "";
    outputRight.innerHTML = "";
    outputCard.innerHTML = "";
    searchMessage.innerHTML = "";

}


function createDangerMessage(input) {

    if (!input) {
        return "<div class=\"alert alert-danger\" role=\"alert\">Please enter a search term</div>";
    }


    return (
        "<div class=\"alert alert-danger\" role=\"alert\">" +
        "No card for " +
        escapeHTML(input) +
        " found</div>"
    );

}


/*
 * ------------------------------------------------------------
 * 4. CARD DISPLAY
 * ------------------------------------------------------------
 */

function createSideCard(card) {

    var modelCard =
        "<div class=\"card ml-1\" style=\"max-width: 540px\">" +
        "<div class=\"row no-gutters\">" +
        "<div class=\"col\">" +
        "<div class=\"card-body\">" +
        "<h5 class=\"card-title\">" +
        escapeHTML(card.Name) +
        "</h5>" +
        "<p class=\"card-text\">" +
        escapeHTML(card.Description) +
        "</p>" +
        "<p class=\"card-text\"><strong>ATK / DEF:</strong> " +
        card.Attack +
        " / " +
        card.Defense +
        "</p>" +
        "<p class=\"card-text\"><strong>Type:</strong> " +
        escapeHTML(cardTypes[card.Type]) +
        "</p>" +
        "<p class=\"card-text\"><strong>Stars:</strong> " +
        card.Stars +
        "</p>" +
        "<p class=\"card-text\"><strong>Password:</strong> " +
        escapeHTML(card.CardCode) +
        "</p>" +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div>";


    if (card.Type < 20) {
        return modelCard;
    }


    return modelCard.replace(
        "<p class=\"card-text\"><strong>ATK / DEF:</strong> " +
        card.Attack +
        " / " +
        card.Defense +
        "</p>",
        ""
    );

}


/*
 * ------------------------------------------------------------
 * 5. FUSION RESULT DISPLAY
 * ------------------------------------------------------------
 */

function fusesToHTML(fuselist) {

    return fuselist
        .map(function (fusion) {

            var res =
                "<div class=\"card border-dark mb-3\" style=\"max-width: 18rem;\">" +
                "<div class=\"card-body text-dark\">" +
                "<p class=\"card-text\"><strong>Input:</strong> " +
                escapeHTML(fusion.card1.Name) +
                "</p>" +
                "<p class=\"card-text\"><strong>Input:</strong> " +
                escapeHTML(fusion.card2.Name) +
                "</p>";


            if (fusion.result) {

                res +=
                    "<p class=\"card-text\"><strong>Result:</strong> " +
                    escapeHTML(fusion.result.Name);


                if (fusion.result.Type < 20) {

                    res +=
                        " (" +
                        fusion.result.Attack +
                        "/" +
                        fusion.result.Defense +
                        ")";

                } else {

                    res +=
                        " [" +
                        escapeHTML(cardTypes[fusion.result.Type]) +
                        "]";

                }


                res += "</p>";

            }


            return res + "</div></div>";

        })
        .join("");

}


/*
 * ------------------------------------------------------------
 * 6. SEARCH BY NAME
 * ------------------------------------------------------------
 */

function searchByName() {

    if (nameInput.value === "") {
        searchMessage.innerHTML = createDangerMessage();
        return;
    }


    var card = getCardByName(nameInput.value);


    if (!card) {
        searchMessage.innerHTML = createDangerMessage(nameInput.value);
        return;
    }


    outputCard.innerHTML = createSideCard(card);


    var fuses = (fusionsList[card.Id] || []).map(function (fusion) {

        return {
            card1: card,
            card2: getCardById(fusion.card),
            result: getCardById(fusion.result)
        };

    }).filter(function (fusion) {

        return fusion.card2 && fusion.result;

    });


    var equips = (equipsList[card.Id] || [])
        .map(function (targetId) {

            return {
                card1: card,
                card2: getCardById(targetId)
            };

        })
        .filter(function (equip) {
            return !!equip.card2;
        });


    outputRight.innerHTML =
        "<h2 class='text-center my-4'>Can be equipped</h2>" +
        fusesToHTML(equips);

    outputLeft.innerHTML =
        "<h2 class='text-center my-4'>Fusions</h2>" +
        fusesToHTML(fuses);

}


/*
 * ------------------------------------------------------------
 * 7. SEARCH FOR RESULT
 * ------------------------------------------------------------
 */

function searchForResult() {

    if (nameInput.value === "") {
        searchMessage.innerHTML = createDangerMessage();
        return;
    }


    var card = getCardByName(nameInput.value);


    if (!card) {
        searchMessage.innerHTML = createDangerMessage(nameInput.value);
        return;
    }


    outputCard.innerHTML = createSideCard(card);


    var resultEntries = resultsList[card.Id] || [];


    if (resultEntries.length === 0) {
        outputLeft.innerHTML = "";
        return;
    }


    var results = resultEntries
        .map(function (fusion) {

            return {
                card1: getCardById(fusion.card1),
                card2: getCardById(fusion.card2)
            };

        })
        .filter(function (fusion) {
            return fusion.card1 && fusion.card2;
        });


    outputLeft.innerHTML =
        "<h2 class='text-center my-4'>Fusions</h2>" +
        fusesToHTML(results);

}


/*
 * ------------------------------------------------------------
 * 8. AUTOCOMPLETE AND BUTTON HANDLERS
 * ------------------------------------------------------------
 */

var cardNameCompletion = new Awesomplete(nameInput, {
    list: card_db()
        .get()
        .map(function (card) {
            return card.Name;
        }),
    autoFirst: true,
    filter: Awesomplete.FILTER_STARTSWITH
});


$("#cardname").on("change", function () {

    cardNameCompletion.select();
    resultsClear();
    searchByName();

});


$("#cardname").on("awesomplete-selectcomplete", function () {

    resultsClear();
    searchByName();

});


searchNameBtn.onclick = function () {

    cardNameCompletion.select();
    resultsClear();
    searchByName();

};


searchResultsBtn.onclick = function () {

    cardNameCompletion.select();
    resultsClear();
    searchForResult();

};


resetBtn.onclick = function () {

    resultsClear();
    nameInput.value = "";

};


/*
 * ------------------------------------------------------------
 * END OF FILE
 * ------------------------------------------------------------
 */
