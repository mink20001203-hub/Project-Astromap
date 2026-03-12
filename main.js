/**
 * Project AstroMap: Integrated Version
 * [수정 사항] 
 * 1. google 객체 미로드 시 재시도 로직 추가 (ReferenceError 방지)
 * 2. 모든 변수 선언(const/let)의 중복 제거 (ts2451 방지)
 * 3. NASA API 한도 초과 시 예외 처리 강화
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
    starVertices.push((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// 3. 행성 생성 시스템 (이미지 로드 실패 대비 강화)
const textureLoader = new THREE.TextureLoader();
const planets = [];

function createPlanet(name, radius, x, textureUrl, color) {
    const geo = new THREE.SphereGeometry(radius, 32, 32);

    // [수정] 이미지가 없어도 '색상'은 반드시 보이도록 설정
    const mat = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: false // 실체감을 위해 와이어프레임 끔
    });

    // 이미지 로드 시도 (실패해도 에러로 멈추지 않게 처리)
    textureLoader.load(
        textureUrl,
        (texture) => { mat.map = texture; mat.needsUpdate = true; },
        undefined,
        () => { console.warn(`${name} 이미지를 불러오지 못해 색상으로 대체합니다.`); }
    );

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.position.x = x;
    scene.add(mesh);
    planets.push(mesh);
    return mesh;
}

// 행성 배치 (변수 중복 선언을 피하기 위해 'const'는 필요한 경우에만 한 번 사용)
const textureBase = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/';

createPlanet('수성', 0.4, -20, `${textureBase}mercury.jpg`, 0xaaaaaa);
createPlanet('금성', 0.8, -15, `${textureBase}venus_surface.jpg`, 0xffcc33);
const earth = createPlanet('지구', 1, -10, `${textureBase}earth_atmos_2048.jpg`, 0x2233ff);
createPlanet('화성', 0.6, -5, `${textureBase}mars_1k_color.jpg`, 0xff4500);
createPlanet('목성', 2.0, 5, `${textureBase}jupiter.jpg`, 0xffaa33);
createPlanet('토성', 1.8, 15, `${textureBase}saturn.png`, 0xead6b8); // 토성은 별도 처리가 필요할 수 있음
createPlanet('천왕성', 1.5, 25, `${textureBase}uranus.png`, 0x66ccff);
createPlanet('해왕성', 1.5, 35, `${textureBase}neptune.png`, 0x3366ff);

camera.position.z = 35;

// 4. 상태 관리 및 지도 변수 (중복 선언 방지를 위해 상단에 한 번만 선언)
let isTraveling = false;
let travelTarget = new THREE.Vector3();
let targetPlanetName = "";
let map;
let runningPath;
let markers = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 5. 구글 맵 초기화 (안전장치 추가)
function initMap() {
    if (typeof google === 'undefined') {
        setTimeout(initMap, 100);
        return;
    }

    // 기본 위치 (접속 실패 시 보일 좌표: 대전 시청 기준)
    const defaultLocation = { lat: 36.3504, lng: 127.3845 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 18,
        center: defaultLocation,
        mapTypeId: 'satellite',
        tilt: 45
    });

    // [핵심] 브라우저의 Geolocation API를 사용하여 현재 위치 가져오기
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.setCenter(pos); // 지도의 중심을 내 위치로 변경

                // 내 위치에 마커 하나 찍어주기 (선택사항)
                new google.maps.Marker({
                    position: pos,
                    map: map,
                    title: "현재 위치"
                });
            },
            () => {
                console.warn("위치 정보 권한이 거부되었습니다. 기본 위치를 사용합니다.");
            }
        );
    }

    runningPath = new google.maps.Polyline({
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        weight: 3,
        map: map
    });

    map.addListener("click", (event) => addLatLngToPath(event.latLng));
    loadPath();
}

// 6. 경로 및 로그 관리
function addLatLngToPath(latLng, shouldSave = true) {
    if (!runningPath) return;
    const path = runningPath.getPath();
    path.push(latLng);
    const marker = new google.maps.Marker({
        position: latLng, map: map,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 4, fillColor: "#FF0000", fillOpacity: 1, strokeWeight: 0 }
    });
    markers.push(marker);

    // 거리 계산 안전장치
    if (google.maps.geometry && google.maps.geometry.spherical) {
        const distanceMeters = google.maps.geometry.spherical.computeLength(path);
        document.getElementById('distance-value').innerText = (distanceMeters / 1000).toFixed(2);
    }

    if (shouldSave) savePath();
}

function renderPathList() {
    const listEl = document.getElementById('path-list');
    if (!listEl) return;
    const savedLogs = JSON.parse(localStorage.getItem('pathLogs') || "[]");
    listEl.innerHTML = "";

    savedLogs.forEach(log => {
        const li = document.createElement('li');
        li.style.cssText = "margin-bottom: 8px; border-bottom: 1px solid rgba(0, 255, 255, 0.2); padding: 5px 0; color: #00ffff; display: flex; justify-content: space-between; align-items: center;";
        li.innerHTML = `<span><strong>${log.date}</strong><br><small>${log.distance}km</small></span>`;

        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = "X";
        deleteBtn.style.cssText = "background:none; border:1px solid #FF0000; color:#FF0000; cursor:pointer; padding:2px 5px;";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deletePathLog(log.id);
        };
        li.appendChild(deleteBtn);
        listEl.appendChild(li);
    });
}

function deletePathLog(logId) {
    if (!confirm("삭제하시겠습니까?")) return;
    let savedLogs = JSON.parse(localStorage.getItem('pathLogs') || "[]");
    localStorage.setItem('pathLogs', JSON.stringify(savedLogs.filter(l => l.id !== logId)));
    renderPathList();
}

function savePath() {
    if (!runningPath) return;
    const coords = [];
    runningPath.getPath().forEach(latLng => coords.push({ lat: latLng.lat(), lng: latLng.lng() }));
    localStorage.setItem('astroPath', JSON.stringify(coords));
}

function loadPath() {
    const savedData = localStorage.getItem('astroPath');
    if (savedData && runningPath) {
        JSON.parse(savedData).forEach(pos => addLatLngToPath(new google.maps.LatLng(pos.lat, pos.lng), false));
    }
}

// 7. NASA API 및 애니메이션
async function getNasaData(planetName) {
    const apiKey = 'hMRziP3MCA9KqSykeMF0HEEYDr4e2PRZx8TQCyyV';
    let url = (planetName === '화성')
        ? `https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=1000&api_key=${apiKey}`
        : `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (planetName === '화성') {
            const randomPhoto = data.photos[Math.floor(Math.random() * data.photos.length)];
            return { title: "Mars Rover Search", url: randomPhoto.img_src, explanation: "화성 탐사선 사진" };
        }
        return data;
    } catch (e) { return null; }
}

function startTransition() {
    const canvas = document.getElementById('space-canvas');
    const loading = document.getElementById('loading-screen');
    const mapDiv = document.getElementById('map');
    const missionUI = document.getElementById('mission-ui');

    if (targetPlanetName === '지구') {
        canvas.style.display = 'none';
        loading.classList.remove('hidden');
        setTimeout(() => {
            loading.classList.add('hidden');
            mapDiv.style.display = 'block';
            missionUI.classList.remove('hidden');
            google.maps.event.trigger(map, "resize");
        }, 1000);
    } else {
        alert(`${targetPlanetName} 탐사 준비 중!`);
        camera.position.set(0, 0, 35);
        document.getElementById('ui-container').style.opacity = '1';
    }
}

function animate() {
    requestAnimationFrame(animate);
    planets.forEach(p => p.rotation.y += 0.002);
    stars.rotation.y += 0.0001;

    if (isTraveling) {
        camera.position.lerp(travelTarget, 0.05);
        camera.lookAt(travelTarget.x, travelTarget.y, travelTarget.z - 1);
        if (camera.position.distanceTo(travelTarget) < 0.1) {
            isTraveling = false;
            startTransition();
        }
    }
    renderer.render(scene, camera);
}

// 초기 실행
initMap();
animate();

// 이벤트 리스너
renderer.domElement.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        targetPlanetName = obj.name;
        travelTarget.copy(obj.position);
        travelTarget.z += 2;
        isTraveling = true;
        document.getElementById('ui-container').style.opacity = '0';
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});