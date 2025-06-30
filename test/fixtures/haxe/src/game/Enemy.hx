package game;

import game.Entity;

/**
 * Enemy character class
 */
class Enemy extends Entity {
    private var enemyType:EnemyType;
    private var lootChance:Float;
    
    /**
     * Constructor
     * @param name Enemy name
     * @param health Initial health
     * @param damage Attack damage
     */
    public function new(name:String, health:Int, damage:Int) {
        super(name, health, damage);
        this.enemyType = determineType(name);
        this.lootChance = calculateLootChance();
    }
    
    /**
     * Attack the target
     */
    public override function attack(target:IEntity):Void {
        if (!isAlive()) return;
        
        var actualDamage = calculateDamage();
        target.takeDamage(actualDamage);
        trace('$name attacks ${target.getName()} for $actualDamage damage!');
    }
    
    /**
     * Calculate damage based on enemy type
     */
    private function calculateDamage():Int {
        return switch (enemyType) {
            case GOBLIN: Std.int(damage * 0.8);
            case ORC: damage;
            case DRAGON: Std.int(damage * 1.5);
            case UNDEAD: Std.int(damage * 1.2);
        }
    }
    
    /**
     * Determine enemy type from name
     */
    private function determineType(name:String):EnemyType {
        var lowerName = name.toLowerCase();
        if (lowerName.indexOf("goblin") >= 0) return GOBLIN;
        if (lowerName.indexOf("orc") >= 0) return ORC;
        if (lowerName.indexOf("dragon") >= 0) return DRAGON;
        if (lowerName.indexOf("skeleton") >= 0 || lowerName.indexOf("zombie") >= 0) return UNDEAD;
        return GOBLIN; // default
    }
    
    /**
     * Calculate loot drop chance
     */
    private function calculateLootChance():Float {
        return switch (enemyType) {
            case GOBLIN: 0.3;
            case ORC: 0.5;
            case DRAGON: 0.9;
            case UNDEAD: 0.4;
        }
    }
    
    /**
     * Check if enemy drops loot
     */
    public function dropsLoot():Bool {
        return Math.random() < lootChance;
    }
    
    /**
     * Get enemy type
     */
    public function getType():EnemyType {
        return enemyType;
    }
}

/**
 * Enemy type enumeration
 */
enum EnemyType {
    GOBLIN;
    ORC;
    DRAGON;
    UNDEAD;
}