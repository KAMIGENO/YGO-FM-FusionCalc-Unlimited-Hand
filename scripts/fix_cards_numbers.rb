#
# ------------------------------------------------------------
# FILE: scripts/fix_cards_numbers.rb
# ------------------------------------------------------------
#
# Converts Equip and Ritual references from the old 0-based
# numbering to the project's current 1-based card IDs.
#
# This script is intentionally safe to run more than once.
# It converts only when a zero-based reference is detected and
# refuses to modify a dataset that contains mixed numbering or
# malformed reference values.
#

require 'json'


#
# ------------------------------------------------------------
# 1. LOAD AND VALIDATE CARD IDS
# ------------------------------------------------------------
#

cards = JSON.parse(File.read("data/Cards.json"))

card_ids = cards.map { |card| card["Id"] }

raise "Cards.json must contain at least one card" if card_ids.empty?
raise "Card IDs in Cards.json must be integers" unless card_ids.all? { |id| id.is_a?(Integer) }
raise "Duplicate card ID found in Cards.json" unless card_ids.uniq.length == card_ids.length
raise "Invalid card ID found in Cards.json" if card_ids.any? { |id| id <= 0 }

max_card_id = card_ids.max
expected_card_ids = (1..max_card_id).to_a

unless card_ids.sort == expected_card_ids
    raise "Cards.json card IDs must be contiguous from 1 through #{max_card_id}"
end


#
# ------------------------------------------------------------
# 2. COLLECT EQUIP AND RITUAL REFERENCES
# ------------------------------------------------------------
#

references = []

cards.each do |card|
    (card["Equip"] || []).each do |reference|
        references << ["Equip", card["Id"], reference]
    end

    (card["Ritual"] || {}).each do |ritual_name, reference|
        references << ["Ritual #{ritual_name}", card["Id"], reference]
    end
end


#
# ------------------------------------------------------------
# 3. VALIDATE REFERENCE TYPES
# ------------------------------------------------------------
#

invalid_reference = references.find do |_kind, _card_id, reference|
    !reference.is_a?(Integer)
end

if invalid_reference
    kind, card_id, reference = invalid_reference
    raise "Invalid #{kind} reference #{reference.inspect} on card #{card_id}; references must be integers"
end


#
# ------------------------------------------------------------
# 4. DETERMINE THE NUMBERING MODE
# ------------------------------------------------------------
#

# A zero value proves that at least one reference is still using
# the old 0-based numbering.
#
# If zero is present, every reference must be within 0..max-1.
# Otherwise the data is mixed and the script stops rather than
# silently shifting already-correct references.
#
# If zero is absent, every reference must already be within
# 1..max. The script then makes no changes.

has_zero_based_reference = references.any? { |_kind, _card_id, reference| reference == 0 }

if has_zero_based_reference
    invalid_reference = references.find do |_kind, _card_id, reference|
        reference < 0 || reference >= max_card_id
    end

    if invalid_reference
        kind, card_id, reference = invalid_reference
        raise "Mixed or invalid #{kind} reference #{reference} on card #{card_id}; refusing to modify Cards.json"
    end

    cards.each do |card|
        unless card["Equip"].nil?
            card["Equip"].map! { |reference| reference + 1 }
        end

        unless card["Ritual"].nil?
            card["Ritual"].each do |ritual_name, reference|
                card["Ritual"][ritual_name] = reference + 1
            end
        end
    end
else
    invalid_reference = references.find do |_kind, _card_id, reference|
        reference < 1 || reference > max_card_id
    end

    if invalid_reference
        kind, card_id, reference = invalid_reference
        raise "Invalid #{kind} reference #{reference} on card #{card_id}; refusing to modify Cards.json"
    end
end


#
# ------------------------------------------------------------
# 5. WRITE NORMALIZED CARDS.JSON
# ------------------------------------------------------------
#

if has_zero_based_reference
    output = JSON.pretty_generate(cards).gsub(/\[\s*\]/, "[]")
    File.write("data/Cards.json", output)

    puts "Card reference numbering validated."
    puts "Converted zero-based references."
else
    puts "Card reference numbering validated."
    puts "No conversion was necessary."
end
