package game;

/**
 * Base interface for game entities
 */
interface IEntity {
    function getName():String;
    function getHealth():Int;
    function takeDamage(amount:Int):Void;
    function isAlive():Bool;
}

/**
 * Base class for entities
 */
class Entity implements IEntity {
    private var name:String;
    private var health:Int;
    private var maxHealth:Int;
    private var damage:Int;
    
    public function new(name:String, health:Int, damage:Int) {
        this.name = name;
        this.health = health;
        this.maxHealth = health;
        this.damage = damage;
    }
    
    public function getName():String {
        return name;
    }
    
    public function getHealth():Int {
        return health;
    }
    
    public function getMaxHealth():Int {
        return maxHealth;
    }
    
    public function takeDamage(amount:Int):Void {
        health = Std.int(Math.max(0, health - amount));
    }
    
    public function isAlive():Bool {
        return health > 0;
    }
    
    /**
     * Attack another entity
     * @param target The target to attack
     */
    public function attack(target:IEntity):Void {
        throw "attack() must be overridden";
    }
}