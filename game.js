import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.1/three.module.min.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 10, 5);
scene.add(directionalLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5;
scene.add(ground);

// Player (NTB)
const playerGeometry = new THREE.BoxGeometry(1, 1, 1);

// Create a canvas texture for 'NTB' text
function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 128;
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 48px Arial';
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    return new THREE.CanvasTexture(canvas);
}

const ntbTexture = createTextTexture('NTB');

const playerMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // Right
    new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // Left
    new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // Top
    new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // Bottom
    new THREE.MeshStandardMaterial({ map: ntbTexture }), // Back (where NTB is)
    new THREE.MeshStandardMaterial({ color: 0x00ff00 })  // Front
];

const player = new THREE.Mesh(playerGeometry, playerMaterials);
player.position.set(0, 0.5, 5); // Start player slightly above ground and forward
scene.add(player);

camera.position.set(0, 5, 10); // Camera position
camera.lookAt(player.position);

// Game variables
let isJumping = false;
let jumpVelocity = 0;
const GRAVITY = -0.05;
const JUMP_FORCE = 0.8;
const PLAYER_START_Y = 0.5;

let obstacles = [];
const OBSTACLE_SPEED = 0.1;
const OBSTACLE_SPAWN_INTERVAL = 1500; // milliseconds
let lastSpawnTime = 0;
let score = 0;
let gameOver = false;

// UI elements
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-btn');

// Functions
function createObstacle() {
    const obstacleGeometry = new THREE.BoxGeometry(1, Math.random() * 1 + 0.5, 1); // Random height
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);

    // Spawn from random direction (for simplicity, let's make them appear from a range of Z positions)
    // and slightly off-center X to make it more challenging
    const spawnX = (Math.random() - 0.5) * 10; // -5 to 5
    const spawnZ = -50; // Far away
    obstacle.position.set(spawnX, obstacle.geometry.parameters.height / 2, spawnZ);
    scene.add(obstacle);
    obstacles.push(obstacle);
}

function updatePlayer() {
    if (isJumping) {
        player.position.y += jumpVelocity;
        jumpVelocity += GRAVITY;

        if (player.position.y <= PLAYER_START_Y) {
            player.position.y = PLAYER_START_Y;
            isJumping = false;
            jumpVelocity = 0;
        }
    }
}

function updateObstacles() {
    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].position.z += OBSTACLE_SPEED; // Move towards camera

        // Remove if out of view
        if (obstacles[i].position.z > camera.position.z + 5) {
            scene.remove(obstacles[i]);
            obstacles.splice(i, 1);
            i--; // Adjust index after removal
            score++;
            scoreElement.textContent = `Score: ${score}`;
        }
    }
}

function checkCollisions() {
    const playerBox = new THREE.Box3().setFromObject(player);
    for (let i = 0; i < obstacles.length; i++) {
        const obstacleBox = new THREE.Box3().setFromObject(obstacles[i]);
        if (playerBox.intersectsBox(obstacleBox)) {
            gameOver = true;
            stopGame();
            break;
        }
    }
}

function stopGame() {
    gameOverElement.style.display = 'flex';
    finalScoreElement.textContent = score;
    // Disable input or stop animation loop if needed
}

function resetGame() {
    // Clear existing obstacles
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];

    // Reset player position
    player.position.set(0, PLAYER_START_Y, 5);
    isJumping = false;
    jumpVelocity = 0;

    // Reset score and game state
    score = 0;
    scoreElement.textContent = `Score: ${score}`;
    gameOver = false;
    gameOverElement.style.display = 'none';

    lastSpawnTime = performance.now(); // Reset spawn timer
    animate(); // Restart animation loop
}

// Event Listeners
window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !isJumping && !gameOver) {
        isJumping = true;
        jumpVelocity = JUMP_FORCE;
    }
});

restartButton.addEventListener('click', resetGame);

// Animation loop
function animate(currentTime) {
    if (gameOver) return; // Stop animation if game is over

    requestAnimationFrame(animate);

    // Obstacle spawning
    if (currentTime - lastSpawnTime > OBSTACLE_SPAWN_INTERVAL) {
        createObstacle();
        lastSpawnTime = currentTime;
    }

    updatePlayer();
    updateObstacles();
    checkCollisions();

    renderer.render(scene, camera);
}

// Start the game
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});