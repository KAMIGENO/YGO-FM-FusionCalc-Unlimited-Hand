require 'json'

# Fusion Format:
# { :card => Y, :result => Z }
# Equip Format: Just list of card #s
# Result Format:
# { :card1 => X, :card2 => Y } preferably with X < Y
# Cards are indexed from 1, leaving a null entry at index 0 for each list. To
# keep this as a special value, every card's index will be initialized.

cards = JSON.parse(File.read("data/Cards.json"))

# The database format depends on card IDs being valid 1-based indices.
card_ids = cards.map { |card| card["Id"].to_i }
card_id_set = card_ids.to_h { |id| [id, true] }

raise "Duplicate card ID found in Cards.json" unless card_ids.uniq.length == card_ids.length
raise "Invalid card ID found in Cards.json" if card_ids.any? { |id| id <= 0 }

max_card_id = card_ids.max

validate_card_id = lambda do |id, context|
    unless card_id_set[id]
        raise "Invalid card ID #{id} in #{context}"
    end
end

fusions = []
results = []
equips = []

cards.each do |card|
    id = card["Id"].to_i
    validate_card_id.call(id, "card ID")

    fusions[id] = [] if fusions[id].nil?
    results[id] = [] if results[id].nil?
    equips[id] = [] if equips[id].nil?
    if not card["Fusions"].nil?
        # Set up the card's entry in the array if necessary
        fusions[id] = [] if fusions[id].nil?
        card["Fusions"].each do |fuse|
            # Get the indices of the other input card and the result
            card2 = fuse["_card2"].to_i
            result = fuse["_result"].to_i

            validate_card_id.call(card2, "fusion for #{card["Name"]}")
            validate_card_id.call(result, "fusion result for #{card["Name"]}")

            fusions[card2] = [] if fusions[card2].nil?

            # Add the new fusion to both directions.
            # A self-fusion has the same source and target card, so adding both
            # directions would create the exact same entry twice.
            fusions[id] << {:card => card2, :result => result}
            unless id == card2
                fusions[card2] << {:card => id, :result => result}
            end

            results[result] = [] if results[result].nil?
            results[result] << {:card1 => id, :card2 => card2}
        end
    end

    if not card["Equip"].nil?
        equips[id] = [] if equips[id].nil?
        card["Equip"].each do |equip|
            target = equip.to_i
            validate_card_id.call(target, "equip for #{card["Name"]}")
            equips[target] = [] if equips[target].nil?
            equips[target] << id
            equips[id] << target
        end
    end
end

output = JSON.pretty_generate fusions
File.open("data/fusions.json", "w") { |file|
    file.write(output)
}
File.open("data/fusions.js", "w") { |file|
    file.write("var fusionsList = #{output}")
}
