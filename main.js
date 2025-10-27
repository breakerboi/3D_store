import * as THREE from 'three';

console.log('Three.js version:', THREE.REVISION);
console.log('Script started...');

// Инициализация сцены
let scene, camera, renderer, gallery;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let targetRotation = 0;
let currentRotation = 0;

// Простые цвета вместо текстур для теста
const colors = [
    0xff0000, 0x00ff00, 0x0000ff, 
    0xffff00, 0xff00ff, 0x00ffff
];

init();

function init() {
    console.log('Initializing scene...');
    try {
        createScene();
        createGallery();
        createLights();
        setupEventListeners();
        animate();
        
        // Скрываем загрузку
        document.getElementById('loading').style.display = 'none';
        console.log('Scene initialized successfully!');
    } catch (error) {
        console.error('Error during initialization:', error);
        document.getElementById('loading').innerHTML = 'Ошибка загрузки: ' + error.message;
    }
}

function createScene() {
    // Сцена
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    
    // Камера
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 5);
    
    // Рендерер
    const container = document.getElementById('canvas-container');
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    container.appendChild(renderer.domElement);
    console.log('Scene created');
}

function createGallery() {
    // Создаем цилиндрическую галерею
    const galleryGeometry = new THREE.CylinderGeometry(12, 12, 8, 36, 1, true);
    const galleryMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x333333,
        side: THREE.DoubleSide,
        wireframe: true // Временно для отладки
    });
    
    gallery = new THREE.Mesh(galleryGeometry, galleryMaterial);
    scene.add(gallery);
    
    // Добавляем простые кубы вместо картин для теста
    addTestObjects();
    
    console.log('Gallery created with test objects');
}

function addTestObjects() {
    // Добавляем простые кубы на стены вместо картин
    for (let i = 0; i < 8; i++) {
        const color = colors[i % colors.length];
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const cube = new THREE.Mesh(geometry, material);
        
        // Располагаем кубы по кругу
        const angle = (i / 8) * Math.PI * 2;
        cube.position.set(
            Math.cos(angle) * 10,
            0,
            Math.sin(angle) * 10
        );
        
        scene.add(cube);
    }
}

function createLights() {
    // Простой ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);
    
    console.log('Lights created');
}

function setupEventListeners() {
    const canvas = renderer.domElement;
    
    // Мышь
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);
    
    // Сенсорные события
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    
    // Ресайз окна
    window.addEventListener('resize', onWindowResize);
    
    // Клики по меню
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const category = item.dataset.category;
            showProducts(category);
        });
    });
    
    console.log('Event listeners setup');
}

function onMouseDown(event) {
    isDragging = true;
    previousMousePosition.x = event.clientX;
    event.preventDefault();
}

function onMouseMove(event) {
    if (!isDragging) return;
    
    const deltaX = event.clientX - previousMousePosition.x;
    targetRotation += deltaX * 0.01;
    previousMousePosition.x = event.clientX;
}

function onMouseUp() {
    isDragging = false;
}

function onWheel(event) {
    // Zoom with mouse wheel
    camera.position.z += event.deltaY * 0.01;
    camera.position.z = Math.max(3, Math.min(20, camera.position.z));
}

function onTouchStart(event) {
    if (event.touches.length === 1) {
        isDragging = true;
        previousMousePosition.x = event.touches[0].clientX;
    }
    event.preventDefault();
}

function onTouchMove(event) {
    if (!isDragging || event.touches.length !== 1) return;
    
    const deltaX = event.touches[0].clientX - previousMousePosition.x;
    targetRotation += deltaX * 0.01;
    previousMousePosition.x = event.touches[0].clientX;
    event.preventDefault();
}

function onTouchEnd() {
    isDragging = false;
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

function animate() {
    requestAnimationFrame(animate);
    
    // Плавное вращение
    currentRotation += (targetRotation - currentRotation) * 0.05;
    if (gallery) {
        gallery.rotation.y = currentRotation;
    }
    
    // Рендер сцены
    renderer.render(scene, camera);
}

console.log('Main.js loaded completely');