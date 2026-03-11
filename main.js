/**
 * Project AstroMap: Phase 3 - Persistent Memory & Modal UI
 * 기능: 우주-지상 전환, 실시간 거리 계산, 로컬 스토리지 저장/불러오기, NASA 모달
 */

// 1. Scene, Camera, Renderer 설정 (동일)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#space-canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// 2. 우주 배경 (별 가루 - 동일)
const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
const starVertices = [];
for (let i = 0; i < 15000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// 3. 지구(Earth) 생성 (동일)
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
const earthNormalMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');
const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshStandardMaterial({ map: earthTexture, normalMap: earthNormalMap });
const earth = new THREE.Mesh(geometry, material);
scene.add(earth);

// 4. 조명 설정 (동일)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const sunLight = new THREE.PointLight(0xffffff, 1.2);
sunLight.position.set(5, 3, 5);
scene.add(sunLight);
camera.position.z = 5;

// -----------------------------------------------------------------
// 5. 상태 관리 및 지도 관련 변수 (isPathLoading 추가)
// -----------------------------------------------------------------
let isZooming = false;
let map; 
let runningPath; 
let markers = []; 
let isPathLoading = false; // 데이터를 불러오는 중인지 확인하는 변수

// 6. 구글 맵 초기화 함수 (loadPath 추가)
function initMap() {
    const initialLocation = { lat: 37.5665, lng: 126.9780 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 18,
        center: initialLocation,
        mapTypeId: 'satellite',
        tilt: 45
    });

    runningPath = new google.maps.Polyline({
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map
    });

    map.addListener("click", (event) => {
        addLatLngToPath(event.latLng); // 클릭 시에는 자동으로 저장됨
    });

    // [중요] 지도가 생성된 직후, 저장된 데이터가 있다면 불러옵니다.
    loadPath();
}

// 7. 경로 관리 함수들 (저장 로직 통합)
function addLatLngToPath(latLng, shouldSave = true) {
    const path = runningPath.getPath();
    path.push(latLng);

    const marker = new google.maps.Marker({
        position: latLng,
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4,
            fillColor: "#FF0000",
            fillOpacity: 1,
            strokeWeight: 0
        }
    });
    markers.push(marker);

    updateDistance();

    // 불러오기 중이 아닐 때만 로컬 스토리지에 저장
    if (shouldSave) {
        savePath();
    }
}

function updateDistance() {
    const path = runningPath.getPath();
    const distanceMeters = google.maps.geometry.spherical.computeLength(path);
    const distanceKm = (distanceMeters / 1000).toFixed(2);
    const distanceDisplay = document.getElementById('distance-value');
    if(distanceDisplay) distanceDisplay.innerText = distanceKm;
}

// 초기화 시 로컬 스토리지도 비워야 합니다.
function resetPath() {
    if(!runningPath) return;
    runningPath.getPath().clear();
    markers.forEach(m => m.setMap(null));
    markers = [];
    const distanceDisplay = document.getElementById('distance-value');
    if(distanceDisplay) distanceDisplay.innerText = "0";

    // [추가] 저장된 데이터 삭제
    localStorage.removeItem('astroPath');
}

// -----------------------------------------------------------------
// 8. 신규 추가: 저장 및 불러오기 로직
// -----------------------------------------------------------------
function savePath() {
    const path = runningPath.getPath();
    const coords = [];
    path.forEach(latLng => {
        coords.push({ lat: latLng.lat(), lng: latLng.lng() });
    });
    localStorage.setItem('astroPath', JSON.stringify(coords));
}

function loadPath() {
    const savedData = localStorage.getItem('astroPath');
    if (savedData) {
        isPathLoading = true;
        const coords = JSON.parse(savedData);
        coords.forEach(pos => {
            // 불러올 때는 shouldSave를 false로 두어 중복 저장을 방지합니다.
            addLatLngToPath(new google.maps.LatLng(pos.lat, pos.lng), false);
        });
        isPathLoading = false;
    }
}

// NASA 모달 표시 함수
function showNasaModal(data) {
    if(!data) return;
    document.getElementById('nasa-title').innerText = data.title;
    document.getElementById('nasa-image').src = data.url;
    document.getElementById('nasa-description').innerText = data.explanation;
    document.getElementById('nasa-modal').classList.remove('hidden');
}

// -----------------------------------------------------------------
// 9. 데이터 및 전환 로직 (alert 대신 모달 사용)
// -----------------------------------------------------------------
async function getNasaData() {
    const API_KEY = 'DEMO_KEY'; 
    const url = `https://api.nasa.gov/planetary/apod?api_key=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("NASA 로드 실패:", error);
        return null;
    }
}

async function startTransition() {
    const loadingScreen = document.getElementById('loading-screen');
    const progressFill = document.getElementById('progress-fill');
    const spaceCanvas = document.getElementById('space-canvas');
    const mapDiv = document.getElementById('map');
    const missionUi = document.getElementById('mission-ui');

    const nasaData = await getNasaData();
    spaceCanvas.style.display = 'none';
    loadingScreen.classList.remove('hidden');

    let progress = 0;
    const interval = setInterval(() => {
        progress += 2;
        progressFill.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
            loadingScreen.classList.add('hidden');
            mapDiv.style.display = 'block';
            if(missionUi) missionUi.classList.remove('hidden');
            
            google.maps.event.trigger(map, "resize");
            
            // [수정] alert(`지구 도착...`) 대신 모달 팝업 실행!
            showNasaModal(nasaData);
        }
    }, 30);
}

// 10. UI 이벤트 리스너
document.getElementById('btn-explore').addEventListener('click', () => {
    isZooming = true;
    document.getElementById('ui-container').style.opacity = '0';
});

const resetBtn = document.getElementById('btn-reset');
if(resetBtn) {
    resetBtn.addEventListener('click', resetPath);
}

// [추가] 모달 닫기 버튼 이벤트
const closeBtn = document.getElementById('close-modal');
if(closeBtn) {
    closeBtn.addEventListener('click', () => {
        document.getElementById('nasa-modal').classList.add('hidden');
    });
}

// 11. 애니메이션 루프 및 리사이즈 (동일)
function animate() {
    requestAnimationFrame(animate);
    earth.rotation.y += 0.002;
    stars.rotation.y += 0.0001;
    if (isZooming) {
        if (camera.position.z > 1.2) {
            camera.position.z -= 0.08;
        } else {
            isZooming = false;
            startTransition();
        }
    }
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();