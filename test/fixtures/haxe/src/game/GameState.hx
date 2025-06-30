package game;

import game.Player;
import game.Enemy;

/**
 * Game state manager
 */
class GameState {
    private var player:Player;
    private var enemies:Array<Enemy>;
    private var isRunning:Bool;
    private var turnCount:Int;
    
    /**
     * Game difficulty levels
     */
    public static inline var EASY:Int = 0;
    public static inline var NORMAL:Int = 1;
    public static inline var HARD:Int = 2;
    
    private var difficulty:Int;
    
    public function new(?difficulty:Int = NORMAL) {
        this.enemies = [];
        this.isRunning = true;
        this.turnCount = 0;
        this.difficulty = difficulty;
    }
    
    /**
     * Set the player
     */
    public function setPlayer(player:Player):Void {
        this.player = player;
    }
    
    /**
     * Get the player
     */
    public function getPlayer():Player {
        return player;
    }
    
    /**
     * Add an enemy
     */
    public function addEnemy(enemy:Enemy):Void {
        enemies.push(enemy);
    }
    
    /**
     * Remove an enemy
     */
    public function removeEnemy(enemy:Enemy):Bool {
        return enemies.remove(enemy);
    }
    
    /**
     * Get all enemies
     */
    public function getEnemies():Array<Enemy> {
        return enemies.filter(function(e) return e.isAlive());
    }
    
    /**
     * Check if game is running
     */
    public function getIsRunning():Bool {
        return isRunning && player != null && player.isAlive();
    }
    
    /**
     * Set running state
     */
    public function setRunning(running:Bool):Void {
        isRunning = running;
    }
    
    /**
     * Increment turn counter
     */
    public function nextTurn():Void {
        turnCount++;
    }
    
    /**
     * Get current turn
     */
    public function getTurnCount():Int {
        return turnCount;
    }
    
    /**
     * Get difficulty
     */
    public function getDifficulty():Int {
        return difficulty;
    }
    
    /**
     * Calculate score
     */
    public function calculateScore():Int {
        if (player == null) return 0;
        
        var score = 0;
        score += player.getLevel() * 100;
        score += player.getTotalDamageDealt();
        score += (enemies.length - getEnemies().length) * 50; // defeated enemies
        score *= (difficulty + 1); // difficulty multiplier
        
        return score;
    }
    
    /**
     * Save game state (simplified)
     */
    public function save():Dynamic {
        return {
            playerHealth: player.getHealth(),
            playerLevel: player.getLevel(),
            enemyCount: enemies.length,
            turnCount: turnCount,
            difficulty: difficulty
        };
    }
    
    /**
     * Load game state (simplified)
     */
    public static function load(data:Dynamic):GameState {
        var state = new GameState(data.difficulty);
        state.turnCount = data.turnCount;
        // Additional loading logic would go here
        return state;
    }
}