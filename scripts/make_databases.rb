#
# ------------------------------------------------------------
# FILE: scripts/make_databases.rb
# ------------------------------------------------------------
#
# Builds every derived database used by the project from
# data/Cards.json.
#
# Cards.json is the source of truth.
#
# Generated files:
#     data/fusions.json
#     data/fusions.js
#     data/equips.json
#     data/equips.js
#     data/results.json
#     data/results.js
#     data/rituals.json
#     data/rituals.js
#
# The generated databases use 1-based card IDs and preserve
# index 0 as the empty/null entry.
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

card_id_set = card_ids.to_h { |id| [id, true] }


validate_card_id = lambda do |id, context|
    unless id.is_a?(Integer)
        raise "Invalid card ID #{id.inspect} in #{context}; IDs must be integers"
    end

    unless card_id_set[id]
        raise "Invalid card ID #{id} in #{context}"
    end
end


#
# ------------------------------------------------------------
# 2. INITIALIZE DERIVED DATABASES
# ------------------------------------------------------------
#

expected_length = max_card_id + 1

fusions = Array.new(expected_length) { [] }
results = Array.new(expected_length) { [] }
equips = Array.new(expected_length) { [] }
rituals = Array.new(expected_length) { [] }

fusion_pair_results = {}
equip_pairs = {}
ritual_cards = {}


#
# ------------------------------------------------------------
# 3. BUILD FUSION DATABASE
# ------------------------------------------------------------
#
# Each source fusion creates one entry in each direction.
#
# A self-fusion only creates one entry because both directions
# would otherwise be identical duplicates.
#

cards.each do |card|
    id = card["Id"]
    validate_card_id.call(id, "card ID")

    fusions_source = card["Fusions"] || []

    unless fusions_source.is_a?(Array)
        raise "Invalid Fusions data for #{card["Name"]}; expected an array"
    end

    fusions_source.each do |fusion|
        unless fusion.is_a?(Hash) && fusion.key?("_card2") && fusion.key?("_result")
            raise "Invalid fusion entry for #{card["Name"]}"
        end

        card2 = fusion["_card2"]
        result = fusion["_result"]

        validate_card_id.call(card2, "fusion partner for #{card["Name"]}")
        validate_card_id.call(result, "fusion result for #{card["Name"]}")

        low_id, high_id = [id, card2].minmax
        pair_key = [low_id, high_id]

        if fusion_pair_results.key?(pair_key)
            existing_result = fusion_pair_results[pair_key]

            if existing_result == result
                raise "Duplicate fusion declaration for cards #{low_id} + #{high_id}"
            end

            raise "Multiple fusion results for cards #{low_id} + #{high_id}: " \
                  "#{existing_result} and #{result}"
        end

        fusion_pair_results[pair_key] = result

        fusions[id] << {
            "card" => card2,
            "result" => result
        }

        unless id == card2
            fusions[card2] << {
                "card" => id,
                "result" => result
            }
        end

        results[result] << {
            "card1" => low_id,
            "card2" => high_id
        }
    end
end


#
# ------------------------------------------------------------
# 4. BUILD EQUIP DATABASE
# ------------------------------------------------------------
#
# Equip relationships are reciprocal in equipsList.
#

equip_pairs = {}

equips_source_cards = cards

equips_source_cards.each do |card|
    id = card["Id"]
    validate_card_id.call(id, "card ID")

    equip_source = card["Equip"] || []

    unless equip_source.is_a?(Array)
        raise "Invalid Equip data for #{card["Name"]}; expected an array"
    end

    equip_source.each do |equip|
        target = equip
        validate_card_id.call(target, "equip for #{card["Name"]}")

        low_id, high_id = [id, target].minmax
        pair_key = [low_id, high_id]

        if equip_pairs.key?(pair_key)
            raise "Duplicate equip declaration for cards #{low_id} + #{high_id}"
        end

        equip_pairs[pair_key] = true
        equips[id] << target
        equips[target] << id
    end
end


equips.each do |list|
    list.uniq!
end


#
# ------------------------------------------------------------
# 5. BUILD RITUAL DATABASE
# ------------------------------------------------------------
#
# Each Ritual definition is stored under its RitualCard ID.
#

cards.each do |card|
    ritual_data = card["Ritual"]

    next if ritual_data.nil?

    unless ritual_data.is_a?(Hash)
        raise "Invalid Ritual data for #{card["Name"]}; expected an object"
    end

    required_keys = ["RitualCard", "Card1", "Card2", "Card3", "Result"]

    unless ritual_data.keys.sort == required_keys.sort
        raise "Invalid Ritual data for #{card["Name"]}; expected RitualCard, Card1, Card2, Card3, and Result"
    end

    ritual_card = ritual_data["RitualCard"]
    card1 = ritual_data["Card1"]
    card2 = ritual_data["Card2"]
    card3 = ritual_data["Card3"]
    result = ritual_data["Result"]

    validate_card_id.call(ritual_card, "ritual card for #{card["Name"]}")
    validate_card_id.call(card1, "ritual material 1 for #{card["Name"]}")
    validate_card_id.call(card2, "ritual material 2 for #{card["Name"]}")
    validate_card_id.call(card3, "ritual material 3 for #{card["Name"]}")
    validate_card_id.call(result, "ritual result for #{card["Name"]}")

    if ritual_cards.key?(ritual_card)
        raise "Duplicate ritual declaration for ritual card #{ritual_card}"
    end

    ritual_cards[ritual_card] = true

    rituals[ritual_card] << {
        "ritual_card" => ritual_card,
        "card1" => card1,
        "card2" => card2,
        "card3" => card3,
        "result" => result
    }
end


#
# ------------------------------------------------------------
# 6. WRITE GENERATED FILES
# ------------------------------------------------------------
#

# cards.js is the runtime JavaScript version of Cards.json.
# Keep it synchronized here so Cards.json remains the single
# source of truth for every generated runtime database.
#
cards_json = JSON.pretty_generate(cards)
File.write("data/cards.js", "var card_db = TAFFY(#{cards_json})")

outputs = {
    "fusions" => fusions,
    "equips" => equips,
    "results" => results,
    "rituals" => rituals
}

outputs.each do |name, data|
    json = JSON.pretty_generate(data)

    File.write("data/#{name}.json", json)
    File.write("data/#{name}.js", "var #{name}List = #{json}")
end


puts "Generated fusions, equips, results, and rituals databases."
puts "Cards: #{cards.length}"
puts "Fusion pairs: #{fusion_pair_results.length}"
puts "Equip pairs: #{equip_pairs.length}"
puts "Rituals: #{ritual_cards.length}"
