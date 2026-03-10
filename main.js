/**
 * Project AstroMap: Phase 2 - Ground Mission
 * 기능: 우주-지상 전환, 구글 맵 드로잉, 실시간 거리 계산 및 초기화
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

// 2. 360도 우주 배경 (별 가루)
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
const material = new THREE.MeshStandardMaterial({ 
    map: earthTexture,
    normalMap: earthNormalMap 
});
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
let runningPath; // 선(Polyline) 객체
let markers = []; // 마커들을 관리할 배열

// 6. 구글 맵 초기화 함수
function initMap() {
    const initialLocation = { lat: 37.5665, lng: 126.9780 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 18,
        center: initialLocation,
        mapTypeId: 'satellite',
        tilt: 45
    });

    // 경로 선 생성
    runningPath = new google.maps.Polyline({
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map
    });

    // 지도 클릭 시 좌표 추가 이벤트
    map.addListener("click", (event) => {
        addLatLngToPath(event.latLng);
    });
}

// 7. 경로 관리 함수들
function addLatLngToPath(latLng) {
    const path = runningPath.getPath();
    path.push(latLng);

    // 마커 생성 및 저장
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

    // 거리 갱신
    updateDistance();
}

function updateDistance() {
    const path = runningPath.getPath();
    // Google Maps Geometry 라이브러리 사용 (m 단위)
    const distanceMeters = google.maps.geometry.spherical.computeLength(path);
    const distanceKm = (distanceMeters / 1000).toFixed(2);
    
    const distanceDisplay = document.getElementById('distance-value');
    if(distanceDisplay) distanceDisplay.innerText = distanceKm;
}

function resetPath() {
    if(!runningPath) return;
    
    // 선 지우기
    runningPath.getPath().clear();
    
    // 모든 마커 지우기
    markers.forEach(m => m.setMap(null));
    markers = [];
    
    // 거리 0으로 초기화
    const distanceDisplay = document.getElementById('distance-value');
    if(distanceDisplay) distanceDisplay.innerText = "0";
}

// -----------------------------------------------------------------
// 8. 데이터 및 전환 로직
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
    const missionUi = document.getElementById('mission-ui'); // 거리 UI

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
            if(missionUi) missionUi.classList.remove('hidden'); // 미션 UI 표시
            
            google.maps.event.trigger(map, "resize");
            alert(`지구 도착! 오늘의 우주 소식: ${nasaData ? nasaData.title : '연결 원활'}`);
        }
    }, 30);
}

// 9. UI 이벤트 리스너
document.getElementById('btn-explore').addEventListener('click', () => {
    isZooming = true;
    document.getElementById('ui-container').style.opacity = '0';
});

// 초기화 버튼 리스너
const resetBtn = document.getElementById('btn-reset');
if(resetBtn) {
    resetBtn.addEventListener('click', resetPath);
}

// 10. 애니메이션 루프
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