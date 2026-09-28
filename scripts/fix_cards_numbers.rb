require 'json'
# Cards.json uses 1-indexing for card IDs and fusion lists, but 0-indexing for
# Equips and Rituals. This script corrects this by incrementing the IDs for
# Equip and Ritual blocks.

cards = JSON.parse(File.read("data/Cards.json"))

has_zero_based_reference = cards.any? do |card|
    equip_zero = card["Equip"]&.any? { |e| e.to_i == 0 }
    ritual_zero = card["Ritual"]&.any? { |_k, i| i.to_i == 0 }
    equip_zero || ritual_zero
end

if has_zero_based_reference
    cards.each do |card|
        card["Equip"].map! { |e| e.to_i + 1 } unless card["Equip"].nil?
        card["Ritual"].each { |k, i| card["Ritual"][k] = i.to_i + 1 } unless card["Ritual"].nil?
    end
end

# Try to match the original output by putting empty arrays together
output = JSON.pretty_generate(cards).gsub(/\[\s*\]/, "[]")
File.open("data/Cards.json", "w") { |file|
    file.write(output)
}
