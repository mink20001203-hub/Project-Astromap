/**
 * Project AstroMap: Phase 1 - Space View (Integrated)
 * 기능: 360도 별 가루, 텍스처 적용된 지구, 줌인 애니메이션, NASA API 연동
 */

// 1. Scene(장면), Camera(카메라), Renderer(렌더러) 초기 설정
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#space-canvas'),
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// 2. 360도 우주 배경 (별 가루) - 모든 방향에 별이 있도록 수정
const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });

const starVertices = [];
for (let i = 0; i < 15000; i++) {
    // -1000 ~ 1000 사이의 랜덤 좌표로 사방에 배치
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// 3. 지구(Earth) 생성 - 텍스처 및 조명 반응 재질 적용
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
const earthNormalMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');

const geometry = new THREE.SphereGeometry(1, 64, 64); // 구체를 더 부드럽게(64)
const material = new THREE.MeshStandardMaterial({ 
    map: earthTexture,
    normalMap: earthNormalMap 
});
const earth = new THREE.Mesh(geometry, material);
scene.add(earth);

// 4. 조명(Light) 추가 - StandardMaterial 사용 시 필수
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // 은은한 전체 조명
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffff, 1.2); // 태양 빛 (오른쪽 위에서 비춤)
sunLight.position.set(5, 3, 5);
scene.add(sunLight);

camera.position.z = 5;

// 5. 상태 관리 변수
let isZooming = false;

// 6. NASA API 연동 함수
async function getNasaData() {
    const API_KEY = 'DEMO_KEY'; // 나중에 개인 키로 교체 권장
    const url = `https://api.nasa.gov/planetary/apod?api_key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("NASA Data Received:", data);
        alert(`오늘의 우주 소식: ${data.title}\n\n워프 준비가 완료되었습니다!`);
    } catch (error) {
        console.error("NASA API 호출 중 오류:", error);
    }
}

// 7. UI 이벤트 리스너
document.getElementById('btn-explore').addEventListener('click', () => {
    isZooming = true;
    document.getElementById('ui-container').style.opacity = '0'; // UI 페이드 아웃
    document.getElementById('ui-container').style.transition = 'opacity 1s';
});

// 8. 애니메이션 루프
function animate() {
    requestAnimationFrame(animate);

    // 자전 효과
    earth.rotation.y += 0.002;
    stars.rotation.y += 0.0001;

    // 줌인 애니메이션 로직
    if (isZooming) {
        if (camera.position.z > 1.5) {
            camera.position.z -= 0.05; // 지구로 접근
        } else {
            isZooming = false;
            // 줌인이 끝나면 NASA 데이터를 가져오고 다음 단계 준비
            getNasaData();
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