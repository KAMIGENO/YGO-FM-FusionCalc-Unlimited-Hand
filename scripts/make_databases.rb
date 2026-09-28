require 'json'

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

card_ids = cards.map { |card| card["Id"].to_i }
card_id_set = card_ids.to_h { |id| [id, true] }

raise "Cards.json must contain at least one card" if card_ids.empty?
raise "Duplicate card ID found in Cards.json" unless card_ids.uniq.length == card_ids.length
raise "Invalid card ID found in Cards.json" if card_ids.any? { |id| id <= 0 }

max_card_id = card_ids.max
expected_card_ids = (1..max_card_id).to_a

unless card_ids.sort == expected_card_ids
    raise "Cards.json card IDs must be contiguous from 1 through #{max_card_id}"
end


validate_card_id = lambda do |id, context|
    unless card_id_set[id]
        raise "Invalid card ID #{id} in #{context}"
    end
end


#
# ------------------------------------------------------------
# 2. INITIALIZE DERIVED DATABASES
# ------------------------------------------------------------
#

fusions = Array.new(max_card_id + 1) { [] }
results = Array.new(max_card_id + 1) { [] }
equips = Array.new(max_card_id + 1) { [] }

fusion_pair_results = {}
equip_pairs = {}


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
    id = card["Id"].to_i
    validate_card_id.call(id, "card ID")

    (card["Fusions"] || []).each do |fuse|
        card2 = fuse["_card2"].to_i
        result = fuse["_result"].to_i

        validate_card_id.call(card2, "fusion for #{card["Name"]}")
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
            :card => card2,
            :result => result
        }

        unless id == card2
            fusions[card2] << {
                :card => id,
                :result => result
            }
        end

        results[result] << {
            :card1 => low_id,
            :card2 => high_id
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

cards.each do |card|
    id = card["Id"].to_i

    (card["Equip"] || []).each do |equip|
        target = equip.to_i

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


#
# ------------------------------------------------------------
# 5. REMOVE ANY ACCIDENTAL DUPLICATES
# ------------------------------------------------------------
#
# This is defensive. The duplicate checks above should already
# prevent duplicates from entering the generated databases.
#

equips.each do |list|
    list.uniq!
end

results.each do |list|
    list.uniq!
end


#
# ------------------------------------------------------------
# 6. WRITE GENERATED FILES
# ------------------------------------------------------------
#

outputs = {
    "fusions" => fusions,
    "equips" => equips,
    "results" => results
}

outputs.each do |name, data|
    json = JSON.pretty_generate(data)

    File.write("data/#{name}.json", json)
    File.write("data/#{name}.js", "var #{name}List = #{json}")
end


puts "Generated fusions, equips, and results databases."
puts "Cards: #{cards.length}"
puts "Fusion pairs: #{fusion_pair_results.length}"
puts "Equip pairs: #{equip_pairs.length}"
