import * as THREE from 'three';

console.log('Three.js version:', THREE.REVISION);

let scene, camera, renderer, roomGroup;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let targetRotation = 0;
let currentRotation = 0;

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
    
    container.appendChild(renderer.domElement);
    
    // Инициализация Raycaster для определения пересечений
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
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
    addPictureFrames();
    
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
    
    // Сенсорные события
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    
    // Ресайз окна
    window.addEventListener('resize', onWindowResize);
    
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
        if (!isMenuVisible) {
            e.stopPropagation();
        }
    });
}

// Функция для проверки пересечения с стеной
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

function onMouseMove(event) {
    // Проверяем пересечение со стеной
    const isOverWall = checkWallIntersection(event);
    
    if (isMenuVisible) {
        renderer.domElement.style.cursor = 'default';
        return;
    }
    
    if (isOverWall) {
        renderer.domElement.style.cursor = 'grab';
    } else {
        renderer.domElement.style.cursor = 'default';
    }
    
    // Обработка перетаскивания (только если меню закрыто)
    if (!isDragging || isMenuVisible) return;
    
    const deltaX = event.clientX - previousMousePosition.x;
    targetRotation += deltaX * 0.003;
    previousMousePosition.x = event.clientX;
}

function onMouseDown(event) {
    if (isMenuVisible) return;
    
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
    
    // Возвращаем курсор в зависимости от положения
    if (!isMenuVisible && checkWallIntersection({ clientX: previousMousePosition.x, clientY: previousMousePosition.y })) {
        renderer.domElement.style.cursor = 'grab';
    } else {
        renderer.domElement.style.cursor = 'default';
    }
}

function onMouseLeave() {
    isDragging = false;
    renderer.domElement.style.cursor = 'default';
}

function onTouchStart(event) {
    if (isMenuVisible) return;
    
    if (event.touches.length === 1) {
        isDragging = true;
        previousMousePosition.x = event.touches[0].clientX;
        
        // Для тача считаем что всегда взаимодействуем со стеной
        renderer.domElement.style.cursor = 'grabbing';
    }
    event.preventDefault();
}

function onTouchMove(event) {
    if (!isDragging || isMenuVisible || event.touches.length !== 1) return;
    
    const deltaX = event.touches[0].clientX - previousMousePosition.x;
    targetRotation += deltaX * 0.002;
    previousMousePosition.x = event.touches[0].clientX;
    event.preventDefault();
}

function onTouchEnd() {
    isDragging = false;
    renderer.domElement.style.cursor = 'default';
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
    
    // Плавное изменение освещения с большей разницей
    currentLightIntensity += (targetLightIntensity - currentLightIntensity) * 0.08;
    if (ambientLight) {
        ambientLight.intensity = currentLightIntensity;
    }
    
    // Также меняем интенсивность точечного света для большего эффекта
    if (wallLight) {
        wallLight.intensity = currentLightIntensity * 0.6;
    }
    
    // Плавное вращение (работает всегда, независимо от состояния меню)
    currentRotation += (targetRotation - currentRotation) * 0.03;
    if (roomGroup) {
        roomGroup.rotation.y = currentRotation;
    }
    
    renderer.render(scene, camera);
}