#
# ------------------------------------------------------------
# FILE: scripts/validate_databases.rb
# ------------------------------------------------------------
#
# Validates Cards.json and every generated database.
#
# This script checks both the source relationships and the
# generated files so stale or inconsistent databases fail fast.
#

require 'json'


#
# ------------------------------------------------------------
# 1. LOAD FILES
# ------------------------------------------------------------
#

cards = JSON.parse(File.read("data/Cards.json"))
fusions = JSON.parse(File.read("data/fusions.json"))
equips = JSON.parse(File.read("data/equips.json"))
results = JSON.parse(File.read("data/results.json"))


# Verify that each JavaScript database contains the same data as
# its JSON counterpart.
generated_js = {
    "fusions" => fusions,
    "equips" => equips,
    "results" => results
}

generated_js.each do |name, expected_data|
    prefix = "var #{name}List = "
    javascript = File.read("data/#{name}.js")

    unless javascript.start_with?(prefix)
        raise "data/#{name}.js has an unexpected variable declaration"
    end

    embedded_json = javascript.delete_prefix(prefix)
    embedded_data = JSON.parse(embedded_json)

    unless embedded_data == expected_data
        raise "data/#{name}.js does not match data/#{name}.json"
    end
end


#
# ------------------------------------------------------------
# 2. VALIDATE CARD IDS
# ------------------------------------------------------------
#

card_ids = cards.map { |card| card["Id"].to_i }

raise "Cards.json is empty" if card_ids.empty?
raise "Duplicate card ID found" unless card_ids.uniq.length == card_ids.length
raise "Invalid card ID found" if card_ids.any? { |id| id <= 0 }

max_card_id = card_ids.max

unless card_ids.sort == (1..max_card_id).to_a
    raise "Card IDs are not contiguous from 1 through #{max_card_id}"
end

card_id_set = card_ids.to_h { |id| [id, true] }


validate_card_id = lambda do |id, context|
    unless card_id_set[id]
        raise "Invalid card ID #{id} in #{context}"
    end
end


#
# ------------------------------------------------------------
# 3. VALIDATE GENERATED ARRAY SHAPES
# ------------------------------------------------------------
#

expected_length = max_card_id + 1

{
    "fusions" => fusions,
    "equips" => equips,
    "results" => results
}.each do |name, database|

    unless database.length == expected_length
        raise "#{name}.json must contain #{expected_length} entries"
    end

    unless database[0] == []
        raise "#{name}.json index 0 must be an empty array"
    end

end


#
# ------------------------------------------------------------
# 4. REBUILD EXPECTED DATABASES FROM Cards.json
# ------------------------------------------------------------
#

expected_fusions = Array.new(expected_length) { [] }
expected_equip_pairs = {}
expected_results = Array.new(expected_length) { [] }

fusion_pairs = {}

cards.each do |card|
    id = card["Id"].to_i
    validate_card_id.call(id, "card ID")

    (card["Fusions"] || []).each do |fusion|
        card2 = fusion["_card2"].to_i
        result = fusion["_result"].to_i

        validate_card_id.call(card2, "fusion partner for #{card["Name"]}")
        validate_card_id.call(result, "fusion result for #{card["Name"]}")

        low_id, high_id = [id, card2].minmax
        pair_key = [low_id, high_id]

        if fusion_pairs.key?(pair_key)
            raise "Multiple or duplicate source fusion for #{low_id} + #{high_id}"
        end

        fusion_pairs[pair_key] = result

        expected_fusions[id] << {
            "card" => card2,
            "result" => result
        }

        unless id == card2
            expected_fusions[card2] << {
                "card" => id,
                "result" => result
            }
        end

        expected_results[result] << {
            "card1" => low_id,
            "card2" => high_id
        }
    end

    (card["Equip"] || []).each do |equip|
        target = equip.to_i

        validate_card_id.call(target, "equip for #{card["Name"]}")

        low_id, high_id = [id, target].minmax
        pair_key = [low_id, high_id]

        if expected_equip_pairs.key?(pair_key)
            raise "Duplicate source equip relationship for #{low_id} + #{high_id}"
        end

        expected_equip_pairs[pair_key] = true
    end
end


expected_equips = Array.new(expected_length) { [] }

expected_equip_pairs.each_key do |low_id, high_id|
    expected_equips[low_id] << high_id
    expected_equips[high_id] << low_id
end


#
# ------------------------------------------------------------
# 5. VALIDATE EXACT GENERATED CONTENT
# ------------------------------------------------------------
#

unless fusions == expected_fusions
    raise "fusions.json does not match Cards.json"
end

unless equips == expected_equips
    raise "equips.json does not match Cards.json"
end

unless results == expected_results
    raise "results.json does not match Cards.json"
end


#
# ------------------------------------------------------------
# 6. VALIDATE FUSION SYMMETRY AND UNIQUENESS
# ------------------------------------------------------------
#

fusions.each_with_index do |fusion_list, card_id|

    seen_partners = {}

    fusion_list.each do |fusion|
        partner_id = fusion["card"]
        result_id = fusion["result"]

        validate_card_id.call(partner_id, "generated fusion partner")
        validate_card_id.call(result_id, "generated fusion result")

        key = [partner_id, result_id]

        raise "Duplicate generated fusion at card #{card_id}" if seen_partners.key?(key)

        seen_partners[key] = true

        reverse_exists = fusions[partner_id].any? do |reverse|
            reverse["card"] == card_id && reverse["result"] == result_id
        end

        unless reverse_exists
            raise "Asymmetric fusion: #{card_id} + #{partner_id}"
        end
    end

end


#
# ------------------------------------------------------------
# 7. VALIDATE EQUIP SYMMETRY AND UNIQUENESS
# ------------------------------------------------------------
#

equips.each_with_index do |equip_list, card_id|

    raise "Duplicate generated equip at card #{card_id}" unless equip_list.uniq == equip_list

    equip_list.each do |target_id|
        validate_card_id.call(target_id, "generated equip target")

        unless equips[target_id].include?(card_id)
            raise "Asymmetric equip: #{card_id} + #{target_id}"
        end
    end

end


#
# ------------------------------------------------------------
# 8. VALIDATE RESULTS
# ------------------------------------------------------------
#

results.each_with_index do |result_list, result_id|

    result_list.each do |result|
        card1 = result["card1"]
        card2 = result["card2"]

        validate_card_id.call(card1, "generated result card1")
        validate_card_id.call(card2, "generated result card2")

        unless card1 <= card2
            raise "Result pair is not canonical: #{card1} + #{card2}"
        end

        expected_result = fusion_pairs[[card1, card2]]

        unless expected_result == result_id
            raise "Result #{result_id} does not match #{card1} + #{card2}"
        end
    end

end


#
# ------------------------------------------------------------
# 9. SUMMARY
# ------------------------------------------------------------
#

fusion_count = fusion_pairs.length
equip_count = expected_equip_pairs.length
result_count = results.sum(&:length)

raise "Unexpected result count" unless result_count == fusion_count

puts "Database validation passed."
puts "Cards: #{cards.length}"
puts "Fusion pairs: #{fusion_count}"
puts "Equip pairs: #{equip_count}"
puts "Result entries: #{result_count}"
