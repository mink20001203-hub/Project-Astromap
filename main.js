/**
 * Project AstroMap: Phase 2 - Space to Ground Transition
 * 기능: 3D 우주 뷰, NASA API 연동, 로딩 시퀀스, 구글 맵 위성 뷰 전환
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

// 5. 상태 관리 변수
let isZooming = false;
let map; // 구글 맵 객체

// 6. 구글 맵 초기화 함수 (지도는 처음에 숨겨져 있음)
function initMap() {
    const initialLocation = { lat: 37.5665, lng: 126.9780 }; // 기본값: 서울
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 18,
        center: initialLocation,
        mapTypeId: 'satellite',
        tilt: 45
    });
    console.log("구글 맵 준비 완료");
    // 1. 경로를 담을 빈 선(Polyline) 객체를 먼저 생성합니다.
    const runningPath = new google.maps.Polyline({
        strokeColor: "#FF0000", // 선 색상 (빨간색)
        strokeOpacity: 1.0,     // 투명도
        strokeWeight: 3,        // 선 굵기
        map: map                // 선을 표시할 지도 객체
    });

    // 2. 지도 클릭 이벤트 리스너 등록
    map.addListener("click", (event) => {
        // event.latLng에 클릭한 지점의 좌표가 담겨 있습니다.
        addLatLngToPath(event.latLng, runningPath);
    });

    // 3. 좌표를 경로에 추가하는 함수
    function addLatLngToPath(latLng, polyline) {
        // getPath()는 현재 선이 가진 좌표 배열(MVCArray)을 가져옵니다.
        const path = polyline.getPath();

        // push를 통해 새로운 좌표를 추가하면 지도에 즉시 선이 그려집니다.
        path.push(latLng);

        // 선택 사항: 클릭한 지점에 작은 마커를 남기고 싶다면 추가
        new google.maps.Marker({
            position: latLng,
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 3
            }
        });
    }
}

    // 7. NASA API 연동 함수
    async function getNasaData() {
        const API_KEY = 'DEMO_KEY';
        const url = `https://api.nasa.gov/planetary/apod?api_key=${API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            console.log("NASA 데이터 수신:", data.title);
            // 전환 전 알림 (실제 앱에서는 UI에 표시하는 것이 좋음)
            return data;
        } catch (error) {
            console.error("NASA 데이터 로드 실패:", error);
            return null;
        }
    }

    // 8. 차원 이동(Transition) 시퀀스
    async function startTransition() {
        const loadingScreen = document.getElementById('loading-screen');
        const progressFill = document.getElementById('progress-fill');
        const spaceCanvas = document.getElementById('space-canvas');
        const mapDiv = document.getElementById('map');

        // NASA 데이터 로드 대기
        const nasaData = await getNasaData();

        // 우주 화면 페이드 아웃 및 로딩 화면 표시
        spaceCanvas.style.display = 'none';
        loadingScreen.classList.remove('hidden');

        // 게이지 채우기 시뮬레이션
        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            progressFill.style.width = progress + '%';

            if (progress >= 100) {
                clearInterval(interval);
                // 지도 화면으로 전환
                loadingScreen.classList.add('hidden');
                mapDiv.style.display = 'block';

                // 지도 강제 리사이즈 (숨겨져 있다가 나타날 때 레이아웃 깨짐 방지)
                google.maps.event.trigger(map, "resize");
                alert(`지구 도착! 오늘의 우주 소식: ${nasaData ? nasaData.title : '연결 원활'}`);
            }
        }, 20); // 약 2초 동안 진행
    }

    // 9. UI 이벤트 리스너
    document.getElementById('btn-explore').addEventListener('click', () => {
        isZooming = true;
        const ui = document.getElementById('ui-container');
        ui.style.opacity = '0';
        ui.style.transition = 'opacity 1s';
    });

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
                startTransition(); // 줌인이 끝나면 전환 시작
            }
        }

        renderer.render(scene, camera);
    }

    // 창 크기 조절 대응
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();