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
let targetRotation = 0;
let currentRotation = 0;
const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia('(pointer: coarse)').matches;

// Переменная для отслеживания состояния меню
let isMenuVisible = true;

// Переменные для управления освещением
let ambientLight, directionalLight, wallLight;
let targetLightIntensity = 1.0;
let currentLightIntensity = 1.0;

// Для определения взаимодействия со стеной
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

let adminViewerActive = false;
let adminHud = null;
let lastFrameTime = performance.now();
const adminMoveState = { forward: false, back: false, left: false, right: false };
const adminMoveSpeed = 4.0;
const adminLookSensitivity = 0.002;
const adminPitchLimit = Math.PI / 2 - 0.01;
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
        document.getElementById('loading').innerHTML = 'Ошибка загрузки: ' + error.message;
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
    
    // Инициализация Raycaster для определения пересечений
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    initialCameraPosition.copy(camera.position);
    initialCameraQuaternion.copy(camera.quaternion);
    createAdminHud();
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
}

function setAdminViewerActive(active) {
    if (isMobileDevice) return;
    adminViewerActive = active;

    if (adminViewerActive) {
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
        return;
    }

    adminMoveState.forward = false;
    adminMoveState.back = false;
    adminMoveState.left = false;
    adminMoveState.right = false;
    camera.position.copy(initialCameraPosition);
    camera.quaternion.copy(initialCameraQuaternion);
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
    adminHud.textContent = `x: ${camera.position.x.toFixed(2)}  y: ${camera.position.y.toFixed(2)}  z: ${camera.position.z.toFixed(2)}`;
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
    // Создаем группу для всей комнаты
    roomGroup = new THREE.Group();
    scene.add(roomGroup);
    
    // Создаем пол
    createFloor();
    
    // Создаем стены
    createWalls();
    
    // Создаем потолок
    createCeiling();
    
    // Добавляем рамки на стены
    addWallObjects();
    
    console.log('Room created with walls, floor, ceiling and picture frames');
}

function createFloor() {
    // Создаем текстуру ламината
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    // Рисуем узор ламината
    context.fillStyle = '#8B4513';
    context.fillRect(0, 0, 512, 512);
    
    context.strokeStyle = '#A0522D';
    context.lineWidth = 2;
    
    // Рисуем линии ламината
    for (let x = 0; x < 512; x += 64) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, 512);
        context.stroke();
    }
    
    for (let y = 0; y < 512; y += 64) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(512, y);
        context.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);

    const floorGeometry = new THREE.CircleGeometry(15, 32);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        map: texture,
        roughness: 0.8,
        metalness: 0.2
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4;
    floor.receiveShadow = true;
    
    roomGroup.add(floor);
}

function createWalls() {
    // Создаем стены бежевого цвета
    const wallGeometry = new THREE.CylinderGeometry(12, 12, 8, 36, 1, true);
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xF5F5DC,
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.1
    });
    
    walls = new THREE.Mesh(wallGeometry, wallMaterial);
    walls.position.y = 0;
    
    roomGroup.add(walls);
}

function createCeiling() {
    // Создаем потолок
    const ceilingGeometry = new THREE.CircleGeometry(12, 32);
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xE8E8E8,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    
    roomGroup.add(ceiling);
    
    // Добавляем светильник на потолок
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
    
    // Внешняя рамка
    const frameGeometry = new THREE.BoxGeometry(width + frameWidth * 2, height + frameWidth * 2, 0.15);
    const frameMaterial = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.4,
        metalness: 0.2
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    
    // Внутренняя часть (холст)
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
    // Цвета для рамок (деревянные оттенки)
    const frameColors = [
        0x8B4513,
        0xA0522D,
        0xCD853F,
        0xD2691E,
        0xB8860B,
        0xDAA520
    ];
    
    // Добавляем рамки на стены
    for (let i = 0; i < 8; i++) {
        const color = frameColors[i % frameColors.length];
        const frame = createPictureFrame(2.2, 1.6, 0.15, color);
        
        // Располагаем рамки на стенах
        const angle = (i / 8) * Math.PI * 2;
        const radius = 11.9;
        
        frame.position.set(
            Math.cos(angle) * radius,
            0.5,
            Math.sin(angle) * radius
        );
        
        // Поворачиваем рамки к центру
        frame.lookAt(0, frame.position.y, 0);
        
        // Убираем тени с рамок чтобы избежать артефактов
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
    
    // Точечный свет для лучшего освещения стен
    wallLight = new THREE.PointLight(0xffffff, 0.8);
    wallLight.position.set(0, 3, 0);
    scene.add(wallLight);
}

function setupEventListeners() {
    const canvas = renderer.domElement;
    
    // Мышь
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('click', onCanvasClick);
    
    // Сенсорные события
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    
    // Ресайз окна
    window.addEventListener('resize', onWindowResize);
    
    // Обработка клавиши ESC
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    if (!isMobileDevice) {
        document.addEventListener('mousemove', onAdminMouseMove);
        document.addEventListener('pointerlockchange', onPointerLockChange);
    }
    
    // Клики по меню
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
    
    // Кнопка скрытия/показа меню
    const toggleMenuBtn = document.getElementById('toggleMenuBtn');
    toggleMenuBtn.addEventListener('click', toggleMenu);
    
    // Блокируем клики на canvas когда меню скрыто
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

// Обработка нажатия клавиш
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
        if (key === 'w') adminMoveState.forward = true;
        if (key === 's') adminMoveState.back = true;
        if (key === 'a') adminMoveState.left = true;
        if (key === 'd') adminMoveState.right = true;

        if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
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
}

function checkWallIntersection(event) {
    if (!walls) return false;
    
    const rect = renderer.domElement.getBoundingClientRect();
    
    // Вычисляем нормализованные координаты мыши
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Обновляем луч
    raycaster.setFromCamera(mouse, camera);
    
    // Проверяем пересечение со стенами
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
function onCanvasClick(event) {
    if (adminViewerActive) return;
    if (isMenuVisible) return;
    if (performance.now() < ignoreNextClickUntil) return;
    if (suppressNextCanvasClick) {
        suppressNextCanvasClick = false;
        return;
    }

    const clickedShoe = getShoeFromMouseEvent(event);


    if (focusedShoe) {
        if (clickedShoe !== focusedShoe) return;
        if (isRotatingShoe) return;

        isReturningShoe = true;
        shoeTransitionActive = true;
        return;
    }

    if (!clickedShoe) return;
    if (!isRoomRotationStable()) return;

    focusedShoe = clickedShoe;
    isReturningShoe = false;
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

    
    // Проверяем что клик был по стене
    const isOverWall = checkWallIntersection(event);
    if (!isOverWall) return;
    
    isDragging = true;
    previousMousePosition.x = event.clientX;
    
    // Меняем курсор при перетаскивании
    renderer.domElement.style.cursor = 'grabbing';
    
    event.preventDefault();
}

function onMouseUp() {
    isDragging = false;
    isRotatingShoe = false;
    
    // Возвращаем курсор в зависимости от положения
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
    alert(`Показываем товары категории: ${category}`);
}

// Функция переключения меню
function toggleMenu() {
    const menu = document.querySelector('.center-menu');
    const toggleBtn = document.getElementById('toggleMenuBtn');
    const canvas = renderer.domElement;
    
    if (isMenuVisible) {
        // Скрываем меню
        menu.style.opacity = '0';
        menu.style.transform = 'translate(-50%, -50%) scale(0.8)';
        menu.style.pointerEvents = 'none';
        toggleBtn.textContent = 'Показать меню';
        
        // Увеличиваем освещение
        targetLightIntensity = 1.0;
        
    } else {
        // Показываем меню
        menu.style.opacity = '1';
        menu.style.transform = 'translate(-50%, -50%) scale(1)';
        menu.style.pointerEvents = 'auto';
        toggleBtn.textContent = 'Скрыть меню';
        
        // Уменьшаем освещение для эффекта затемнения
        targetLightIntensity = 0.3;
    }
    
    isMenuVisible = !isMenuVisible;
    
    // Обновляем курсор
    if (!isMenuVisible) {
        // Если меню закрыто, проверяем положение курсора
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

    renderer.render(scene, camera);
}
function addWallObjects() {
    const loader = new GLTFLoader();

    const model = { url: '/models/chuck_taylor_70.glb', targetHeight: 1.2 };

    const count = 8;
    loader.load(
        model.url,
        (gltf) => {
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const radius = DEFAULT_SHOE_RADIUS;

                const pos = new THREE.Vector3(
                    Math.cos(angle) * radius,
                    0.5,
                    Math.sin(angle) * radius
                );

                const obj = gltf.scene.clone(true);
                obj.updateMatrixWorld(true);

                // Центруем модель по геометрии, чтобы корректно позиционировать у стены
                const box = new THREE.Box3().setFromObject(obj);
                const size = new THREE.Vector3();
                const center = new THREE.Vector3();
                box.getSize(size);
                box.getCenter(center);
                obj.position.sub(center);

                // Масштаб под целевую высоту
                const scale = model.targetHeight / Math.max(size.y, 0.0001);
                obj.scale.setScalar(scale);

                obj.position.add(pos);

                // Повернуть к центру
                obj.lookAt(0, obj.position.y, 0);

                // Небольшой отступ к центру, чтобы не врезаться в стену
                obj.position.add(new THREE.Vector3(
                    Math.cos(angle) * -0.15,
                    0,
                    Math.sin(angle) * -0.15
                ));

                obj.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = false;
                        child.receiveShadow = false;
                    }
                });

                obj.userData.homePosition = obj.position.clone();
                obj.userData.shoeIndex = i;
                shoes.push(obj);
                roomGroup.add(obj);
            }
        },
        undefined,
        (err) => console.error('GLB load error:', model.url, err)
    );
}



































































