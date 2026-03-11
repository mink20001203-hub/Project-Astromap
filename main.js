/**
 * Project AstroMap: Phase 4 - Geolocation & Path Logging
 * 기능: 실시간 위치 추적, 다중 경로 저장 및 불러오기, NASA 모달 통합
 */

// 1. Scene, Camera, Renderer 설정
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#space-canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// 2. 우주 배경 (별 가루)
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

// 3. 지구(Earth) 생성
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
const earthNormalMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');
const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshStandardMaterial({ map: earthTexture, normalMap: earthNormalMap });
const earth = new THREE.Mesh(geometry, material);
scene.add(earth);

// 4. 조명 설정
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const sunLight = new THREE.PointLight(0xffffff, 1.2);
sunLight.position.set(5, 3, 5);
scene.add(sunLight);
camera.position.z = 5;

// -----------------------------------------------------------------
// 5. 상태 관리 및 지도 관련 변수
// -----------------------------------------------------------------
let isZooming = false;
let map;
let runningPath;
let markers = [];
let isPathLoading = false; 

// 6. 구글 맵 초기화 함수 (Geolocation 포함)
function initMap() {
    const defaultLocation = { lat: 37.5665, lng: 126.9780 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 18,
        center: defaultLocation,
        mapTypeId: 'satellite',
        tilt: 45
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.setCenter(pos);
                console.log("현재 위치 확인 완료:", pos);
            },
            () => {
                console.warn("위치 정보 접근이 거부되었습니다.");
            }
        );
    }

    runningPath = new google.maps.Polyline({
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map
    });

    map.addListener("click", (event) => {
        addLatLngToPath(event.latLng);
    });

    loadPath(); // 마지막 세션 복구
}

// 7. 경로 관리 및 로그 저장 함수
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

    if (shouldSave) {
        savePath();
    }
}

function updateDistance() {
    const path = runningPath.getPath();
    const distanceMeters = google.maps.geometry.spherical.computeLength(path);
    const distanceKm = (distanceMeters / 1000).toFixed(2);
    const distanceDisplay = document.getElementById('distance-value');
    if (distanceDisplay) distanceDisplay.innerText = distanceKm;
}

function resetPath() {
    if (!runningPath) return;
    runningPath.getPath().clear();
    markers.forEach(m => m.setMap(null));
    markers = [];
    const distanceDisplay = document.getElementById('distance-value');
    if (distanceDisplay) distanceDisplay.innerText = "0";

    localStorage.removeItem('astroPath');
}

// [추가] 현재 경로를 별도의 로그로 저장
function savePathLog() {
    const path = runningPath.getPath();
    if (path.getLength() < 2) {
        alert("저장할 경로가 너무 짧습니다! 지도를 클릭해 선을 그려주세요.");
        return;
    }

    const coords = [];
    path.forEach(latLng => {
        coords.push({ lat: latLng.lat(), lng: latLng.lng() });
    });

    const newLog = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        distance: document.getElementById('distance-value').innerText,
        path: coords
    };

    const savedLogs = JSON.parse(localStorage.getItem('pathLogs') || "[]");
    savedLogs.unshift(newLog); // 최신이 맨 위로
    localStorage.setItem('pathLogs', JSON.stringify(savedLogs.slice(0, 5))); // 5개 유지

    alert("기록이 저장되었습니다!");
    renderPathList();
}

// [추가] 저장된 로그 목록 렌더링
function renderPathList() {
    const listEl = document.getElementById('path-list');
    if (!listEl) return;

    const savedLogs = JSON.parse(localStorage.getItem('pathLogs') || "[]");
    listEl.innerHTML = ""; 

    savedLogs.forEach(log => {
        const li = document.createElement('li');
        li.style.cssText = "margin-bottom: 8px; cursor: pointer; border-bottom: 1px solid rgba(0, 255, 255, 0.2); padding-bottom: 4px; color: #00ffff;";
        
        li.innerHTML = `
            <strong>${log.date}</strong><br>
            <span style="font-size: 11px; color: #aaa;">거리: ${log.distance}km</span>
        `;
        
        li.onclick = () => loadSpecificPath(log.path);
        listEl.appendChild(li);
    });
}

// [추가] 선택한 로그 불러오기
function loadSpecificPath(coords) {
    resetPath();
    coords.forEach(pos => {
        addLatLngToPath(new google.maps.LatLng(pos.lat, pos.lng), false);
    });
    if (coords.length > 0) map.setCenter(coords[0]);
}

// 8. 로컬 스토리지 단일 세션 저장/불러오기
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
        const coords = JSON.parse(savedData);
        coords.forEach(pos => {
            addLatLngToPath(new google.maps.LatLng(pos.lat, pos.lng), false);
        });
    }
}

// 9. NASA 모달 및 전환 로직
function showNasaModal(data) {
    if (!data) return;
    document.getElementById('nasa-title').innerText = data.title;
    document.getElementById('nasa-image').src = data.url;
    document.getElementById('nasa-description').innerText = data.explanation;
    document.getElementById('nasa-modal').classList.remove('hidden');
}

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
            if (missionUi) missionUi.classList.remove('hidden');
            google.maps.event.trigger(map, "resize");
            showNasaModal(nasaData);
            renderPathList(); // 지도로 진입할 때 리스트 갱신
        }
    }, 30);
}

// 10. UI 이벤트 리스너
document.getElementById('btn-explore').addEventListener('click', () => {
    isZooming = true;
    document.getElementById('ui-container').style.opacity = '0';
});

const resetBtn = document.getElementById('btn-reset');
if (resetBtn) resetBtn.addEventListener('click', resetPath);

// [추가] 경로 저장 버튼 리스너
const saveLogBtn = document.getElementById('btn-save-log');
if (saveLogBtn) saveLogBtn.addEventListener('click', savePathLog);

const closeBtn = document.getElementById('close-modal');
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        document.getElementById('nasa-modal').classList.add('hidden');
    });
}

// 11. 애니메이션 루프
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