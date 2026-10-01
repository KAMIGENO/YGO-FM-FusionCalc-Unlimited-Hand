/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/glitchFusions.js
 * ------------------------------------------------------------
 *
 * Builds the Glitch Fusions table from the authoritative card
 * database. The glitch-fusion relationships themselves remain
 * defined in data/glitchFusions.js.
 * ------------------------------------------------------------
 */

(function () {

    "use strict";

    var tableBody = document.getElementById("glitch-fusions-body");

    if (!tableBody) {
        return;
    }


    var cards = card_db().get();
    var cardsByName = {};

    cards.forEach(function (card) {
        cardsByName[card.Name.toLowerCase()] = card;
    });


    var guardianStarSymbols = {
        "Sun": "☉",
        "Mercury": "☿",
        "Venus": "♀",
        "Moon": "☾",
        "Mars": "♂",
        "Jupiter": "♃",
        "Saturn": "♄",
        "Uranus": "⛢",
        "Neptune": "♆",
        "Pluto": "♇"
    };


    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function formatCardId(id) {
        return "#" + String(id).padStart(3, "0");
    }


    function formatGuardianStar(value) {
        var name = starNames[value - 1] || "Unknown";
        var symbol = guardianStarSymbols[name] || "";

        return symbol ? symbol + " " + name : name;
    }


    function formatGuardianStars(card) {
        return formatGuardianStar(card.GuardianStarA) +
            " / " +
            formatGuardianStar(card.GuardianStarB);
    }


    function getCardByName(name) {
        if (!name) {
            return null;
        }

        return cardsByName[String(name).toLowerCase()] || null;
    }


    function formatCardSummary(card) {
        if (!card) {
            return "<div><strong>Card data not found</strong></div>";
        }

        var typeName = cardTypes[card.Type] || "Unknown";

        if (typeName === "Spellcaster") {
            typeName = "Magic-User (Spellcaster)";
        }

        return (
            "<div><strong>" +
                escapeHTML(formatCardId(card.Id) + " " + card.Name) +
            "</strong></div>" +
            "<div>Type: " + escapeHTML(typeName) + "</div>" +
            "<div>Guardian Stars: " + escapeHTML(formatGuardianStars(card)) + "</div>" +
            "<div>" + escapeHTML(card.Attack) + "A / " + escapeHTML(card.Defense) + "D</div>"
        );
    }


    function appendCardCell(row, cardName) {
        var cell = document.createElement("td");
        var card = getCardByName(cardName);

        cell.innerHTML = formatCardSummary(card);
        row.appendChild(cell);
    }


    glitchFusions.forEach(function (fusion) {
        var row = document.createElement("tr");

        appendCardCell(row, fusion.result);
        appendCardCell(row, fusion.card1);
        appendCardCell(row, fusion.card2);

        tableBody.appendChild(row);
    });

})();
