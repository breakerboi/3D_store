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
let selectedCatalogItemId = '';
let catalogDrawerOpen = false;
let highlightedShoe = null;
let selectionMarker = null;
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
const SHOE_SPOTLIGHT_HEIGHT = 1.8;
const SHOE_SPOTLIGHT_OFFSET_Y = -0.45;
const SHOE_SPOTLIGHT_INTENSITY = 8.4;
const SHOE_SPOTLIGHT_DISTANCE = 12.0;
const SHOE_SPOTLIGHT_ANGLE = Math.PI / 8;
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
const MOCK_CATALOG_ITEMS = [
    { id: 'converse_chuck_70_black', brand: 'Converse', category: 'Кеды', title: 'Chuck Taylor 70 Black', description: 'Плотный канвас, винтажная подошва и амортизация OrthoLite.', price: 11990, sizes: 'EU 40, 41, 42, 43, 44', inStock: true, productKey: 'converse_chuck_70' },
    { id: 'converse_chuck_70_white', brand: 'Converse', category: 'Кеды', title: 'Chuck Taylor 70 White', description: 'Классический силуэт в светлой палитре для повседневной носки.', price: 11990, sizes: 'EU 39, 40, 41, 42, 43', inStock: true, productKey: 'converse_chuck_70' },
    { id: 'vans_old_skool_green', brand: 'Vans', category: 'Кеды', title: 'Old Skool Green', description: 'Фирменная боковая полоса, замшево-канвасный верх и цепкая вафельная подошва.', price: 10490, sizes: 'EU 39, 40, 41, 42, 43, 44', inStock: true, productKey: 'vans_old_skool_green' },
    { id: 'vans_old_skool_black', brand: 'Vans', category: 'Кеды', title: 'Old Skool Black', description: 'Базовый цвет, который легко сочетается с streetwear и casual.', price: 10490, sizes: 'EU 40, 41, 42, 43', inStock: true, productKey: 'vans_old_skool_green' },
    { id: 'converse_all_star_low', brand: 'Converse', category: 'Кеды', title: 'Chuck Taylor All Star Low', description: 'Низкий профиль для легких повседневных образов.', price: 8990, sizes: 'EU 39, 40, 41, 42', inStock: true, productKey: 'converse_chuck_70' },
    { id: 'vans_sk8_hi', brand: 'Vans', category: 'Кеды', title: 'SK8-Hi Black', description: 'Высокий силуэт с усиленными зонами износа.', price: 11290, sizes: 'EU 40, 41, 42, 43, 44', inStock: true, productKey: 'vans_old_skool_green' },
    { id: 'dickies_hoodie_black', brand: 'Dickies', category: 'Одежда', title: 'Hoodie Black', description: 'Плотный флис, свободный крой, базовый черный цвет.', price: 6590, sizes: 'S, M, L, XL', inStock: true, productKey: 'converse_chuck_70' },
    { id: 'converse_tee_white', brand: 'Converse', category: 'Одежда', title: 'Logo Tee White', description: 'Футболка из мягкого хлопка с контрастным логотипом.', price: 2990, sizes: 'S, M, L', inStock: true, productKey: 'converse_chuck_70' },
    { id: 'anteater_cap_black', brand: 'Anteater', category: 'Аксессуары', title: '6 Panel Cap Black', description: 'Минималистичная кепка с регулировкой объема.', price: 1690, sizes: 'One size', inStock: true, productKey: 'vans_old_skool_green' },
    { id: 'converse_backpack_speed', brand: 'Converse', category: 'Аксессуары', title: 'Speed Backpack', description: 'Вместительный рюкзак для города и учебы.', price: 4550, sizes: 'One size', inStock: true, productKey: 'converse_chuck_70' }
];
let catalogItems = [...MOCK_CATALOG_ITEMS];

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
        initCatalogUi();
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
    createSelectionMarker();
}

function createSelectionMarker() {
    const markerGeometry = new THREE.TorusGeometry(0.65, 0.04, 12, 48);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x71b7ff,
        transparent: true,
        opacity: 0.9
    });
    selectionMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    selectionMarker.rotation.x = Math.PI / 2;
    selectionMarker.visible = false;
    scene.add(selectionMarker);
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
    if (!canvas.isConnected) return;
    if (!document.contains(canvas)) return;
    if (canvas.ownerDocument !== document) return;
    const rootNode = typeof canvas.getRootNode === 'function' ? canvas.getRootNode() : document;
    if (rootNode !== document) return;
    if (document.pointerLockElement !== canvas) {
        try {
            const maybePromise = canvas.requestPointerLock();
            if (maybePromise && typeof maybePromise.catch === 'function') {
                maybePromise.catch(() => {});
            }
        } catch (_) {}
    }
}

function onPointerLockChange() {
    const canvas = renderer && renderer.domElement;
    if (!adminViewerActive || !canvas) return;
    if (document.pointerLockElement !== canvas) {
        document.body.style.cursor = 'none';
        renderer.domElement.style.cursor = 'none';
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
        metalness: 0.05,
        side: THREE.DoubleSide
    });
    
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    
    roomGroup.add(ceiling);
    
    // Центральный светильник: подвес с чашей, штангой, кольцом и видимой лампой
    const fixtureGroup = new THREE.Group();

    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0xbfc3c8,
        roughness: 0.24,
        metalness: 0.88
    });

    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 28), metalMaterial);
    canopy.position.y = 3.97;
    fixtureGroup.add(canopy);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 16), metalMaterial);
    stem.position.y = 3.74;
    fixtureGroup.add(stem);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.04, 16, 40), metalMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 3.50;
    fixtureGroup.add(ring);

    const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 20, 16),
        new THREE.MeshStandardMaterial({
            color: 0xfff7dd,
            emissive: 0xffefc1,
            emissiveIntensity: 0.9,
            roughness: 0.2,
            metalness: 0.0
        })
    );
    bulb.position.y = 3.48;
    fixtureGroup.add(bulb);

    const glassShade = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 24, 18),
        new THREE.MeshStandardMaterial({
            color: 0xfdfbf2,
            transparent: true,
            opacity: 0.24,
            roughness: 0.1,
            metalness: 0.0
        })
    );
    glassShade.position.y = 3.44;
    fixtureGroup.add(glassShade);

    roomGroup.add(fixtureGroup);
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
    ambientLight = new THREE.AmbientLight(0xffffff, currentLightIntensity * 0.45);
    scene.add(ambientLight);
    
    // Directional light
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.56);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = false;
    scene.add(directionalLight);
    
    // РўРѕС‡РµС‡РЅС‹Р№ СЃРІРµС‚ РґР»СЏ Р»СѓС‡С€РµРіРѕ РѕСЃРІРµС‰РµРЅРёСЏ СЃС‚РµРЅ
    wallLight = new THREE.PointLight(0xffffff, 0.4);
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

function parseCsv(text) {
    const rows = [];
    let current = '';
    let row = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') i += 1;
            row.push(current);
            if (row.some((cell) => cell.trim() !== '')) rows.push(row);
            row = [];
            current = '';
            continue;
        }

        current += char;
    }

    if (current.length > 0 || row.length > 0) {
        row.push(current);
        if (row.some((cell) => cell.trim() !== '')) rows.push(row);
    }

    return rows;
}

function normalizeHeader(value) {
    return value.replace(/^\uFEFF/, '').trim().toLowerCase();
}

function parsePriceValue(value) {
    if (!value) return null;
    const cleaned = value.replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(',', '.');
    const number = Number.parseFloat(cleaned);
    return Number.isFinite(number) ? Math.round(number) : null;
}

function parseStockValue(value) {
    if (value === undefined || value === null) return 0;
    const text = String(value).trim();
    if (!text) return 0;
    const matches = text.match(/\d+/g);
    if (!matches) return 0;
    return matches.reduce((sum, part) => sum + Number.parseInt(part, 10), 0);
}

function inferProductKey(brand) {
    if (!brand) return 'converse_chuck_70';
    const upper = brand.toUpperCase();
    if (upper.includes('VANS')) return 'vans_old_skool_green';
    return 'converse_chuck_70';
}

function extractSizesFromRecord(record) {
    return Object.entries(record)
        .filter(([key, value]) => {
            const normalized = key.toLowerCase();
            if (['id', 'name', 'price', 'count', 'total', 'notes', 'sold', 'relevant_vk', 'color'].includes(normalized)) return false;
            return parseStockValue(value) > 0;
        })
        .map(([key]) => key.trim());
}

function parseCatalogSheet(rows, defaultCategory) {
    if (!rows.length) return [];
    const headerRowIndex = rows.findIndex((row) => row.some((cell) => normalizeHeader(cell) === 'id') && row.some((cell) => normalizeHeader(cell) === 'name'));
    if (headerRowIndex === -1) return [];

    const headers = rows[headerRowIndex].map((cell) => normalizeHeader(cell));
    const dataRows = rows.slice(headerRowIndex + 1);
    const result = [];
    let currentBrand = '';
    let currentCategory = defaultCategory;

    dataRows.forEach((row, idx) => {
        const record = {};
        headers.forEach((header, index) => {
            record[header] = (row[index] || '').trim();
        });

        const id = (record.id || '').trim();
        const name = (record.name || '').trim();
        const price = parsePriceValue(record.price || '');
        const stock = parseStockValue(record.count || record.total || '');

        const hasData = Boolean(id || price !== null || stock > 0);
        if (!hasData && name) {
            const upper = name.toUpperCase();
            const maybeBrand = upper === name && !name.includes(' ');
            const looksBrand = maybeBrand || ['CONVERSE', 'VANS', 'SAUCONY', 'DR MARTENS', 'ANTEATER', 'SALE', 'WINTER SALE', 'DICKIES'].includes(upper);
            if (looksBrand) {
                currentBrand = name;
                currentCategory = defaultCategory;
            } else {
                currentCategory = name;
            }
            return;
        }
        if (!hasData || !name) return;

        const sizesArray = extractSizesFromRecord(record);
        result.push({
            id: id || `${defaultCategory.toLowerCase()}_${idx}_${name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '_')}`,
            brand: currentBrand || 'Без бренда',
            category: defaultCategory,
            title: name,
            description: `${currentCategory || defaultCategory}. ${name}`,
            price: price ?? 0,
            sizes: sizesArray.length ? `Размеры: ${sizesArray.join(', ')}` : 'Размеры: уточняйте',
            inStock: stock > 0,
            productKey: inferProductKey(currentBrand)
        });
    });

    return result;
}

async function loadCatalogFromCsv() {
    const sources = [
        { url: '/data/shoes.csv', category: 'Обувь' },
        { url: '/data/clothes.csv', category: 'Одежда' },
        { url: '/data/accessories.csv', category: 'Аксессуары' }
    ];

    const loaded = await Promise.all(sources.map(async (source) => {
        const response = await fetch(source.url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Failed to load ${source.url}`);
        const text = await response.text();
        const rows = parseCsv(text);
        return parseCatalogSheet(rows, source.category);
    }));

    return loaded.flat().filter((item) => item.title && item.price !== null);
}

function formatPriceRUB(price) {
    const numeric = Number(price);
    if (!Number.isFinite(numeric)) return String(price || '');
    return `${new Intl.NumberFormat('ru-RU').format(numeric)} ₽`;
}

function setProductCardContent(data) {
    const brandNode = document.getElementById('productCardBrand');
    const titleNode = document.getElementById('productCardTitle');
    const descriptionNode = document.getElementById('productCardDescription');
    const priceNode = document.getElementById('productCardPrice');
    const sizesNode = document.getElementById('productCardSizes');
    if (brandNode) brandNode.textContent = data.brand || '';
    if (titleNode) titleNode.textContent = data.title || '';
    if (descriptionNode) descriptionNode.textContent = data.description || '';
    if (priceNode) priceNode.textContent = typeof data.price === 'number' ? formatPriceRUB(data.price) : (data.price || '');
    if (sizesNode) sizesNode.textContent = data.sizes || '';
}

function getCatalogItemById(itemId) {
    return catalogItems.find((item) => item.id === itemId) || null;
}

function getAvailableBrands() {
    return [...new Set(catalogItems.map((item) => item.brand))].sort();
}

function getAvailableCategories() {
    return [...new Set(catalogItems.map((item) => item.category))].sort();
}

function getFilteredCatalogItems() {
    const brandFilter = document.getElementById('catalogBrandFilter');
    const categoryFilter = document.getElementById('catalogCategoryFilter');
    const sizeFilter = document.getElementById('catalogSizeFilter');
    const priceFilter = document.getElementById('catalogPriceFilter');

    const brandValue = brandFilter ? brandFilter.value : 'all';
    const categoryValue = categoryFilter ? categoryFilter.value : 'all';
    const sizeValue = sizeFilter ? sizeFilter.value.trim().toLowerCase() : '';
    const maxPrice = priceFilter && priceFilter.value ? Number(priceFilter.value) : null;

    return catalogItems.filter((item) => {
        if (brandValue !== 'all' && item.brand !== brandValue) return false;
        if (categoryValue !== 'all' && item.category !== categoryValue) return false;
        const sizesText = String(item.sizes || '').toLowerCase();
        if (sizeValue && !sizesText.includes(sizeValue)) return false;
        if (maxPrice !== null && Number.isFinite(maxPrice) && item.price > maxPrice) return false;
        return true;
    });
}

function renderCatalogList() {
    const list = document.getElementById('catalogList');
    if (!list) return;
    const filteredItems = getFilteredCatalogItems();
    list.innerHTML = '';

    filteredItems.forEach((item) => {
        const itemNode = document.createElement('button');
        itemNode.type = 'button';
        itemNode.className = `catalog-item${selectedCatalogItemId === item.id ? ' active' : ''}`;
        itemNode.innerHTML = `
            <div class="catalog-item-title">${item.title}</div>
            <div class="catalog-item-meta">${item.brand} · ${item.category}</div>
            <div class="catalog-item-meta">${formatPriceRUB(item.price)} · ${item.inStock ? 'В наличии' : 'Нет в наличии'}</div>
        `;
        itemNode.addEventListener('click', () => selectCatalogItem(item.id));
        list.appendChild(itemNode);
    });
}

function setCatalogDrawerOpen(open) {
    const drawer = document.getElementById('catalogDrawer');
    if (!drawer) return;
    catalogDrawerOpen = open;
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('catalog-open', open);
}

function update3DHighlightByProductKey(productKey) {
    highlightedShoe = shoes.find((shoe) => shoe.userData.productKey === productKey) || null;
}

function selectCatalogItem(itemId) {
    if (selectedCatalogItemId === itemId) {
        selectedCatalogItemId = '';
        highlightedShoe = null;
        renderCatalogList();
        return;
    }

    const item = getCatalogItemById(itemId);
    if (!item) return;
    selectedCatalogItemId = itemId;
    setProductCardContent(item);
    update3DHighlightByProductKey(item.productKey);
    renderCatalogList();
}

function populateCatalogFilterOptions() {
    const brandFilter = document.getElementById('catalogBrandFilter');
    const categoryFilter = document.getElementById('catalogCategoryFilter');

    if (brandFilter) {
        brandFilter.innerHTML = '<option value="all">Бренд: все</option>';
        getAvailableBrands().forEach((brand) => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = `Бренд: ${brand}`;
            brandFilter.appendChild(option);
        });
    }

    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="all">Категория: все</option>';
        getAvailableCategories().forEach((category) => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = `Категория: ${category}`;
            categoryFilter.appendChild(option);
        });
    }
}

async function initCatalogUi() {
    const brandFilter = document.getElementById('catalogBrandFilter');
    const categoryFilter = document.getElementById('catalogCategoryFilter');
    const sizeFilter = document.getElementById('catalogSizeFilter');
    const priceFilter = document.getElementById('catalogPriceFilter');
    const catalogToggleBtn = document.getElementById('catalogToggleBtn');

    try {
        const csvItems = await loadCatalogFromCsv();
        if (csvItems.length) {
            catalogItems = csvItems;
        } else {
            console.warn('CSV loaded but no valid items found, fallback to mock catalog.');
        }
    } catch (error) {
        console.warn('Failed to load catalog CSV, fallback to mock catalog.', error);
    }

    populateCatalogFilterOptions();

    if (brandFilter) {
        brandFilter.addEventListener('change', renderCatalogList);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', renderCatalogList);
    }

    if (sizeFilter) sizeFilter.addEventListener('input', renderCatalogList);
    if (priceFilter) priceFilter.addEventListener('input', renderCatalogList);

    if (catalogToggleBtn) {
        catalogToggleBtn.addEventListener('click', () => {
            setCatalogDrawerOpen(!catalogDrawerOpen);
        });
    }

    renderCatalogList();
}

function updateProductCardVisibility() {
    const card = document.getElementById('productCard');
    if (!card) return;

    const selectedItem = getCatalogItemById(selectedCatalogItemId);
    const focusedData = focusedShoe && !isReturningShoe
        ? (PRODUCT_CATALOG[focusedShoe.userData.productKey] || PRODUCT_CATALOG.converse_chuck_70)
        : null;

    const cardData = selectedItem || focusedData;
    const shouldShow = Boolean(cardData);

    if (cardData) {
        const key = selectedItem ? `catalog:${selectedItem.id}` : `focused:${focusedShoe.userData.productKey}`;
        if (key !== currentCardProductKey) {
            setProductCardContent(cardData);
            currentCardProductKey = key;
        }
    }

    if (shouldShow === productCardVisible) return;
    productCardVisible = shouldShow;
    card.classList.toggle('visible', shouldShow);
    card.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    if (!shouldShow) currentCardProductKey = '';
}

function updateSelectionMarker() {
    if (!selectionMarker || !roomGroup) return;
    if (!highlightedShoe) {
        selectionMarker.visible = false;
        return;
    }

    const localTarget = highlightedShoe.userData.homePosition
        ? highlightedShoe.userData.homePosition.clone()
        : highlightedShoe.position.clone();
    const worldTarget = roomGroup.localToWorld(localTarget);
    selectionMarker.position.set(worldTarget.x, -3.95, worldTarget.z);
    const pulse = 1 + 0.08 * Math.sin(performance.now() * 0.008);
    selectionMarker.scale.setScalar(pulse);
    selectionMarker.visible = true;
}

function attachShoeSpotlight(shoe) {
    if (!roomGroup || !shoe) return;

    const light = new THREE.SpotLight(
        0xffffff,
        SHOE_SPOTLIGHT_INTENSITY,
        SHOE_SPOTLIGHT_DISTANCE,
        SHOE_SPOTLIGHT_ANGLE,
        0.45,
        2
    );
    light.castShadow = false;

    const target = new THREE.Object3D();
    roomGroup.add(target);
    roomGroup.add(light);

    shoe.userData.displaySpotlightAnchor = (shoe.userData.homePosition || shoe.position).clone();
    shoe.userData.displaySpotlight = light;
    shoe.userData.displaySpotlightTarget = target;
}

function updateShoeSpotlights() {
    for (let i = 0; i < shoes.length; i += 1) {
        const shoe = shoes[i];
        const light = shoe.userData.displaySpotlight;
        const target = shoe.userData.displaySpotlightTarget;
        const anchor = shoe.userData.displaySpotlightAnchor || shoe.userData.homePosition || shoe.position;
        if (!light || !target) continue;

        light.position.set(
            anchor.x,
            anchor.y + SHOE_SPOTLIGHT_HEIGHT,
            anchor.z
        );
        target.position.set(
            anchor.x,
            anchor.y + SHOE_SPOTLIGHT_OFFSET_Y,
            anchor.z
        );
        light.target = target;
    }
}

function onKeyDown(event) {
    const keyLower = event.key.toLowerCase();
    const isAdminShortcut = event.ctrlKey && !event.repeat && (
        event.code === 'KeyV' ||
        event.code === 'KeyM' ||
        keyLower === 'v' ||
        keyLower === 'м'
    );
    if (isAdminShortcut) {
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
        if (key === 'w' || key === 'ц' || key === 'arrowup') adminMoveState.forward = true;
        if (key === 's' || key === 'ы' || key === 'arrowdown') adminMoveState.back = true;
        if (key === 'a' || key === 'ф' || key === 'arrowleft') adminMoveState.left = true;
        if (key === 'd' || key === 'в' || key === 'arrowright') adminMoveState.right = true;
        if (key === 'q') adminShoeRotateState.left = true;
        if (key === 'e') adminShoeRotateState.right = true;

        if (
            key === 'w' || key === 'ц' || key === 'arrowup' ||
            key === 's' || key === 'ы' || key === 'arrowdown' ||
            key === 'a' || key === 'ф' || key === 'arrowleft' ||
            key === 'd' || key === 'в' || key === 'arrowright' ||
            key === 'q' || key === 'e'
        ) {
            event.preventDefault();
            return;
        }
    }

    if (event.keyCode === 27 || event.key === 'Escape') {
        if (catalogDrawerOpen) {
            setCatalogDrawerOpen(false);
            event.preventDefault();
            return;
        }
        toggleMenu();
        event.preventDefault();
    }
}

function onKeyUp(event) {
    if (!adminViewerActive) return;

    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'ц' || key === 'arrowup') adminMoveState.forward = false;
    if (key === 's' || key === 'ы' || key === 'arrowdown') adminMoveState.back = false;
    if (key === 'a' || key === 'ф' || key === 'arrowleft') adminMoveState.left = false;
    if (key === 'd' || key === 'в' || key === 'arrowright') adminMoveState.right = false;
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
        ambientLight.intensity = currentLightIntensity * 0.45;
    }

    if (wallLight) {
        wallLight.intensity = currentLightIntensity * 0.4;
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
    updateSelectionMarker();
    updateShoeSpotlights();
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
            attachShoeSpotlight(obj);
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
            const selectedItem = getCatalogItemById(selectedCatalogItemId);
            if (selectedItem) {
                update3DHighlightByProductKey(selectedItem.productKey);
            }
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
            const selectedItem = getCatalogItemById(selectedCatalogItemId);
            if (selectedItem) {
                update3DHighlightByProductKey(selectedItem.productKey);
            }
        },
        undefined,
        (err) => console.error('GLB load error:', '/models/vans_old_skool_green.glb', err)
    );
}








































































