package game;

import game.Entity;

/**
 * Player abilities enum
 */
enum Ability {
    SLASH;
    HEAL;
    FIREBALL;
    SHIELD;
}

/**
 * Player character class
 */
class Player extends Entity {
    private var level:Int;
    private var experience:Int;
    private var totalDamageDealt:Int;
    
    public function new(name:String, health:Int, damage:Int) {
        super(name, health, damage);
        this.level = 1;
        this.experience = 0;
        this.totalDamageDealt = 0;
    }
    
    /**
     * Attack an enemy
     */
    public override function attack(target:IEntity):Void {
        var actualDamage = calculateDamage();
        target.takeDamage(actualDamage);
        totalDamageDealt += actualDamage;
        trace('$name attacks ${target.getName()} for $actualDamage damage!');
    }
    
    /**
     * Use an ability
     * @param ability The ability to use
     * @param target Optional target
     */
    public function useAbility(ability:Ability, ?target:IEntity):Void {
        switch (ability) {
            case SLASH:
                if (target != null) {
                    var damage = Std.int(this.damage * 1.5);
                    target.takeDamage(damage);
                    totalDamageDealt += damage;
                    trace('$name uses Slash on ${target.getName()}!');
                }
            case HEAL:
                var healAmount = 20;
                health = Std.int(Math.min(maxHealth, health + healAmount));
                trace('$name heals for $healAmount HP!');
            case FIREBALL:
                if (target != null) {
                    var damage = 25;
                    target.takeDamage(damage);
                    totalDamageDealt += damage;
                    trace('$name casts Fireball on ${target.getName()}!');
                }
            case SHIELD:
                trace('$name raises shield!');
        }
    }
    
    /**
     * Calculate damage with level modifier
     */
    private function calculateDamage():Int {
        return Std.int(damage + (level * 2));
    }
    
    /**
     * Gain experience
     * @param amount Experience points to gain
     */
    public function gainExperience(amount:Int):Void {
        experience += amount;
        var requiredExp = level * 100;
        
        if (experience >= requiredExp) {
            levelUp();
        }
    }
    
    /**
     * Level up the player
     */
    private function levelUp():Void {
        level++;
        var healthIncrease = 10;
        maxHealth += healthIncrease;
        health += healthIncrease;
        damage += 2;
        trace('$name leveled up to level $level!');
    }
    
    // Getters
    public function getLevel():Int {
        return level;
    }
    
    public function getExperience():Int {
        return experience;
    }
    
    public function getTotalDamageDealt():Int {
        return totalDamageDealt;
    }
    
    /**
     * Static function to create a default player
     */
    public static function createDefaultPlayer():Player {
        return new Player("DefaultHero", 100, 10);
    }
}