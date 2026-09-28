/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/test.js
 * ------------------------------------------------------------
 *
 * Runtime checks for the Fusion Search page and its generated
 * relationship databases.
 *
 * This file is intentionally safe to load by itself. It does not assume
 * that page-specific variables already exist.
 */


/*
 * ------------------------------------------------------------
 * 1. TEST HELPERS
 * ------------------------------------------------------------
 */

function testAssert(condition, message, failures) {

    if (!condition) {
        failures.push(message);
    }

}


function testHasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}


/*
 * ------------------------------------------------------------
 * 2. FUSION SEARCH AND DATABASE TEST
 *
 * Checks the dependencies, generated database shapes, reciprocal
 * relationships, result relationships, and ritual relationships.
 * ------------------------------------------------------------
 */

function testFusionSearch() {

    var failures = [];


    if (typeof card_db !== "function") {
        return {
            passed: false,
            failures: ["card_db is not available"]
        };
    }


    if (typeof fusionsList === "undefined") {
        failures.push("fusionsList is not available");
    }

    if (typeof equipsList === "undefined") {
        failures.push("equipsList is not available");
    }

    if (typeof resultsList === "undefined") {
        failures.push("resultsList is not available");
    }

    if (typeof ritualsList === "undefined") {
        failures.push("ritualsList is not available");
    }

    if (typeof getCardById !== "function") {
        failures.push("getCardById is not available");
    }


    if (failures.length > 0) {
        return {
            passed: false,
            failures: failures
        };
    }


    var cards = card_db().get();

    testAssert(cards.length > 0, "Card database is empty", failures);
    testAssert(fusionsList.length === cards.length + 1, "Fusion database length does not match card IDs", failures);
    testAssert(equipsList.length === cards.length + 1, "Equip database length does not match card IDs", failures);
    testAssert(resultsList.length === cards.length + 1, "Result database length does not match card IDs", failures);
    testAssert(ritualsList.length === cards.length + 1, "Ritual database length does not match card IDs", failures);


    var testCard = cards[0];
    var fusions = fusionsList[testCard.Id] || [];

    testAssert(Array.isArray(fusions), "Fusion list is not an array", failures);


    if (fusions.length > 0) {

        var fusion = fusions[0];
        var reverse = (fusionsList[fusion.card] || []).some(function (entry) {
            return entry.card === testCard.Id && entry.result === fusion.result;
        });

        testAssert(reverse, "Fusion relationship is not reciprocal", failures);

    }


    var equipCard = cards.find(function (card) {
        return (equipsList[card.Id] || []).length > 0;
    });


    if (equipCard) {

        var targetId = equipsList[equipCard.Id][0];
        var reverseEquip = (equipsList[targetId] || []).indexOf(equipCard.Id) !== -1;

        testAssert(reverseEquip, "Equip relationship is not reciprocal", failures);

    } else {
        failures.push("No equip relationship was available to test");
    }


    var ritualEntries = [];

    ritualsList.forEach(function (ritualList) {

        if (!ritualList) {
            return;
        }

        ritualEntries = ritualEntries.concat(ritualList);

    });


    testAssert(ritualEntries.length === 24, "Expected 24 ritual definitions", failures);


    ritualEntries.forEach(function (ritual) {

        testAssert(
            testHasOwn(ritual, "ritual_card") &&
            testHasOwn(ritual, "card1") &&
            testHasOwn(ritual, "card2") &&
            testHasOwn(ritual, "card3") &&
            testHasOwn(ritual, "result"),
            "Ritual definition is missing a required field",
            failures
        );

    });


    return {
        passed: failures.length === 0,
        failures: failures,
        cardCount: cards.length,
        ritualCount: ritualEntries.length
    };

}


/*
 * ------------------------------------------------------------
 * 3. OPTIONAL GLOBAL ACCESS
 *
 * Expose the test without running it automatically.
 * ------------------------------------------------------------
 */

if (typeof window !== "undefined") {
    window.testFusionSearch = testFusionSearch;
}


/*
 * ------------------------------------------------------------
 * END OF FILE
 * ------------------------------------------------------------
 */
