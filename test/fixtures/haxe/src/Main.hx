package;

import game.Player;
import game.Enemy;
import game.GameState;
import utils.MathUtils;
import utils.Logger;

/**
 * Main application entry point
 */
class Main {
    static var instance:Main;
    private var gameState:GameState;
    private var logger:Logger;
    
    public function new() {
        logger = new Logger("Main");
        gameState = new GameState();
    }
    
    /**
     * Application entry point
     */
    public static function main() {
        instance = new Main();
        instance.run();
    }
    
    /**
     * Run the game
     */
    private function run():Void {
        logger.info("Starting game...");
        
        // Create player
        var player = new Player("Hero", 100, 10);
        gameState.setPlayer(player);
        
        // Create enemies
        var enemies = [
            new Enemy("Goblin", 30, 5),
            new Enemy("Orc", 50, 8),
            new Enemy("Dragon", 200, 20)
        ];
        
        for (enemy in enemies) {
            gameState.addEnemy(enemy);
        }
        
        // Game loop simulation
        simulateGameLoop();
        
        logger.info("Game finished!");
    }
    
    /**
     * Simulate game loop
     */
    private function simulateGameLoop():Void {
        var turns = 0;
        
        while (gameState.getIsRunning() && turns < 10) {
            logger.debug('Turn ${turns + 1}');
            
            // Player turn
            var enemies = gameState.getEnemies();
            if (enemies.length > 0) {
                var target = enemies[0];
                gameState.getPlayer().attack(target);
                
                if (target.getHealth() <= 0) {
                    gameState.removeEnemy(target);
                    logger.info('${target.getName()} defeated!');
                }
            }
            
            // Enemy turns
            for (enemy in gameState.getEnemies()) {
                enemy.attack(gameState.getPlayer());
            }
            
            // Check game over
            if (gameState.getPlayer().getHealth() <= 0) {
                gameState.setRunning(false);
                logger.error("Game Over!");
            }
            
            turns++;
        }
        
        // Print statistics
        printStats();
    }
    
    /**
     * Print game statistics
     */
    private function printStats():Void {
        var player = gameState.getPlayer();
        trace('Final Stats:');
        trace('  Player Health: ${player.getHealth()}/${player.getMaxHealth()}');
        trace('  Enemies Remaining: ${gameState.getEnemies().length}');
        trace('  Damage Dealt: ${player.getTotalDamageDealt()}');
    }
    
    /**
     * Static utility function
     */
    public static function getInstance():Main {
        return instance;
    }
}