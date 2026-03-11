/**
 * Project AstroMap: Phase 5 - Solar System Exploration (Moving Motion)
 * 기능: 태양계 8개 행성 나열, 클릭 시 카메라 이동 모션(로켓 탑승 효과), NASA 모달, GPS
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

// 3. 태양계 8개 행성 나열 생성 (지구 포함, 위치 수정)
const textureLoader = new THREE.TextureLoader();
const planets = []; // 모든 행성을 담을 배열

// [공통 구 geometries 생성]
const mercuryGeo = new THREE.SphereGeometry(0.4, 32, 32); // 수성
const venusGeo = new THREE.SphereGeometry(0.8, 32, 32);   // 금성
const earthGeo = new THREE.SphereGeometry(1, 64, 64);     // 지구
const marsGeo = new THREE.SphereGeometry(0.6, 32, 32);    // 화성
const jupiterGeo = new THREE.SphereGeometry(2.0, 32, 32); // 목성
const saturnGeo = new THREE.SphereGeometry(1.8, 32, 32);  // 토성
const uranusGeo = new THREE.SphereGeometry(1.5, 32, 32);  // 천왕성
const neptuneGeo = new THREE.SphereGeometry(1.5, 32, 32); // 해왕성

// [행성 재질(Texture) 로드 및 Mesh 생성]
// 1. 수성 (Mercury)
const mercuryMat = new THREE.MeshStandardMaterial({ map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/mercury.jpg') });
const mercury = new THREE.Mesh(mercuryGeo, mercuryMat);
mercury.name = '수성'; mercury.position.x = -20;
planets.push(mercury);

// 2. 금성 (Venus)
const venusMat = new THREE.MeshStandardMaterial({ map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/venus_surface.jpg') });
const venus = new THREE.Mesh(venusGeo, venusMat);
venus.name = '금성'; venus.position.x = -15;
planets.push(venus);

// 3. 지구 (Earth - 기존 지구)
const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
const earthNormalMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');
const earthMat = new THREE.MeshStandardMaterial({ map: earthTexture, normalMap: earthNormalMap });
const earth = new THREE.Mesh(earthGeo, earthMat);
earth.name = '지구'; earth.position.set(-10, 0, 0); // 위치 수정 (나열)
planets.push(earth);

// 4. 화성 (Mars)
const marsMat = new THREE.MeshStandardMaterial({ map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/mars_1k_color.jpg') });
const mars = new THREE.Mesh(marsGeo, marsMat);
mars.name = '화성'; mars.position.x = -5;
planets.push(mars);

// 5. 목성 (Jupiter)
const jupiterMat = new THREE.MeshStandardMaterial({ map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/jupiter.jpg') });
const jupiter = new THREE.Mesh(jupiterGeo, jupiterMat);
jupiter.name = '목성'; jupiter.position.x = 5;
planets.push(jupiter);

// 6. 토성 (Saturn)
const saturnMat = new THREE.MeshStandardMaterial({ map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/saturn.png') });
const saturn = new THREE.Mesh(saturnGeo, saturnMat);
saturn.name = '토성'; saturn.position.x = 15;
planets.push(saturn);

// 7. 천왕성 (Uranus)
const uranusMat = new THREE.MeshStandardMaterial({ map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/uranus.png') });
const uranus = new THREE.Mesh(uranusGeo, uranusMat);
uranus.name = '천왕성'; uranus.position.x = 25;
planets.push(uranus);

// 8. 해왕성 (Neptune)
const neptuneMat = new THREE.MeshStandardMaterial({ map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/neptune.png') });
const neptune = new THREE.Mesh(neptuneGeo, neptuneMat);
neptune.name = '해왕성'; neptune.position.x = 35;
planets.push(neptune);

// 모든 행성을 scene에 추가
planets.forEach(p => scene.add(p));

// 4. 조명 설정 수정 (행성들이 보이게 밝게)
// 주변광 추가 (모든 방향에서 빛을 줌)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); 
scene.add(ambientLight);

// 태양광처럼 특정 방향에서 비추는 DirectionalLight 추가 (정면 상단에서)
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2); 
sunLight.position.set(5, 5, 5).normalize(); 
scene.add(sunLight);

// 카메라 초기 위치 수정 (모든 행성이 나란히 보이게 더 멀리 배치)
camera.position.z = 30; // 30으로 멀리 배치

// -----------------------------------------------------------------
// 5. 상태 관리 및 인터랙션 관련 변수 수정
// -----------------------------------------------------------------
let isTraveling = false; // [수정] 줌인 대신 '이동 중' 상태
let travelTarget = new THREE.Vector3(); // [추가] 이동 목표 좌표
let targetPlanetName = ""; // [추가] 목표 행성 이름
let map;
let runningPath;
let markers = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 6. 구글 맵 초기화 함수 (Geolocation 포함 - 동일)
function initMap() {
    const defaultLocation = { lat: 37.5665, lng: 126.9780 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 18, center: defaultLocation, mapTypeId: 'satellite', tilt: 45
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                map.setCenter(pos);
            },
            () => console.warn("위치 정보 접근 거부")
        );
    }
    runningPath = new google.maps.Polyline({ strokeColor: "#FF0000", strokeOpacity: 1.0, strokeWeight: 3, map: map });
    map.addListener("click", (event) => addLatLngToPath(event.latLng));
    loadPath(); 
}

// 7. 경로 관리 및 로그 저장 (동일)
function addLatLngToPath(latLng, shouldSave = true) {
    const path = runningPath.getPath();
    path.push(latLng);
    const marker = new google.maps.Marker({
        position: latLng, map: map,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 4, fillColor: "#FF0000", fillOpacity: 1, strokeWeight: 0 }
    });
    markers.push(marker);
    updateDistance();
    if (shouldSave) savePath();
}

function updateDistance() {
    const path = runningPath.getPath();
    const distanceMeters = google.maps.geometry.spherical.computeLength(path);
    const distanceKm = (distanceMeters / 1000).toFixed(2);
    document.getElementById('distance-value').innerText = distanceKm;
}

function resetPath() {
    runningPath.getPath().clear();
    markers.forEach(m => m.setMap(null));
    markers = [];
    document.getElementById('distance-value').innerText = "0";
    localStorage.removeItem('astroPath');
}

function savePathLog() {
    const path = runningPath.getPath();
    if (path.getLength() < 2) return alert("경로가 너무 짧습니다!");
    const coords = [];
    path.forEach(latLng => coords.push({ lat: latLng.lat(), lng: latLng.lng() }));
    const newLog = {
        id: Date.now(), date: new Date().toLocaleString(),
        distance: document.getElementById('distance-value').innerText, path: coords
    };
    const savedLogs = JSON.parse(localStorage.getItem('pathLogs') || "[]");
    savedLogs.unshift(newLog);
    localStorage.setItem('pathLogs', JSON.stringify(savedLogs.slice(0, 5)));
    alert("기록 저장 완료!");
    renderPathList();
}

function renderPathList() {
    const listEl = document.getElementById('path-list');
    if (!listEl) return;
    const savedLogs = JSON.parse(localStorage.getItem('pathLogs') || "[]");
    listEl.innerHTML = ""; 
    savedLogs.forEach(log => {
        const li = document.createElement('li');
        li.style.cssText = "margin-bottom: 8px; cursor: pointer; border-bottom: 1px solid rgba(0, 255, 255, 0.2); padding-bottom: 4px; color: #00ffff;";
        li.innerHTML = `<strong>${log.date}</strong><br><span style="font-size: 11px; color: #aaa;">거리: ${log.distance}km</span>`;
        li.onclick = () => loadSpecificPath(log.path);
        listEl.appendChild(li);
    });
}

function loadSpecificPath(coords) {
    resetPath();
    coords.forEach(pos => addLatLngToPath(new google.maps.LatLng(pos.lat, pos.lng), false));
    if (coords.length > 0) map.setCenter(coords[0]);
}

// 8. 로컬 스토리지 단일 세션 (동일)
function savePath() {
    const path = runningPath.getPath();
    const coords = [];
    path.forEach(latLng => coords.push({ lat: latLng.lat(), lng: latLng.lng() }));
    localStorage.setItem('astroPath', JSON.stringify(coords));
}

function loadPath() {
    const savedData = localStorage.getItem('astroPath');
    if (savedData) {
        JSON.parse(savedData).forEach(pos => addLatLngToPath(new google.maps.LatLng(pos.lat, pos.lng), false));
    }
}

// 9. NASA 모달 및 전환 로직 수정
function showNasaModal(data) {
    // 데이터 에러 예외 처리 추가 (undefined 방지)
    if (!data || data.error || !data.title) {
        document.getElementById('nasa-title').innerText = "통신 오류";
        document.getElementById('nasa-description').innerText = "NASA API 호출 한도가 초과되었거나 데이터를 불러올 수 없습니다.";
        document.getElementById('nasa-modal').classList.remove('hidden');
        return;
    }
    document.getElementById('nasa-title').innerText = data.title;
    document.getElementById('nasa-image').src = data.url;
    document.getElementById('nasa-description').innerText = data.explanation;
    document.getElementById('nasa-modal').classList.remove('hidden');
}

// [추가] NASA API 키 입력 유도
async function getNasaData() {
    // DEMO_KEY는 사용량 제한이 있습니다. 실제 사용 시 YOUR_API_KEY를 넣어주세요.
    const url = `https://api.nasa.gov/planetary/apod?api_key=YOUR_API_KEY`; 
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

    // 지구 탐사 완료 시에만 모달과 지도 표시
    if (targetPlanetName === '지구') {
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
                renderPathList();
            }
        }, 30);
    } else {
        // 다른 행성 탐사 시 알림창 표시
        alert(`${targetPlanetName} 탐사를 마쳤습니다. 현재는 탐사 정보 준비 중입니다! 🚀`);
        // 카메라 위치 초기화 (우주 화면으로 다시 돌아감)
        camera.position.set(0, 0, 30);
        camera.lookAt(0, 0, 0);
        document.getElementById('ui-container').style.opacity = '1'; // UI 다시 표시
    }
}

// -----------------------------------------------------------------
// 10. UI 및 클릭 인터랙션 리스너 수정 (로켓 이동 모션 구현)
// -----------------------------------------------------------------

// [수정] 캔버스 클릭 시에만 광선을 투사하도록 변경 (이벤트 버블링 방지)
renderer.domElement.addEventListener('click', (event) => {
    // 모달창이 열려있을 때는 클릭 무시
    if (!document.getElementById('nasa-modal').classList.contains('hidden')) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    // 모든 행성을 대상으로 클릭 감지
    const intersects = raycaster.intersectObjects(planets);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        console.log("클릭한 행성:", clickedObject.name);

        // 목표 행성 위치로 이동 모션 시작
        targetPlanetName = clickedObject.name;
        travelTarget.copy(clickedObject.position);
        
        // 카메라가 행성 안으로 들어가지 않게 위치 조정
        // 행성 반지름만큼 Z축으로 약간 떨어진 곳으로 이동
        travelTarget.z += clickedObject.geometry.parameters.radius + 1.2; 
        
        isTraveling = true; // 이동 시작
        document.getElementById('ui-container').style.opacity = '0'; // UI 숨김
    }
});

// 기존 지구로 접근하기 버튼 클릭 리스너 (동일하게 이동 모션 실행)
document.getElementById('btn-explore').addEventListener('click', () => {
    if (isTraveling) return; // 중복 실행 방지
    // 지구 위치로 이동 설정
    targetPlanetName = '지구';
    travelTarget.copy(earth.position);
    travelTarget.z += earthGeo.parameters.radius + 1.2; 
    
    isTraveling = true;
    document.getElementById('ui-container').style.opacity = '0';
});

document.getElementById('btn-reset').addEventListener('click', resetPath);
document.getElementById('btn-save-log').addEventListener('click', savePathLog);
document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('nasa-modal').classList.add('hidden');
});

// -----------------------------------------------------------------
// 11. 애니메이션 루프 수정 (로켓 이동 모션 LERP 구현)
// -----------------------------------------------------------------
function animate() {
    requestAnimationFrame(animate);
    
    // 모든 행성 자전 효과 추가
    planets.forEach(p => p.rotation.y += 0.002);
    stars.rotation.y += 0.0001;

    // [수정] 로켓 이동 모션 (LERP: Linear Interpolation)
    if (isTraveling) {
        // LERP를 이용해 부드럽게 카메라를 목표 위치로 이동
        const speed = 0.05; // 부드러움 정도 (낮을수록 부드럽고 느림)
        camera.position.lerp(travelTarget, speed);
        
        // 카메라도 이동 목표를 바라보게 설정
        camera.lookAt(travelTarget.x, travelTarget.y, travelTarget.z - travelTarget.z/2); 

        // 목표 위치에 도착했는지 확인 (거리가 가까워지면 도착으로 간주)
        const distance = camera.position.distanceTo(travelTarget);
        if (distance < 0.1) {
            isTraveling = false; // 이동 완료
            console.log("목표 행성 도착!");
            startTransition(); // 전환 로직 실행
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