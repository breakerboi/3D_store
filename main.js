import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

console.log('Three.js version:', THREE.REVISION);

let scene, camera, renderer, roomGroup;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let touchStartPoint = { x: 0, y: 0 };
let touchMoved = false;
let suppressNextCanvasClick = false;
let ignoreNextClickUntil = 0;
let helpFadeTimeoutId = null;
let helpHideTimeoutId = null;
let productCardVisible = false;
let currentCardProductKey = '';
let targetRotation = 0;
let currentRotation = 0;
const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia('(pointer: coarse)').matches;
const HELP_TOTAL_DURATION_MS = 10000;
const HELP_FADE_DURATION_MS = 1200;

// РџРµСЂРµРјРµРЅРЅР°СЏ РґР»СЏ РѕС‚СЃР»РµР¶РёРІР°РЅРёСЏ СЃРѕСЃС‚РѕСЏРЅРёСЏ РјРµРЅСЋ
let isMenuVisible = true;

// РџРµСЂРµРјРµРЅРЅС‹Рµ РґР»СЏ СѓРїСЂР°РІР»РµРЅРёСЏ РѕСЃРІРµС‰РµРЅРёРµРј
let ambientLight, directionalLight, wallLight;
let targetLightIntensity = 1.0;
let currentLightIntensity = 1.0;

// Р”Р»СЏ РѕРїСЂРµРґРµР»РµРЅРёСЏ РІР·Р°РёРјРѕРґРµР№СЃС‚РІРёСЏ СЃРѕ СЃС‚РµРЅРѕР№
let walls;
let raycaster;
let mouse;
let shoes = [];
let focusedShoe = null;
let isRotatingShoe = false;
let shoeAngularVelocity = 0;
let isReturningShoe = false;
let shoeTransitionActive = false;
const DEFAULT_SHOE_RADIUS = 7.7;
const SHOE_TRANSITION_SPEED = 5.5;
const SHOE_LOCK_SPEED = 9.0;
const SHOE_FIXED_FOCUS_DISTANCE = 2.5;
const ROOM_ROTATION_EPSILON = 0.01;
const SHOE_ROTATION_SENSITIVITY = 0.012;
const SHOE_INERTIA_DAMPING = 0.94;
const SHOE_INERTIA_MIN_VELOCITY = 0.0002;
const TOUCH_TAP_MAX_MOVE = 14;
const TOUCH_ROTATION_SENSITIVITY = 0.0056;
const SHOE_ZOOM_SOUND_URL = '/sounds/shoe-zoom.wav';
const SHOE_ZOOM_SOUND_VOLUME = 0.65;
const MENU_ENTER_SOUND_URL = '/sounds/menu_enter.wav';
const MENU_OUT_SOUND_URL = '/sounds/menu_out.wav';
const MENU_SOUND_VOLUME = 0.7;
const PRODUCT_CATALOG = {
    converse_chuck_70: {
        brand: 'Converse',
        title: 'Chuck Taylor 70',
        description: 'Классическая высокая модель с плотным канвасом, усиленной стелькой и винтажной отделкой. Подходит для повседневных образов и легких streetwear-сетов.',
        price: '11 990 ₽',
        sizes: 'Размеры: EU 40, 41, 42, 43, 44'
    },
    vans_old_skool_green: {
        brand: 'Vans',
        title: 'Old Skool Green',
        description: 'Иконический силуэт с фирменной боковой полосой, замшево-канвасным верхом и мягким воротником. Универсальная пара для city casual и скейт-эстетики.',
        price: '10 490 ₽',
        sizes: 'Размеры: EU 39, 40, 41, 42, 43, 44'
    }
};

let shoeZoomAudio = null;
let menuEnterAudio = null;
let menuOutAudio = null;

let adminViewerActive = false;
let adminHud = null;
let adminCrosshair = null;
let adminCrosshairActive = false;
let adminExitTransitionActive = false;
let lastFrameTime = performance.now();
const adminMoveState = { forward: false, back: false, left: false, right: false };
const adminShoeRotateState = { left: false, right: false };
const adminMoveSpeed = 4.0;
const adminLookSensitivity = 0.002;
const adminPitchLimit = Math.PI / 2 - 0.01;
const ADMIN_RETURN_SPEED = 4.8;
const ADMIN_SHOE_ROTATE_SPEED = 1.8;
const initialCameraPosition = new THREE.Vector3();
const initialCameraQuaternion = new THREE.Quaternion();
let adminYaw = 0;
let adminPitch = 0;

init();

function init() {
    console.log('Initializing scene...');
    try {
        createScene();
        createRoom();
        createLights();
        setupEventListeners();
        animate();
        
        document.getElementById('loading').style.display = 'none';
        console.log('Scene initialized successfully!');
    } catch (error) {
        console.error('Error during initialization:', error);
        document.getElementById('loading').innerHTML = 'РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё: ' + error.message;
    }
}

function createScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 0);
    
    const container = document.getElementById('canvas-container');
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.touchAction = 'none';
    
    container.appendChild(renderer.domElement);
    
    // РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ Raycaster РґР»СЏ РѕРїСЂРµРґРµР»РµРЅРёСЏ РїРµСЂРµСЃРµС‡РµРЅРёР№
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    initialCameraPosition.copy(camera.position);
    initialCameraQuaternion.copy(camera.quaternion);
    createAdminHud();
    setupAudio();
}

function setupAudio() {
    shoeZoomAudio = new Audio(SHOE_ZOOM_SOUND_URL);
    shoeZoomAudio.preload = 'auto';
    shoeZoomAudio.volume = SHOE_ZOOM_SOUND_VOLUME;

    menuEnterAudio = new Audio(MENU_ENTER_SOUND_URL);
    menuEnterAudio.preload = 'auto';
    menuEnterAudio.volume = MENU_SOUND_VOLUME;

    menuOutAudio = new Audio(MENU_OUT_SOUND_URL);
    menuOutAudio.preload = 'auto';
    menuOutAudio.volume = MENU_SOUND_VOLUME;
}

function playShoeZoomSound() {
    if (!shoeZoomAudio) return;
    shoeZoomAudio.currentTime = 0;
    shoeZoomAudio.play().catch(() => {});
}

function playMenuSound(audio) {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
}

function createAdminHud() {
    adminHud = document.createElement('div');
    adminHud.id = 'admin-viewer-coords';
    adminHud.style.position = 'fixed';
    adminHud.style.top = '14px';
    adminHud.style.right = '14px';
    adminHud.style.padding = '8px 10px';
    adminHud.style.background = 'rgba(0, 0, 0, 0.65)';
    adminHud.style.color = '#ffffff';
    adminHud.style.fontFamily = 'Consolas, monospace';
    adminHud.style.fontSize = '13px';
    adminHud.style.borderRadius = '6px';
    adminHud.style.zIndex = '1500';
    adminHud.style.pointerEvents = 'none';
    adminHud.style.display = 'none';
    adminHud.textContent = 'x: 0.00  y: 0.00  z: 0.00';
    document.body.appendChild(adminHud);

    adminCrosshair = document.createElement('div');
    adminCrosshair.id = 'admin-viewer-crosshair';
    adminCrosshair.style.position = 'fixed';
    adminCrosshair.style.left = '50%';
    adminCrosshair.style.top = '50%';
    adminCrosshair.style.transform = 'translate(-50%, -50%)';
    adminCrosshair.style.color = '#ffffff';
    adminCrosshair.style.fontFamily = 'Consolas, monospace';
    adminCrosshair.style.fontSize = '28px';
    adminCrosshair.style.fontWeight = '700';
    adminCrosshair.style.textShadow = '0 0 6px rgba(0, 0, 0, 0.75)';
    adminCrosshair.style.zIndex = '1501';
    adminCrosshair.style.pointerEvents = 'none';
    adminCrosshair.style.display = 'none';
    adminCrosshair.textContent = '+';
    document.body.appendChild(adminCrosshair);
}

function setAdminViewerActive(active) {
    if (isMobileDevice) return;
    adminViewerActive = active;

    if (adminViewerActive) {
        adminExitTransitionActive = false;
        const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        adminPitch = euler.x;
        adminYaw = euler.y;
        requestAdminPointerLock();
        document.body.style.cursor = 'none';
        renderer.domElement.style.cursor = 'none';
        if (adminHud) {
            adminHud.style.display = 'block';
            updateAdminHud();
        }
        setAdminCrosshairActive(false);
        return;
    }

    adminMoveState.forward = false;
    adminMoveState.back = false;
    adminMoveState.left = false;
    adminMoveState.right = false;
    adminShoeRotateState.left = false;
    adminShoeRotateState.right = false;
    adminExitTransitionActive = true;
    adminPitch = 0;
    adminYaw = 0;
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
    document.body.style.cursor = '';
    renderer.domElement.style.cursor = 'default';
    if (adminHud) {
        adminHud.style.display = 'none';
    }
    setAdminCrosshairActive(false);
}

function updateAdminViewerMovement(deltaSeconds) {
    if (!adminViewerActive) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    if (forward.lengthSq() > 0) {
        forward.normalize();
    }

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    const move = new THREE.Vector3();

    if (adminMoveState.forward) move.add(forward);
    if (adminMoveState.back) move.sub(forward);
    if (adminMoveState.right) move.add(right);
    if (adminMoveState.left) move.sub(right);

    if (move.lengthSq() > 0) {
        move.normalize();
        camera.position.addScaledVector(move, adminMoveSpeed * deltaSeconds);
    }
}

function updateAdminHud() {
    if (!adminHud) return;
    const coords = `x: ${camera.position.x.toFixed(2)}  y: ${camera.position.y.toFixed(2)}  z: ${camera.position.z.toFixed(2)}`;
    if (focusedShoe && adminViewerActive) {
        adminHud.innerHTML = `${coords}<div style="margin-top: 10px;">Chuck Taylor 70</div>`;
    } else {
        adminHud.textContent = coords;
    }
}

function setAdminCrosshairActive(active) {
    adminCrosshairActive = active && adminViewerActive && !isMobileDevice;
    if (adminCrosshair) {
        adminCrosshair.style.display = adminCrosshairActive ? 'block' : 'none';
    }
}


function requestAdminPointerLock() {
    const canvas = renderer && renderer.domElement;
    if (!canvas) return;
    if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
    }
}

function onPointerLockChange() {
    const canvas = renderer && renderer.domElement;
    if (!adminViewerActive || !canvas) return;
    if (document.pointerLockElement !== canvas) {
        requestAdminPointerLock();
    }
}

function onAdminMouseMove(event) {
    if (!adminViewerActive) return;
    if (!renderer || document.pointerLockElement !== renderer.domElement) return;

    adminYaw -= event.movementX * adminLookSensitivity;
    adminPitch -= event.movementY * adminLookSensitivity;
    adminPitch = Math.max(-adminPitchLimit, Math.min(adminPitchLimit, adminPitch));

    const euler = new THREE.Euler(adminPitch, adminYaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
}

function createRoom() {
    // РЎРѕР·РґР°РµРј РіСЂСѓРїРїСѓ РґР»СЏ РІСЃРµР№ РєРѕРјРЅР°С‚С‹
    roomGroup = new THREE.Group();
    scene.add(roomGroup);
    
    // РЎРѕР·РґР°РµРј РїРѕР»
    createFloor();
    
    // РЎРѕР·РґР°РµРј СЃС‚РµРЅС‹
    createWalls();
    
    // РЎРѕР·РґР°РµРј РїРѕС‚РѕР»РѕРє
    createCeiling();
    
    // Р”РѕР±Р°РІР»СЏРµРј СЂР°РјРєРё РЅР° СЃС‚РµРЅС‹
    addWallObjects();
    
    console.log('Room created with walls, floor, ceiling and picture frames');
}

function createFloor() {
    const texture = new THREE.TextureLoader().load('/textures/floor.jpg');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const floorGeometry = new THREE.CircleGeometry(15, 32);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        map: texture,
        roughness: 0.9,
        metalness: 0.05
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4;
    floor.receiveShadow = true;
    
    roomGroup.add(floor);
}

function createWalls() {
    const wallTexture = new THREE.TextureLoader().load('/textures/wall.jpg');
    wallTexture.colorSpace = THREE.SRGBColorSpace;
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(32, 3.2);
    wallTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const wallGeometry = new THREE.CylinderGeometry(12, 12, 8, 36, 1, true);
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        color: 0xffffff,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0.04
    });

    walls = new THREE.Mesh(wallGeometry, wallMaterial);
    walls.position.y = 0;

    roomGroup.add(walls);
}

function createCeiling() {
    const ceilingTexture = new THREE.TextureLoader().load('/textures/ceiling.jpg');
    ceilingTexture.colorSpace = THREE.SRGBColorSpace;
    ceilingTexture.wrapS = THREE.RepeatWrapping;
    ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(3, 3);
    ceilingTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const ceilingGeometry = new THREE.CircleGeometry(12, 32);
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
        map: ceilingTexture,
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.05
    });
    
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    
    roomGroup.add(ceiling);
    
    // Р”РѕР±Р°РІР»СЏРµРј СЃРІРµС‚РёР»СЊРЅРёРє РЅР° РїРѕС‚РѕР»РѕРє
    const lightFixtureGeometry = new THREE.CylinderGeometry(0.5, 0.8, 0.2, 16);
    const lightFixtureMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xCCCCCC,
        roughness: 0.3,
        metalness: 0.7
    });
    
    const lightFixture = new THREE.Mesh(lightFixtureGeometry, lightFixtureMaterial);
    lightFixture.position.set(0, 3.8, 0);
    roomGroup.add(lightFixture);
}

function createPictureFrame(width, height, frameWidth, color = 0x8B4513) {
    const frameGroup = new THREE.Group();
    
    // Р’РЅРµС€РЅСЏСЏ СЂР°РјРєР°
    const frameGeometry = new THREE.BoxGeometry(width + frameWidth * 2, height + frameWidth * 2, 0.15);
    const frameMaterial = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.4,
        metalness: 0.2
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    
    // Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ С‡Р°СЃС‚СЊ (С…РѕР»СЃС‚)
    const canvasGeometry = new THREE.PlaneGeometry(width * 0.95, height * 0.95);
    const canvasMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xF8F8F8,
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.DoubleSide
    });
    const canvas = new THREE.Mesh(canvasGeometry, canvasMaterial);
    canvas.position.z = 0.08;
    
    frameGroup.add(frame);
    frameGroup.add(canvas);
    
    return frameGroup;
}

function addPictureFrames() {
    // Р¦РІРµС‚Р° РґР»СЏ СЂР°РјРѕРє (РґРµСЂРµРІСЏРЅРЅС‹Рµ РѕС‚С‚РµРЅРєРё)
    const frameColors = [
        0x8B4513,
        0xA0522D,
        0xCD853F,
        0xD2691E,
        0xB8860B,
        0xDAA520
    ];
    
    // Р”РѕР±Р°РІР»СЏРµРј СЂР°РјРєРё РЅР° СЃС‚РµРЅС‹
    for (let i = 0; i < 8; i++) {
        const color = frameColors[i % frameColors.length];
        const frame = createPictureFrame(2.2, 1.6, 0.15, color);
        
        // Р Р°СЃРїРѕР»Р°РіР°РµРј СЂР°РјРєРё РЅР° СЃС‚РµРЅР°С…
        const angle = (i / 8) * Math.PI * 2;
        const radius = 11.9;
        
        frame.position.set(
            Math.cos(angle) * radius,
            0.5,
            Math.sin(angle) * radius
        );
        
        // РџРѕРІРѕСЂР°С‡РёРІР°РµРј СЂР°РјРєРё Рє С†РµРЅС‚СЂСѓ
        frame.lookAt(0, frame.position.y, 0);
        
        // РЈР±РёСЂР°РµРј С‚РµРЅРё СЃ СЂР°РјРѕРє С‡С‚РѕР±С‹ РёР·Р±РµР¶Р°С‚СЊ Р°СЂС‚РµС„Р°РєС‚РѕРІ
        frame.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = false;
                child.receiveShadow = false;
            }
        });
        
        roomGroup.add(frame);
    }
}

function createLights() {
    // Ambient light
    ambientLight = new THREE.AmbientLight(0xffffff, currentLightIntensity);
    scene.add(ambientLight);
    
    // Directional light
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = false;
    scene.add(directionalLight);
    
    // РўРѕС‡РµС‡РЅС‹Р№ СЃРІРµС‚ РґР»СЏ Р»СѓС‡С€РµРіРѕ РѕСЃРІРµС‰РµРЅРёСЏ СЃС‚РµРЅ
    wallLight = new THREE.PointLight(0xffffff, 0.8);
    wallLight.position.set(0, 3, 0);
    scene.add(wallLight);
}

function setupEventListeners() {
    const canvas = renderer.domElement;
    
    // РњС‹С€СЊ
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('click', onCanvasClick);
    
    // РЎРµРЅСЃРѕСЂРЅС‹Рµ СЃРѕР±С‹С‚РёСЏ
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    
    // Р РµСЃР°Р№Р· РѕРєРЅР°
    window.addEventListener('resize', onWindowResize);
    
    // РћР±СЂР°Р±РѕС‚РєР° РєР»Р°РІРёС€Рё ESC
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    if (!isMobileDevice) {
        document.addEventListener('mousemove', onAdminMouseMove);
        document.addEventListener('pointerlockchange', onPointerLockChange);
    }
    
    // РљР»РёРєРё РїРѕ РјРµРЅСЋ
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!isMenuVisible) {
                e.stopPropagation();
                return;
            }
            const category = item.dataset.category;
            showProducts(category);
        });
    });
    
    // РљРЅРѕРїРєР° СЃРєСЂС‹С‚РёСЏ/РїРѕРєР°Р·Р° РјРµРЅСЋ
    const toggleMenuBtn = document.getElementById('toggleMenuBtn');
    toggleMenuBtn.addEventListener('click', toggleMenu);

    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', showInstructionsTemporarily);
    }
    
    // Р‘Р»РѕРєРёСЂСѓРµРј РєР»РёРєРё РЅР° canvas РєРѕРіРґР° РјРµРЅСЋ СЃРєСЂС‹С‚Рѕ
    canvas.addEventListener('click', (e) => {
        if (adminViewerActive) {
            requestAdminPointerLock();
            e.preventDefault();
            return;
        }
        if (!isMenuVisible) {
            e.stopPropagation();
        }
    });
}

// РћР±СЂР°Р±РѕС‚РєР° РЅР°Р¶Р°С‚РёСЏ РєР»Р°РІРёС€
function showInstructionsTemporarily() {
    const instructions = document.getElementById('instructions');
    if (!instructions || isMobileDevice) return;

    if (helpFadeTimeoutId) {
        clearTimeout(helpFadeTimeoutId);
        helpFadeTimeoutId = null;
    }
    if (helpHideTimeoutId) {
        clearTimeout(helpHideTimeoutId);
        helpHideTimeoutId = null;
    }

    instructions.style.visibility = 'visible';
    instructions.style.opacity = '1';

    helpFadeTimeoutId = setTimeout(() => {
        instructions.style.opacity = '0';
    }, Math.max(0, HELP_TOTAL_DURATION_MS - HELP_FADE_DURATION_MS));

    helpHideTimeoutId = setTimeout(() => {
        instructions.style.visibility = 'hidden';
    }, HELP_TOTAL_DURATION_MS);
}

function updateProductCardVisibility() {
    const card = document.getElementById('productCard');
    if (!card) return;

    const shouldShow = Boolean(focusedShoe) && !isReturningShoe;
    if (shouldShow) {
        const productKey = focusedShoe.userData.productKey || 'converse_chuck_70';
        if (productKey !== currentCardProductKey) {
            const data = PRODUCT_CATALOG[productKey] || PRODUCT_CATALOG.converse_chuck_70;
            const brandNode = document.getElementById('productCardBrand');
            const titleNode = document.getElementById('productCardTitle');
            const descriptionNode = document.getElementById('productCardDescription');
            const priceNode = document.getElementById('productCardPrice');
            const sizesNode = document.getElementById('productCardSizes');

            if (brandNode) brandNode.textContent = data.brand;
            if (titleNode) titleNode.textContent = data.title;
            if (descriptionNode) descriptionNode.textContent = data.description;
            if (priceNode) priceNode.textContent = data.price;
            if (sizesNode) sizesNode.textContent = data.sizes;
            currentCardProductKey = productKey;
        }
    }

    if (shouldShow === productCardVisible) return;

    productCardVisible = shouldShow;
    card.classList.toggle('visible', shouldShow);
    card.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    if (!shouldShow) {
        currentCardProductKey = '';
    }
}

function onKeyDown(event) {
    if (event.ctrlKey && event.key.toLowerCase() === 'v' && !event.repeat) {
        setAdminViewerActive(!adminViewerActive);
        event.preventDefault();
        return;
    }

    if (adminViewerActive) {
        const key = event.key.toLowerCase();
        if (key === 'escape') {
            setAdminViewerActive(false);
            event.preventDefault();
            return;
        }
        if (key === 't' && !event.repeat) {
            setAdminCrosshairActive(!adminCrosshairActive);
            event.preventDefault();
            return;
        }
        if (key === 'w') adminMoveState.forward = true;
        if (key === 's') adminMoveState.back = true;
        if (key === 'a') adminMoveState.left = true;
        if (key === 'd') adminMoveState.right = true;
        if (key === 'q') adminShoeRotateState.left = true;
        if (key === 'e') adminShoeRotateState.right = true;

        if (key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'q' || key === 'e') {
            event.preventDefault();
            return;
        }
    }

    if (event.keyCode === 27 || event.key === 'Escape') {
        toggleMenu();
        event.preventDefault();
    }
}

function onKeyUp(event) {
    if (!adminViewerActive) return;

    const key = event.key.toLowerCase();
    if (key === 'w') adminMoveState.forward = false;
    if (key === 's') adminMoveState.back = false;
    if (key === 'a') adminMoveState.left = false;
    if (key === 'd') adminMoveState.right = false;
    if (key === 'q') adminShoeRotateState.left = false;
    if (key === 'e') adminShoeRotateState.right = false;
}

function checkWallIntersection(event) {
    if (!walls) return false;
    
    const rect = renderer.domElement.getBoundingClientRect();
    
    // Р’С‹С‡РёСЃР»СЏРµРј РЅРѕСЂРјР°Р»РёР·РѕРІР°РЅРЅС‹Рµ РєРѕРѕСЂРґРёРЅР°С‚С‹ РјС‹С€Рё
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // РћР±РЅРѕРІР»СЏРµРј Р»СѓС‡
    raycaster.setFromCamera(mouse, camera);
    
    // РџСЂРѕРІРµСЂСЏРµРј РїРµСЂРµСЃРµС‡РµРЅРёРµ СЃРѕ СЃС‚РµРЅР°РјРё
    const intersects = raycaster.intersectObject(walls);
    
    return intersects.length > 0;
}

function isRoomRotationStable() {
    return !isDragging && Math.abs(targetRotation - currentRotation) < ROOM_ROTATION_EPSILON;
}

function getFocusedShoeTargetPosition() {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    if (forward.lengthSq() > 0) {
        forward.normalize();
    }

    const worldTarget = camera.position.clone().addScaledVector(forward, SHOE_FIXED_FOCUS_DISTANCE);
    return roomGroup.worldToLocal(worldTarget.clone());
}

function getShoeFromMouseEvent(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(shoes, true);
    if (!intersects.length) return null;

    let obj = intersects[0].object;
    while (obj && obj.userData.shoeIndex === undefined && obj.parent) {
        obj = obj.parent;
    }

    if (!obj || obj.userData.shoeIndex === undefined) return null;
    return obj;
}

function getShoeFromCenterRay() {
    mouse.set(0, 0);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(shoes, true);
    if (!intersects.length) return null;

    let obj = intersects[0].object;
    while (obj && obj.userData.shoeIndex === undefined && obj.parent) {
        obj = obj.parent;
    }

    if (!obj || obj.userData.shoeIndex === undefined) return null;
    return obj;
}

function onCanvasClick(event) {
    if (adminViewerActive && !adminCrosshairActive) return;
    if (isMenuVisible) return;
    if (performance.now() < ignoreNextClickUntil) return;
    if (suppressNextCanvasClick) {
        suppressNextCanvasClick = false;
        return;
    }

    const clickedShoe = adminViewerActive ? getShoeFromCenterRay() : getShoeFromMouseEvent(event);


    if (focusedShoe) {
        if (clickedShoe !== focusedShoe) return;
        if (isRotatingShoe) return;

        playShoeZoomSound();
        isReturningShoe = true;
        shoeTransitionActive = true;
        return;
    }

    if (!clickedShoe) return;
    if (!isRoomRotationStable()) return;

    focusedShoe = clickedShoe;
    isReturningShoe = false;
    playShoeZoomSound();
    shoeTransitionActive = true;
}
function onMouseMove(event) {
    if (adminViewerActive) return;

    if (isRotatingShoe && focusedShoe) {
        const deltaX = event.clientX - previousMousePosition.x;
        if (Math.abs(deltaX) > 1) {
            suppressNextCanvasClick = true;
        }
        const rotationDelta = deltaX * SHOE_ROTATION_SENSITIVITY;
        focusedShoe.rotation.y += rotationDelta;
        shoeAngularVelocity = rotationDelta;
        previousMousePosition.x = event.clientX;
        event.preventDefault();
        return;
    }

    const isOverWall = checkWallIntersection(event);

    if (isMenuVisible) {
        renderer.domElement.style.cursor = 'default';
        return;
    }

    if (focusedShoe) {
        renderer.domElement.style.cursor = 'grab';
        return;
    }

    renderer.domElement.style.cursor = isOverWall ? 'grab' : 'default';

    if (!isDragging || isMenuVisible) return;

    const deltaX = event.clientX - previousMousePosition.x;
    targetRotation += deltaX * 0.003;
    previousMousePosition.x = event.clientX;
}
function onMouseDown(event) {
    if (adminViewerActive) return;
    if (isMenuVisible) return;
    if (performance.now() < ignoreNextClickUntil) return;
    
    if (focusedShoe) {
        if (shoeTransitionActive) return;
        suppressNextCanvasClick = false;
        shoeAngularVelocity = 0;
        isRotatingShoe = true;
        previousMousePosition.x = event.clientX;
        renderer.domElement.style.cursor = 'grabbing';
        event.preventDefault();
        return;
    }

    
    // РџСЂРѕРІРµСЂСЏРµРј С‡С‚Рѕ РєР»РёРє Р±С‹Р» РїРѕ СЃС‚РµРЅРµ
    const isOverWall = checkWallIntersection(event);
    if (!isOverWall) return;
    
    isDragging = true;
    previousMousePosition.x = event.clientX;
    
    // РњРµРЅСЏРµРј РєСѓСЂСЃРѕСЂ РїСЂРё РїРµСЂРµС‚Р°СЃРєРёРІР°РЅРёРё
    renderer.domElement.style.cursor = 'grabbing';
    
    event.preventDefault();
}

function onMouseUp() {
    isDragging = false;
    isRotatingShoe = false;
    
    // Р’РѕР·РІСЂР°С‰Р°РµРј РєСѓСЂСЃРѕСЂ РІ Р·Р°РІРёСЃРёРјРѕСЃС‚Рё РѕС‚ РїРѕР»РѕР¶РµРЅРёСЏ
    if (!isMenuVisible && checkWallIntersection({ clientX: previousMousePosition.x, clientY: previousMousePosition.y })) {
        renderer.domElement.style.cursor = 'grab';
    } else {
        renderer.domElement.style.cursor = 'default';
    }
}

function onMouseLeave() {
    isDragging = false;
    isRotatingShoe = false;
    renderer.domElement.style.cursor = 'default';
}

function onTouchStart(event) {
    if (adminViewerActive) return;
    if (isMenuVisible) return;

    if (event.touches.length === 1) {
        const touch = event.touches[0];
        if (focusedShoe && !shoeTransitionActive) {
            isRotatingShoe = true;
            isDragging = false;
        } else {
            isDragging = true;
        }
        touchMoved = false;
        previousMousePosition.x = touch.clientX;
        touchStartPoint.x = touch.clientX;
        touchStartPoint.y = touch.clientY;
        renderer.domElement.style.cursor = 'grabbing';
    }
    event.preventDefault();
}

function onTouchMove(event) {
    if (adminViewerActive) return;
    if (isMenuVisible || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - previousMousePosition.x;
    const dxFromStart = touch.clientX - touchStartPoint.x;
    const dyFromStart = touch.clientY - touchStartPoint.y;

    if (Math.hypot(dxFromStart, dyFromStart) > TOUCH_TAP_MAX_MOVE) {
        touchMoved = true;
    }

    if (isRotatingShoe && focusedShoe) {
        const rotationDelta = deltaX * SHOE_ROTATION_SENSITIVITY;
        focusedShoe.rotation.y += rotationDelta;
        shoeAngularVelocity = rotationDelta;
        suppressNextCanvasClick = true;
    } else if (isDragging) {
        targetRotation += deltaX * TOUCH_ROTATION_SENSITIVITY;
    }

    previousMousePosition.x = touch.clientX;
    event.preventDefault();
}

function onTouchEnd(event) {
    const wasTap = !touchMoved;
    isDragging = false;
    isRotatingShoe = false;
    touchMoved = false;
    renderer.domElement.style.cursor = 'default';

    if (!event.changedTouches || event.changedTouches.length !== 1) return;
    if (!wasTap) return;

    const touch = event.changedTouches[0];
    onCanvasClick({ clientX: touch.clientX, clientY: touch.clientY });
    ignoreNextClickUntil = performance.now() + 350;
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function showProducts(category) {
    console.log('Showing products for category:', category);
    alert(`РџРѕРєР°Р·С‹РІР°РµРј С‚РѕРІР°СЂС‹ РєР°С‚РµРіРѕСЂРёРё: ${category}`);
}

// Р¤СѓРЅРєС†РёСЏ РїРµСЂРµРєР»СЋС‡РµРЅРёСЏ РјРµРЅСЋ
function toggleMenu() {
    const menu = document.querySelector('.center-menu');
    const toggleBtn = document.getElementById('toggleMenuBtn');
    const canvas = renderer.domElement;

    if (isMenuVisible) {
        playMenuSound(menuOutAudio);
        menu.style.opacity = '0';
        menu.style.transform = 'translate(-50%, -50%) scale(0.8)';
        menu.style.pointerEvents = 'none';
        toggleBtn.textContent = '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043c\u0435\u043d\u044e';
        targetLightIntensity = 1.0;
    } else {
        playMenuSound(menuEnterAudio);
        menu.style.opacity = '1';
        menu.style.transform = 'translate(-50%, -50%) scale(1)';
        menu.style.pointerEvents = 'auto';
        toggleBtn.textContent = '\u0421\u043a\u0440\u044b\u0442\u044c \u043c\u0435\u043d\u044e';
        targetLightIntensity = 0.3;
    }

    isMenuVisible = !isMenuVisible;

    if (!isMenuVisible) {
        const fakeEvent = { clientX: previousMousePosition.x, clientY: previousMousePosition.y };
        const isOverWall = checkWallIntersection(fakeEvent);
        canvas.style.cursor = isOverWall ? 'grab' : 'default';
    } else {
        canvas.style.cursor = 'default';
    }
}
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const deltaSeconds = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    currentLightIntensity += (targetLightIntensity - currentLightIntensity) * 0.08;
    if (ambientLight) {
        ambientLight.intensity = currentLightIntensity;
    }

    if (wallLight) {
        wallLight.intensity = currentLightIntensity * 0.6;
    }

    if (!focusedShoe) {
        currentRotation += (targetRotation - currentRotation) * 0.03;
        if (roomGroup) {
            roomGroup.rotation.y = currentRotation;
        }
    }

    if (focusedShoe && !isRotatingShoe && !shoeTransitionActive && Math.abs(shoeAngularVelocity) > SHOE_INERTIA_MIN_VELOCITY) {
        focusedShoe.rotation.y += shoeAngularVelocity;
        shoeAngularVelocity *= SHOE_INERTIA_DAMPING;
    } else if (!isRotatingShoe && Math.abs(shoeAngularVelocity) <= SHOE_INERTIA_MIN_VELOCITY) {
        shoeAngularVelocity = 0;
    }

    if (adminViewerActive && focusedShoe && !isReturningShoe) {
        if (adminShoeRotateState.left) {
            focusedShoe.rotation.y += ADMIN_SHOE_ROTATE_SPEED * deltaSeconds;
        }
        if (adminShoeRotateState.right) {
            focusedShoe.rotation.y -= ADMIN_SHOE_ROTATE_SPEED * deltaSeconds;
        }
    }

    if (focusedShoe) {
        const target = isReturningShoe
            ? focusedShoe.userData.homePosition
            : getFocusedShoeTargetPosition();

        if (target) {
            const speed = shoeTransitionActive ? SHOE_TRANSITION_SPEED : SHOE_LOCK_SPEED;
            const step = Math.min(1, deltaSeconds * speed);
            focusedShoe.position.lerp(target, step);

            if (shoeTransitionActive && focusedShoe.position.distanceTo(target) < 0.01) {
                focusedShoe.position.copy(target);
                shoeTransitionActive = false;

                if (isReturningShoe) {
                    focusedShoe = null;
                    isReturningShoe = false;
                }
            }
        }
    }

    if (adminViewerActive) {
        updateAdminViewerMovement(deltaSeconds);
        updateAdminHud();
    }

    if (adminExitTransitionActive) {
        const step = Math.min(1, deltaSeconds * ADMIN_RETURN_SPEED);
        camera.position.lerp(initialCameraPosition, step);
        camera.quaternion.slerp(initialCameraQuaternion, step);

        const posDone = camera.position.distanceTo(initialCameraPosition) < 0.01;
        const rotDone = 1 - Math.abs(camera.quaternion.dot(initialCameraQuaternion)) < 0.001;
        if (posDone && rotDone) {
            camera.position.copy(initialCameraPosition);
            camera.quaternion.copy(initialCameraQuaternion);
            adminExitTransitionActive = false;
        }
    }

    updateProductCardVisibility();
    renderer.render(scene, camera);
}
function addWallObjects() {
    const loader = new GLTFLoader();
    let nextShoeIndex = 0;
    const shoeBaseY = 0.0;
    const radius = DEFAULT_SHOE_RADIUS + 2.0;
    const count = 8;
    const slots = Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return {
            position: new THREE.Vector3(
                Math.cos(angle) * radius,
                0.5,
                Math.sin(angle) * radius
            ),
            angle
        };
    });

    function placeModelInstances(gltf, targetLength, selectedSlots, productKey) {
        selectedSlots.forEach((slot) => {
            const obj = gltf.scene.clone(true);
            obj.updateMatrixWorld(true);

            const box = new THREE.Box3().setFromObject(obj);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);
            obj.position.sub(center);

            const modelLength = Math.max(size.x, size.z, 0.0001);
            const scale = targetLength / modelLength;
            obj.scale.setScalar(scale);
            obj.position.add(slot.position);
            obj.lookAt(0, obj.position.y, 0);
            obj.position.add(new THREE.Vector3(
                Math.cos(slot.angle) * -0.15,
                0,
                Math.sin(slot.angle) * -0.15
            ));

            const alignedBox = new THREE.Box3().setFromObject(obj);
            obj.position.y += shoeBaseY - alignedBox.min.y;

            obj.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
            });

            obj.userData.homePosition = obj.position.clone();
            obj.userData.shoeIndex = nextShoeIndex++;
            obj.userData.productKey = productKey;
            shoes.push(obj);
            roomGroup.add(obj);
        });
    }

    loader.load(
        '/models/chuck_taylor_70.glb',
        (gltf) => {
            placeModelInstances(
                gltf,
                2.5,
                slots.filter((_, index) => index % 2 === 0),
                'converse_chuck_70'
            );
        },
        undefined,
        (err) => console.error('GLB load error:', '/models/chuck_taylor_70.glb', err)
    );

    loader.load(
        '/models/vans_old_skool_green.glb',
        (gltf) => {
            placeModelInstances(
                gltf,
                2.5,
                slots.filter((_, index) => index % 2 === 1),
                'vans_old_skool_green'
            );
        },
        undefined,
        (err) => console.error('GLB load error:', '/models/vans_old_skool_green.glb', err)
    );
}








































































