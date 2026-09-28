/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/test.js
 * ------------------------------------------------------------
 *
 * Optional runtime checks for the Fusion Search page.
 *
 * This file is intentionally safe to load by itself. It does not assume
 * that page-specific variables such as `card` already exist.
 */


/*
 * ------------------------------------------------------------
 * 1. FUSION SEARCH TEST
 *
 * Runs only when the Fusion Search dependencies are available.
 * ------------------------------------------------------------
 */

function testFusionSearch() {

    if (typeof card_db !== "function") {
        return false;
    }

    if (typeof fusionsList === "undefined") {
        return false;
    }

    if (typeof getCardById !== "function") {
        return false;
    }

    var cards = card_db().get();

    if (cards.length === 0) {
        return false;
    }

    var testCard = cards[0];
    var fusions = fusionsList[testCard.Id] || [];

    return Array.isArray(fusions);

}


/*
 * ------------------------------------------------------------
 * 2. OPTIONAL GLOBAL ACCESS
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
