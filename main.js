// Project AstroMap: Integrated Version

// 1. Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#space-canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// 2. Star field
const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
const starVertices = [];
for (let i = 0; i < 15000; i++) {
    starVertices.push((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// 3. Planets (procedural textures, no external assets)
const planets = [];
const planetPreview = {};
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(5, 5, 5);
scene.add(ambientLight, directionalLight);

function hexToRgb(hex) {
    const n = Number(hex);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function makeCanvasTexture(drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

function rockyTexture(baseHex, accentHex) {
    return makeCanvasTexture((ctx, w, h) => {
        const base = hexToRgb(baseHex);
        const accent = hexToRgb(accentHex);
        ctx.fillStyle = `rgb(${base.r},${base.g},${base.b})`;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 140; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = Math.random() * 6 + 1;
            ctx.fillStyle = `rgba(${accent.r},${accent.g},${accent.b},0.6)`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function bandedTexture(colors) {
    return makeCanvasTexture((ctx, w, h) => {
        const bandHeight = h / colors.length;
        colors.forEach((hex, i) => {
            const c = hexToRgb(hex);
            ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
            ctx.fillRect(0, i * bandHeight, w, bandHeight);
        });
        for (let i = 0; i < 40; i++) {
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, Math.random() * h, w, Math.random() * 2 + 1);
        }
        ctx.globalAlpha = 1;
    });
}

function earthTexture() {
    return makeCanvasTexture((ctx, w, h) => {
        ctx.fillStyle = '#1d4e89';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2e8b57';
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.ellipse(Math.random() * w, Math.random() * h, 18 + Math.random() * 20, 8 + Math.random() * 16, Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.ellipse(Math.random() * w, Math.random() * h, 22 + Math.random() * 20, 6 + Math.random() * 10, Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function createPlanet(name, radius, x, texture, color) {
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color, map: texture, roughness: 0.9, metalness: 0.0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.position.x = x;
    scene.add(mesh);
    planets.push(mesh);
    if (texture && texture.image && texture.image.toDataURL) {
        planetPreview[name] = texture.image.toDataURL();
    }
    return mesh;
}

createPlanet('수성', 0.4, -20, rockyTexture(0x8f8f8f, 0x6f6f6f), 0xaaaaaa);
createPlanet('금성', 0.8, -15, rockyTexture(0xd8b36a, 0xb69045), 0xffcc33);
const earth = createPlanet('지구', 1, -10, earthTexture(), 0x2233ff);
createPlanet('화성', 0.6, -5, rockyTexture(0xb5522c, 0x7a2d12), 0xff4500);
createPlanet('목성', 2.0, 5, bandedTexture([0xe3c49b, 0xd4a978, 0xc9925a, 0xb57a4b, 0xd8b38b]), 0xffaa33);
createPlanet('토성', 1.8, 15, bandedTexture([0xf2e1c5, 0xe7d0a8, 0xd9bf94, 0xcdb38a]), 0xead6b8);
createPlanet('천왕성', 1.5, 25, bandedTexture([0x9bd3e0, 0x7fc2d3, 0x6ab1c6]), 0x66ccff);
createPlanet('해왕성', 1.5, 35, bandedTexture([0x3a6ea5, 0x2f5d9a, 0x244b8e]), 0x3366ff);

camera.position.z = 35;

// 4. State
let isTraveling = false;
let travelTarget = new THREE.Vector3();
let targetPlanetName = "";
let map;
let runningPath;
let markers = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function createMapMarker(position, title, isDot = false) {
    if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        const content = document.createElement('div');
        if (isDot) {
            content.style.width = '8px';
            content.style.height = '8px';
            content.style.borderRadius = '50%';
            content.style.background = '#ff0000';
            content.style.boxShadow = '0 0 4px rgba(255,0,0,0.8)';
        } else {
            content.style.padding = '4px 6px';
            content.style.background = 'rgba(0,0,0,0.6)';
            content.style.color = '#fff';
            content.style.border = '1px solid #00ffff';
            content.style.borderRadius = '4px';
            content.style.fontSize = '11px';
            content.textContent = title || '';
        }
        return new google.maps.marker.AdvancedMarkerElement({ position, map, title, content });
    }

    const options = { position, map, title };
    if (isDot) {
        options.icon = { path: google.maps.SymbolPath.CIRCLE, scale: 4, fillColor: "#FF0000", fillOpacity: 1, strokeWeight: 0 };
    }
    return new google.maps.Marker(options);
}

function removeMapMarker(marker) {
    if (!marker) return;
    if (typeof marker.setMap === 'function') marker.setMap(null);
    else marker.map = null;
}

// 5. Map
function initMap() {
    if (typeof google === 'undefined') {
        setTimeout(initMap, 100);
        return;
    }

    const defaultLocation = { lat: 36.3504, lng: 127.3845 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 18,
        center: defaultLocation,
        mapTypeId: 'satellite',
        tilt: 45,
        mapId: "DEMO_MAP_ID"
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                map.setCenter(pos);
                createMapMarker(pos, "현재 위치", false);
            },
            () => { console.warn("위치 권한이 거부되어 기본 위치를 사용합니다."); }
        );
    }

    runningPath = new google.maps.Polyline({
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        weight: 3,
        map
    });

    map.addListener("click", (event) => addLatLngToPath(event.latLng));
    loadPath();
    renderPathList();
}

// 6. Path + Logs
function addLatLngToPath(latLng, shouldSave = true) {
    if (!runningPath) return;
    const path = runningPath.getPath();
    path.push(latLng);
    const marker = createMapMarker(latLng, "", true);
    markers.push(marker);

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
        li.style.cursor = "pointer";
        li.onclick = () => applyPathLog(log);

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

function applyPathLog(log) {
    if (!runningPath) return;
    if (!log.coords || log.coords.length === 0) return;
    resetPath();
    log.coords.forEach(pos => addLatLngToPath(new google.maps.LatLng(pos.lat, pos.lng), false));
    savePath();
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

function resetPath() {
    if (!runningPath) return;
    runningPath.setPath([]);
    markers.forEach(m => removeMapMarker(m));
    markers = [];
    localStorage.removeItem('astroPath');
    document.getElementById('distance-value').innerText = "0";
}

function savePathLog() {
    if (!runningPath) return;
    const distance = document.getElementById('distance-value').innerText || "0";
    const coords = [];
    runningPath.getPath().forEach(latLng => coords.push({ lat: latLng.lat(), lng: latLng.lng() }));
    const newLog = {
        id: Date.now(),
        date: new Date().toLocaleString('ko-KR'),
        distance,
        coords
    };
    let savedLogs = JSON.parse(localStorage.getItem('pathLogs') || "[]");
    savedLogs.unshift(newLog);
    savedLogs = savedLogs.slice(0, 3);
    localStorage.setItem('pathLogs', JSON.stringify(savedLogs));
    renderPathList();
}

// 7. NASA modal (local fallback to avoid API errors)
const USE_NASA_API = false;
const NASA_API_KEY = 'DEMO_KEY';

const localPlanetInfo = {
    "수성": { title: "수성", description: "태양과 가장 가까운 행성. 표면은 크레이터가 많고 대기가 거의 없습니다." },
    "금성": { title: "금성", description: "두꺼운 대기와 강한 온실효과로 매우 뜨거운 행성입니다." },
    "지구": { title: "지구", description: "액체 물과 생명체가 존재하는 현재 유일한 행성입니다." },
    "화성": { title: "화성", description: "붉은 토양으로 유명하며 과거 물이 있었던 흔적이 있습니다." },
    "목성": { title: "목성", description: "태양계에서 가장 큰 가스 행성으로 거대한 대적점이 있습니다." },
    "토성": { title: "토성", description: "아름다운 고리가 특징인 가스 행성입니다." },
    "천왕성": { title: "천왕성", description: "자전축이 크게 기울어진 차가운 얼음 거인입니다." },
    "해왕성": { title: "해왕성", description: "강한 바람이 부는 푸른빛의 얼음 거인입니다." }
};

async function getNasaData(planetName) {
    if (!USE_NASA_API) return null;
    const url = (planetName === '화성')
        ? `https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=1000&api_key=${NASA_API_KEY}`
        : `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (planetName === '화성') {
            const randomPhoto = data.photos[Math.floor(Math.random() * data.photos.length)];
            return { title: "Mars Rover Search", url: randomPhoto.img_src, explanation: "화성 탐사 사진" };
        }
        return data;
    } catch (e) {
        return null;
    }
}

function hideNasaModal() {
    const modal = document.getElementById('nasa-modal');
    if (modal) modal.classList.add('hidden');
}

async function showNasaModal(planetName) {
    const modal = document.getElementById('nasa-modal');
    const titleEl = document.getElementById('nasa-title');
    const imgEl = document.getElementById('nasa-image');
    const descEl = document.getElementById('nasa-description');

    if (!modal || !titleEl || !imgEl || !descEl) return;
    modal.classList.remove('hidden');
    titleEl.innerText = `${planetName} 정보 불러오는 중...`;
    descEl.innerText = '';
    imgEl.src = '';

    const data = await getNasaData(planetName);
    if (data && (data.title || data.explanation)) {
        titleEl.innerText = data.title || `${planetName} NASA`;
        descEl.innerText = data.explanation || '';
        if (data.url) imgEl.src = data.url;
        return;
    }

    const local = localPlanetInfo[planetName] || { title: planetName, description: "로컬 정보가 없습니다." };
    titleEl.innerText = local.title;
    descEl.innerText = local.description;
    if (planetPreview[planetName]) imgEl.src = planetPreview[planetName];
}

function startTransition() {
    const canvas = document.getElementById('space-canvas');
    const loading = document.getElementById('loading-screen');
    const mapDiv = document.getElementById('map');
    const missionUI = document.getElementById('mission-ui');

    if (targetPlanetName === '지구') {
        hideNasaModal();
        canvas.style.display = 'none';
        loading.classList.remove('hidden');
        setTimeout(() => {
            loading.classList.add('hidden');
            mapDiv.style.display = 'block';
            missionUI.classList.remove('hidden');
            if (map) google.maps.event.trigger(map, "resize");
        }, 1000);
    } else {
        alert(`${targetPlanetName} 탐사 준비 중입니다.`);
        camera.position.set(0, 0, 35);
        document.getElementById('ui-container').style.opacity = '1';
    }
}

function returnToSpace() {
    const canvas = document.getElementById('space-canvas');
    const mapDiv = document.getElementById('map');
    const missionUI = document.getElementById('mission-ui');
    const loading = document.getElementById('loading-screen');

    mapDiv.style.display = 'none';
    missionUI.classList.add('hidden');
    loading.classList.add('hidden');
    canvas.style.display = 'block';
    document.getElementById('ui-container').style.opacity = '1';
    camera.position.set(0, 0, 35);
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

function wireUI() {
    const btnExplore = document.getElementById('btn-explore');
    const btnReset = document.getElementById('btn-reset');
    const btnSave = document.getElementById('btn-save-log');
    const btnBack = document.getElementById('btn-back-space');
    const btnCloseModal = document.getElementById('close-modal');
    const nasaModal = document.getElementById('nasa-modal');

    if (btnExplore) {
        btnExplore.addEventListener('click', () => {
            targetPlanetName = '지구';
            travelTarget.copy(earth.position);
            travelTarget.z += 2;
            isTraveling = true;
            document.getElementById('ui-container').style.opacity = '0';
        });
    }
    if (btnReset) btnReset.addEventListener('click', resetPath);
    if (btnSave) btnSave.addEventListener('click', savePathLog);
    if (btnBack) btnBack.addEventListener('click', returnToSpace);
    if (btnCloseModal) btnCloseModal.addEventListener('click', hideNasaModal);
    if (nasaModal) {
        nasaModal.addEventListener('click', (e) => {
            if (e.target === nasaModal) hideNasaModal();
        });
    }
}

// Init
window.initMap = initMap;
wireUI();
animate();

// Planet click
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
        showNasaModal(targetPlanetName);
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
