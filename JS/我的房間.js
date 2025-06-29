import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, model, controls;
let currentCamera;
let autoRotate = false;
const cameras = [];
const keys = { w: false, a: false, s: false, d: false };
const moveSpeed = 0.1;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const initialCameraPosition = new THREE.Vector3(0, 13, 15);
const initialCameraTarget = new THREE.Vector3(0, 1, 0);

const furnitureInfo = {
    '床': { price: 'NT$18,000', dimensions: '1.8x2.3x1.1m' },
    '衣櫃': { price: 'NT$8,000', dimensions: '2.7x0.5x2m' },
    '書桌': { price: 'NT$3,000', dimensions: '1.5x1x0.8m' },
    '櫃子': { price: 'NT$5,000', dimensions: '0.8x0.4x2m' },
    '電視櫃': { price: 'NT$2,000', dimensions: '1.8x0.3x0.7m' },
    '書櫃': { price: 'NT$5,000', dimensions: '0.5x0.5x2m' },
    '書櫃2': { price: 'NT$5,000', dimensions: '1.5x3.8x2m' },
    '電視': { price: 'NT$8,000', dimensions: '1.2x0.1x0.4m' },
    '窗簾': { price: 'NT$3,000', dimensions: '1.4x2.6x0.4m' },
    '窗簾2': { price: 'NT$3,000', dimensions: '1.4x2.6x0.4m' },
    '窗戶': { price: 'NT$5,000', dimensions: '0.2x4.0x2.6m' },
    '冷氣機': { price: 'NT$8,000', dimensions: '0.2x1.0x0.3m' },
    '電風扇': { price: 'NT$800', dimensions: '0.5x0.4x1.04m' },
    '筆電': { price: 'NT$25,000', dimensions: '0.4x0.6x0.3m' },
    '電腦椅': { price: 'NT$3,000', dimensions: '0.5x0.5x1.1m' }
};

const infoCard = document.getElementById('infoCard');
const materialControls = document.getElementById('materialControls');

let selectedObject = null;
let originalMaterial = null;

init();

function printHierarchy(object, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}- ${object.name || '(no name)'} [${object.type}]`);
    object.children.forEach(child => printHierarchy(child, depth + 1));
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.physicallyCorrectLights = true;
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xfff2cc, 2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfff2cc, 2);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const loader = new GLTFLoader();

    loader.load('./Model/我的房間3.glb', (gltf) => {
        model = gltf.scene;
        printHierarchy(model);

        // 延遲 1.5 秒隱藏 Loading 畫面
        setTimeout(() => {
            document.getElementById('loadingOverlay').style.display = 'none';
        }, 1500);
        model.scale.set(2, 2, 2);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        model.position.sub(center);
        model.position.y += size.y / 2;

        // 設置家具ID，方便顯示資訊
        const semanticNames = Object.keys(furnitureInfo);
        model.traverse((child) => {

            if (semanticNames.includes(child.name)) {
                child.userData.id = child.name;
            }
        });

        scene.add(model);

        // 光源設置（可依需要調整）
        const ceilingLight = new THREE.PointLight(0xffe0b2, 2.5, 50);
        ceilingLight.position.set(0, 6, 0);
        scene.add(ceilingLight);

        const spotLight = new THREE.SpotLight(0xfff2cc, 1.5, 15, Math.PI / 6, 0.2);
        spotLight.position.set(2, 4, 2);
        spotLight.target.position.set(0, 1, 0);
        scene.add(spotLight);
        scene.add(spotLight.target);

        document.getElementById('loadingOverlay').style.display = 'none';

        // 初始化攝影機
        const camera1 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera1.position.set(0, 13, 15);
        camera1.lookAt(0, 1, 0);

        const camera2 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera2.position.set(5, 1.6, 3);

        cameras.push(camera1, camera2);
        currentCamera = camera1;

        controls = new OrbitControls(currentCamera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.maxPolarAngle = Math.PI / 2;
        controls.target.set(0, 1, 0);
        controls.update();

        // 事件綁定
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('click', onMouseClick);
        window.addEventListener('mousemove', onMouseMove);

        // 控制板按鈕事件
        document.getElementById('startRotateBtn').addEventListener('click', () => {
            autoRotate = true;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 1.0;
        });

        document.getElementById('stopRotateBtn').addEventListener('click', () => {
            autoRotate = false;
            controls.autoRotate = false;
        });

        document.getElementById('resetViewBtn').addEventListener('click', () => {
            currentCamera.position.copy(initialCameraPosition);
            controls.target.copy(initialCameraTarget);
            controls.update();
            controls.reset();
            if (model) model.rotation.set(0, 0, 0);
            autoRotate = false;
            controls.autoRotate = false;
        });

        // 材質切換按鈕事件
        materialControls.addEventListener('click', (e) => {
            if (!selectedObject) return;
            if (e.target.tagName === 'BUTTON') {
                const color = e.target.getAttribute('data-color');
                let mat = findMaterial(selectedObject);

                if (!mat) return;

                if (color === 'original') {
                    // 還原材質顏色
                    if (Array.isArray(mat) && Array.isArray(originalMaterial)) {
                        mat.forEach((m, i) => m.color.copy(originalMaterial[i].color));
                    } else if (!Array.isArray(mat) && originalMaterial) {
                        mat.color.copy(originalMaterial.color);
                    }
                } else {
                    if (Array.isArray(mat)) {
                        mat.forEach(m => m.color.set(color));
                    } else {
                        mat.color.set(color);
                    }
                }

                if (Array.isArray(mat)) {
                    mat.forEach(m => (m.needsUpdate = true));
                } else {
                    mat.needsUpdate = true;
                }
            }
        });

        animate();
    }, undefined, (err) => {
        console.error('模型載入錯誤:', err);
    });
}

// 動畫迴圈
function animate() {
    requestAnimationFrame(animate);
    moveCamera();
    if (controls) controls.update();

    if (autoRotate && model) {
        model.rotation.y += 0.005;
    }

    renderer.render(scene, currentCamera);
}

function onKeyDown(event) {
    switch (event.key.toLowerCase()) {
        case 'w': keys.w = true; break;
        case 'a': keys.a = true; break;
        case 's': keys.s = true; break;
        case 'd': keys.d = true; break;
        case '1':
            currentCamera = cameras[0];
            controls.object = currentCamera;
            controls.update();
            break;
        case '2':
            currentCamera = cameras[1];
            controls.object = currentCamera;
            controls.update();
            break;
    }
}

function onKeyUp(event) {
    keys[event.key.toLowerCase()] = false;
}

function moveCamera() {
    if (!currentCamera) return;

    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();

    currentCamera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    right.crossVectors(currentCamera.up, direction).normalize();

    if (keys.w) currentCamera.position.addScaledVector(direction, moveSpeed);
    if (keys.s) currentCamera.position.addScaledVector(direction, -moveSpeed);
    if (keys.a) currentCamera.position.addScaledVector(right, moveSpeed);
    if (keys.d) currentCamera.position.addScaledVector(right, -moveSpeed);
}

function onWindowResize() {
    if (currentCamera) {
        currentCamera.aspect = window.innerWidth / window.innerHeight;
        currentCamera.updateProjectionMatrix();
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function findMaterial(obj) {
    if (!obj) return null;
    if (obj.material) {
        return obj.material;
    }
    if (obj.children && obj.children.length > 0) {
        for (let child of obj.children) {
            const mat = findMaterial(child);
            if (mat) return mat;
        }
    }
    if (obj.parent) {
        return findMaterial(obj.parent);
    }
    return null;
}

function onMouseClick(event) {
    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (el.closest('#infoCard') || el.closest('#materialControls')) return;
    raycaster.setFromCamera(mouse, currentCamera);
    const intersects = raycaster.intersectObject(model, true);
    if (intersects.length > 0) {
        let obj = intersects[0].object;

        while (obj && !obj.userData.id && obj.parent) {
            obj = obj.parent;
        }

        const id = obj.userData.id;
        if (id && furnitureInfo[id]) {
            selectedObject = obj;
            const mat = findMaterial(selectedObject);

            if (mat) {
                if (Array.isArray(mat)) {
                    originalMaterial = mat.map(m => m.clone());
                } else {
                    originalMaterial = mat.clone();
                }
            } else {
                originalMaterial = null;
            }

            const info = furnitureInfo[id];
            infoCard.style.display = 'block';
            infoCard.innerHTML = `<strong>${id}</strong><br>價格: ${info.price}<br>尺寸: ${info.dimensions}`;

            materialControls.style.display = 'block'; // 顯示材質控制

            // 設定鏡頭位置
            const targetPoint = new THREE.Vector3();
            obj.getWorldPosition(targetPoint);

            switch (id) {
                case '窗簾':
                case '窗簾2':
                    currentCamera.position.copy(targetPoint).add(new THREE.Vector3(-3, 1.5, 3));
                    break;
                case '冷氣機':
                    currentCamera.position.copy(targetPoint).add(new THREE.Vector3(-2, 2, 1));
                    break;
                case '窗戶':
                    currentCamera.position.copy(targetPoint).add(new THREE.Vector3(-3, 3, 6));
                    break;
                case '書櫃':
                    currentCamera.position.copy(targetPoint).add(new THREE.Vector3(0, 1.5, -4));
                    break;
                case '書櫃2':
                    currentCamera.position.copy(targetPoint).add(new THREE.Vector3(-3, 2, 4));
                    break;
                case '床':
                    currentCamera.position.copy(targetPoint).add(new THREE.Vector3(-1, 4, -4));
                    break;
                case '電風扇':
                    currentCamera.position.copy(targetPoint).add(new THREE.Vector3(2, 5, 5));
                    break;
                default:
                    currentCamera.position.copy(targetPoint).add(new THREE.Vector3(0, 2, 4));
                    break;
            }

            controls.target.copy(targetPoint);
            controls.update();
        }
    } else {
        selectedObject = null;
        originalMaterial = null;
        infoCard.style.display = 'none';
        materialControls.style.display = 'none'; // 隱藏材質控制
    }
}
document.getElementById('loadingOverlay').style.display = 'none';