/*
 * ------------------------------------------------------------
 * FILE: data/fields.js
 * ------------------------------------------------------------
 *
 * Field cards are still Magic cards in the main card database
 * (Type 20). This separate database identifies which Magic cards
 * are specifically Field cards and records their Field effects.
 *
 * A Field card therefore has two classifications:
 * - card.Type === 20 (Magic)
 * - fieldList entry (Field card)
 *
 * Monster Type IDs come from data/types_and_stars.js.
 * ------------------------------------------------------------
 */

var fieldList = [

    {
        "CardId": 330,
        "PositiveTypes": [9, 4, 19, 5],
        "NegativeTypes": []
    },

    {
        "CardId": 331,
        "PositiveTypes": [10, 2, 18],
        "NegativeTypes": []
    },

    {
        "CardId": 332,
        "PositiveTypes": [0, 6, 15],
        "NegativeTypes": []
    },

    {
        "CardId": 333,
        "PositiveTypes": [3, 4],
        "NegativeTypes": []
    },

    {
        "CardId": 334,
        "PositiveTypes": [12, 13, 15, 16],
        "NegativeTypes": [14, 17]
    },

    {
        "CardId": 335,
        "PositiveTypes": [10, 2, 18],
        "NegativeTypes": []
    },

    {
        "CardId": 336,
        "PositiveTypes": [7, 1],
        "NegativeTypes": [8]
    }

];
