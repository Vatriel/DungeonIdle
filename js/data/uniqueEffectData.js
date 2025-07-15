// js/data/uniqueEffectData.js
// Ce fichier contient les descriptions des effets uniques pour les infobulles de l'interface.

export const UNIQUE_EFFECT_DESCRIPTIONS = {
    // --- Catégorie 1: Effets Déclenchés ---
    OPPORTUNIST_DAGGER: "Les coups critiques appliquent un Saignement à la cible, infligeant 150% des dégâts de votre coup sur 5 secondes.",
    EARTHQUAKE_MACE: "Chaque coup a 10% de chances d'étourdir la cible pendant 0.75 seconde.",
    VENGEANCE_HELM: "Lorsqu'un allié est vaincu, vos dégâts sont augmentés de 100% pendant 10 secondes.",
    BLOODTHIRSTY_ARMOR: "Chaque fois que vous tuez un ennemi, vous récupérez 8% de votre maximum de points de vie.",
    SURGICAL_GLOVES: "Toutes les 5 attaques que vous portez, la prochaine est un coup critique garanti.",
    PURSUIT_LEGGINGS: "Après avoir tué un ennemi, votre vitesse d'attaque est augmentée de 30% pendant 5 secondes.",
    ELUSIVE_BOOTS: "Chaque fois que vous déclenchez une Riposte, vous gagnez +20% de vitesse d'attaque pendant 3 secondes.",
    PHOENIX_AMULET: "Une fois par combat, lorsque vos PV devraient passer sous 1, ils sont restaurés à 50% de leur maximum.",
    VINDICATION_RING: "Quand vous subissez un coup infligeant plus de 20% de votre vie maximale, votre prochaine attaque inflige +200% de dégâts.",
    ARCANE_ECHO_TRINKET: "Vos sorts de soin ou de buff ont 20% de chances de se déclencher une seconde fois sur la même cible avec 50% d'efficacité.",
    SPLINTERING_ARROW_BOW: "Vos coups critiques ont 50% de chances de ricocher, infligeant 50% de leurs dégâts à un autre ennemi aléatoire.",
    REFLECTIVE_SHIELD: "En subissant des dégâts, vous accumulez 10% de ces dégâts. La prochaine attaque du porteur libère ces dégâts accumulés en bonus.",
    FLEETING_SHADOW_CLOAK: "Après un coup critique, vous avez 15% de chance de devenir invisible pendant 2 secondes, empêchant les ennemis de vous cibler.",

    // --- Catégorie 2: Synergie et Conversion ---
    CLEAR_MIND_DIADEM: "Vous gagnez +1% de Chance de Coup Critique pour chaque tranche de 10 points d'Intelligence.",
    SENTINEL_HARNESS: "Vous gagnez +1% de réduction de dégâts pour chaque tranche de 10% de points de vie qu'il vous manque.",
    STOIC_GUARDIAN_GAUNTLETS: "Votre statistique de Régénération de PV s'applique également à l'allié ayant le moins de PV, à hauteur de 30% de son efficacité.",
    MOUNTAIN_GREAVES: "Augmente votre Armure d'un montant égal à 5% de votre maximum de points de vie.",
    BALANCE_BOOTS: "Votre attribut principal (Force, Dextérité ou Intelligence) est augmenté de 15% de la somme de vos deux autres attributs.",
    VITAL_TRANSMUTATION_NECKLACE: "Votre statistique de Vol de Vie est augmentée de 25% de votre Chance de Coup Critique.",
    MANA_THIEF_RING: "Vos attaques ont 25% de chances de restaurer 2% de leur mana maximum aux autres alliés.",
    ARCHIVIST_SEAL: "Vous gagnez +1 à tous les attributs (For, Dex, Int, End) tous les 5 niveaux de héros.",
    ICE_ESSENCE: "Vos attaques ont une chance de Glacer les ennemis, réduisant leur vitesse d'attaque de 15%. La chance est égale à votre % de Chance de Coup Critique.",
    BLOODLETTER_AXE: "Vos dégâts sont augmentés d'un montant égal à 100% de votre régénération de PV par seconde.",
    SOUL_SIPHON_WAND: "Vos sorts de soins infligent également des dégâts à votre cible ennemie, à hauteur de 30% des soins prodigués.",
    SPIRIT_FORCE_ROBE: "Convertit 25% de votre Force en Puissance des Soins.",

    // --- Catégorie 3: Auras et Soutien ---
    LEADERS_HELM: "(Aura) Augmente la Vitesse d'Attaque de tous les alliés de 5%.",
    BROTHERHOOD_BREASTPLATE: "(Aura) Tous les alliés gagnent +50 Armure.",
    MENTORS_GAUNTLETS: "Lorsque le porteur gagne de l'expérience, tous les autres alliés en gagnent 10%.",
    CONFIDENT_STEP_LEGGINGS: "(Aura) Augmente la statistique de Riposte de tous les alliés de 3%.",
    HERALDS_BOOTS: "(Aura) Augmente le gain d'Or de tous les alliés de 15%.",
    HARMONY_PENDANT: "(Aura) Réduit les dégâts subis par tous les alliés de 3%.",
    PROTECTIVE_BOND_RING: "Le porteur redirige 5% de tous les dégâts subis par les autres alliés sur lui-même.",
    FURY_TOTEM: "(Aura) Augmente les Dégâts Critiques de tous les alliés de 20%.",
    PATRIARCHS_STAFF: "(Aura) Augmente l'efficacité des soins reçus par tous les alliés de 10%.",
    RALLYING_HORN: "(Aura) Augmente la statistique d'Endurance de tous les alliés de 5%.",
    BANNER_OF_COURAGE: "(Aura) Les alliés infligent 10% de dégâts supplémentaires aux Boss.",
    UNITY_FOCALIZER: "Les buffs monocibles que vous lancez s'appliquent aussi à un autre allié aléatoire avec 33% de leur efficacité.",

    // --- Catégorie 4: Objets Maudits ---
    MADMANS_MASK: "+30% Dégâts Critiques, -10% Chance de Coup Critique.",
    GLASS_ARMOR: "Augmente les dégâts que vous infligez de 25%, mais augmente aussi les dégâts que vous subissez de 25%.",
    MISERS_GRIPS: "Double tous les gains d'Or, mais le porteur ne peut pas être soigné par les autres héros (le Vol de Vie fonctionne toujours).",
    ANCHOR_LEGGINGS: "+50% Armure et +25% PV. En contrepartie, votre Vitesse d'Attaque est réduite de 30%.",
    DAREDEVILS_BOOTS: "Vous commencez toujours le combat avec +50% de vitesse d'attaque pendant 5 secondes, mais votre armure est réduite à 0 pendant ce temps.",
    OMNISCIENTS_PERIL: "+25 Intelligence, mais réduit la Force et la Dextérité à 1.",
    DRUNKARDS_RING: "+20 Force, mais -15% Vitesse d'Attaque et -10% Chance de Coup Critique.",
    HERMITS_RING: "+20% à toutes les statistiques de base (For, Dex, Int, End) si le porteur est le seul héros dans le groupe.",
    SACRIFICIAL_IDOL: "Le porteur sacrifie 20% de sa vie maximale au début de chaque combat pour accorder +15% de dégâts à tous les autres alliés pendant 10 secondes.",
    VORPAL_BLADE: "Dégâts et Chance de Critique massivement augmentés, mais chaque coup a 5% de chance de vous infliger 10% de votre vie maximale en dégâts purs.",
    ARCHLICH_SCEPTER: "Vos sorts sont 40% plus puissants, mais consomment également 5% de votre vie maximale à chaque lancement.",
    MARTYRS_CHARM: "Vous redirigez 15% de tous les dégâts subis par l'allié avec le moins de PV sur vous-même. Vous subissez ces dégâts comme des dégâts purs (ignorants l'armure).",

    // --- NOUVEAUX EFFETS POUR LE FLIBUSTIER ---
    DOUBLOON_PISTOL: "Chaque coup a 10% de chances de générer 1 Doublon d'Or.",
    KRAKEN_MUSKET: "Inflige +20% de dégâts pour chaque effet de Poison actif sur la cible.",
    PIRATE_KING_RING: "La mécanique 'La Fortune du Flibustier' est 50% plus efficace.",
    TOAD_VENOM_VIAL: "Le Poison appliqué par 'Lames Enduites' dure 3 secondes de plus et ses dégâts sont augmentés de 25%.",
    VETERAN_ACCORDION: "Les chants de marin déclenchés par 'Pillage ou Poudre !' ont une durée et une efficacité augmentées de 40%.",
    DAVY_JONES_CHEST: "Augmente la Découverte d'Or de 100%, mais le porteur perd 1% de sa vie maximale par seconde."
};
