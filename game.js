import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.1/three.module.min.js';

// Sound effects
const jumpSound = new Audio('sounds/jump.mp3'); // Placeholder path
const gameOverSound = new Audio('sounds/game_over.mp3'); // Placeholder path

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

// Player (NTB Humanoid)
const playerGroup = new THREE.Group();

// Body
const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.5);
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
body.position.y = 0.6; // Relative to group center
playerGroup.add(body);

// Head
const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
const head = new THREE.Mesh(headGeometry, headMaterial);
head.position.y = 1.5; // Relative to group center
playerGroup.add(head);

// Arms (simple boxes)
const armGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
const armMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const leftArm = new THREE.Mesh(armGeometry, armMaterial);
leftArm.position.set(-0.5, 0.6, 0);
playerGroup.add(leftArm);
const rightArm = new THREE.Mesh(armGeometry, armMaterial);
rightArm.position.set(0.5, 0.6, 0);
playerGroup.add(rightArm);

// Legs (simple boxes)
const legGeometry = new THREE.BoxGeometry(0.3, 1.0, 0.3);
const legMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
leftLeg.position.set(-0.25, -0.4, 0);
playerGroup.add(leftLeg);
const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
rightLeg.position.set(0.25, -0.4, 0);
playerGroup.add(rightLeg);

// Create a canvas texture for 'NTB' text on the back of the body
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

// Apply NTB texture to the back face of the body
const bodyMaterials = body.material.slice(); // Clone materials array
bodyMaterials[4] = new THREE.MeshStandardMaterial({ map: ntbTexture }); // Back face is index 4
body.material = bodyMaterials;

playerGroup.position.set(0, 0.5, 5); // Start player slightly above ground and forward
scene.add(playerGroup);

camera.position.set(0, 5, 10); // Camera position
camera.lookAt(playerGroup.position);

// Game variables
let isJumping = false;
let jumpVelocity = 0;
const GRAVITY = -0.05;
const JUMP_FORCE = 0.8;
const PLAYER_START_Y = 0.5; // Base Y position for the player group

let obstacles = [];
const OBSTACLE_SPEED = 0.1;
const OBSTACLE_SPAWN_INTERVAL = 1500; // milliseconds
let lastSpawnTime = 0;
let score = 0;
let gameOver = false;

// Player movement variables
const PLAYER_SPEED = 0.2;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

// Walking animation variables
let walkCycle = 0;
const WALK_SPEED = 0.1; // How fast the walk cycle progresses
const WALK_BOB_AMOUNT = 0.05; // How much the player bobs up and down
const ARM_LEG_SWING_AMOUNT = Math.PI / 8; // How much arms/legs swing

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

    // Spawn from random direction (X+, X-, Z+, Z-)
    const spawnDistance = 30; // How far away obstacles spawn
    const spawnSide = Math.floor(Math.random() * 4); // 0: +Z, 1: -Z, 2: +X, 3: -X
    let spawnX, spawnZ;

    if (spawnSide === 0) { // From -Z (towards player)
        spawnX = (Math.random() - 0.5) * 20; // Random X within view
        spawnZ = playerGroup.position.z - spawnDistance;
    } else if (spawnSide === 1) { // From +Z (behind player)
        spawnX = (Math.random() - 0.5) * 20;
        spawnZ = playerGroup.position.z + spawnDistance;
    } else if (spawnSide === 2) { // From -X (left of player)
        spawnX = playerGroup.position.x - spawnDistance;
        spawnZ = (Math.random() - 0.5) * 20;
    } else { // From +X (right of player)
        spawnX = playerGroup.position.x + spawnDistance;
        spawnZ = (Math.random() - 0.5) * 20;
    }

    obstacle.position.set(spawnX, obstacle.geometry.parameters.height / 2, spawnZ);
    obstacle.spawnSide = spawnSide; // Store spawn side for removal logic
    scene.add(obstacle);
    obstacles.push(obstacle);
}

function updatePlayer() {
    // Apply gravity
    if (playerGroup.position.y > PLAYER_START_Y || isJumping) {
        playerGroup.position.y += jumpVelocity;
        jumpVelocity += GRAVITY;
    }
    if (playerGroup.position.y < PLAYER_START_Y) {
        playerGroup.position.y = PLAYER_START_Y;
        isJumping = false;
        jumpVelocity = 0;
    }

    // Handle directional movement
    let moved = false;
    if (moveForward) { playerGroup.position.z -= PLAYER_SPEED; moved = true; }
    if (moveBackward) { playerGroup.position.z += PLAYER_SPEED; moved = true; }
    if (moveLeft) { playerGroup.position.x -= PLAYER_SPEED; moved = true; }
    if (moveRight) { playerGroup.position.x += PLAYER_SPEED; moved = true; }

    // Walking animation (bobbing and limb swing)
    if (moved && !isJumping) {
        walkCycle += WALK_SPEED;
        playerGroup.position.y = PLAYER_START_Y + Math.sin(walkCycle) * WALK_BOB_AMOUNT;

        // Simple arm/leg swing
        leftArm.rotation.x = Math.sin(walkCycle) * ARM_LEG_SWING_AMOUNT;
        rightArm.rotation.x = Math.sin(walkCycle + Math.PI) * ARM_LEG_SWING_AMOUNT; // Opposite swing
        leftLeg.rotation.x = Math.sin(walkCycle + Math.PI) * ARM_LEG_SWING_AMOUNT;
        rightLeg.rotation.x = Math.sin(walkCycle) * ARM_LEG_SWING_AMOUNT;
    } else if (!moved && !isJumping) {
        // Reset to idle position if not moving
        playerGroup.position.y = PLAYER_START_Y;
        leftArm.rotation.x = 0;
        rightArm.rotation.x = 0;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
    }

    // Update camera to follow player
    camera.position.x = playerGroup.position.x;
    camera.position.z = playerGroup.position.z + 5; // Keep camera behind player
    camera.lookAt(playerGroup.position);
}

function updateObstacles() {
    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        // Calculate direction vector from obstacle to player
        const direction = new THREE.Vector3().subVectors(playerGroup.position, obstacle.position).normalize();
        obstacle.position.add(direction.multiplyScalar(OBSTACLE_SPEED));

        const removalMargin = 10; // Distance past the player to remove obstacles

        let shouldRemove = false;
        if (obstacle.spawnSide === 0) { // Spawned from -Z, moving towards +Z
            if (obstacle.position.z > playerGroup.position.z + removalMargin) {
                shouldRemove = true;
            }
        } else if (obstacle.spawnSide === 1) { // Spawned from +Z, moving towards -Z
            if (obstacle.position.z < playerGroup.position.z - removalMargin) {
                shouldRemove = true;
            }
        } else if (obstacle.spawnSide === 2) { // Spawned from -X, moving towards +X
            if (obstacle.position.x > playerGroup.position.x + removalMargin) {
                shouldRemove = true;
            }
        } else if (obstacle.spawnSide === 3) { // Spawned from +X, moving towards -X
            if (obstacle.position.x < playerGroup.position.x - removalMargin) {
                shouldRemove = true;
            }
        }

        if (shouldRemove) { // If it has passed the player and is far away
            scene.remove(obstacle);
            obstacles.splice(i, 1);
            i--; // Adjust index after removal
            score++;
            scoreElement.textContent = `Score: ${score}`;
        }
    }
}

function checkCollisions() {
    const playerBox = new THREE.Box3().setFromObject(playerGroup);
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
    gameOverSound.play(); // Play game over sound
    // Disable input or stop animation loop if needed
}

function resetGame() {
    // Clear existing obstacles
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];

    // Reset player position
    playerGroup.position.set(0, PLAYER_START_Y, 5);
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

// Event Listeners for Keyboard
window.addEventListener('keydown', (event) => {
    if (gameOver) return;
    switch (event.code) {
        case 'Space':
            if (!isJumping) {
                isJumping = true;
                jumpVelocity = JUMP_FORCE;
                jumpSound.play(); // Play jump sound
            }
            break;
        case 'KeyW':
        case 'ArrowUp':
            moveForward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            moveBackward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            moveLeft = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            moveRight = true;
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveForward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            moveBackward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            moveLeft = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            moveRight = false;
            break;
    }
});

restartButton.addEventListener('click', resetGame);

// Animation loop
function animate(currentTime) {
    if (gameOver) return;

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