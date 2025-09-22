import * as THREE from 'three';

const canvasOverall = document.getElementById("canvas-overall");
const canvasA = document.getElementById("canvas-a");
const canvasB = document.getElementById("canvas-b");
const canvasWarp = document.getElementById("canvas-warp");

const rendererOverall = new THREE.WebGLRenderer({ canvas: canvasOverall });
const rendererA = new THREE.WebGLRenderer({ canvas: canvasA });
const rendererB = new THREE.WebGLRenderer({ canvas: canvasB });
const rendererWarp = new THREE.WebGLRenderer({ canvas: canvasWarp });

// Overall camera
const camOverall = new THREE.PerspectiveCamera(75, canvasOverall.width / canvasOverall.height, 1, 1500);
camOverall.position.set(50, 50, 100);
camOverall.lookAt(0, 0, -100);

// Camera A floating around
const camA = new THREE.PerspectiveCamera(20, 1, 100, 1000);
camA.translateX(-20);
camA.rotateY(-Math.PI / 32)

// Camera B at origin
const camB = new THREE.PerspectiveCamera(20, 1, 100, 1000);

// Scene creation
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x44444E);

// Show axis
const axesHelper = new THREE.AxesHelper(500);
scene.add(axesHelper);

// Camera helpers
const camAHelper = new THREE.CameraHelper(camA);
scene.add(camAHelper);
const camBHelper = new THREE.CameraHelper(camB);
scene.add(camBHelper);

// Plane
// const planeTex = new THREE.TextureLoader().load("https://upload.wikimedia.org/wikipedia/commons/7/70/Checkerboard_pattern.svg");
const planeTex = new THREE.TextureLoader().load("https://hips.hearstapps.com/ghk.h-cdn.co/assets/17/30/dachshund.jpg");

const planeGeo = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshBasicMaterial({ map: planeTex });
const planeMesh = new THREE.Mesh(planeGeo, planeMaterial);
// const planeRotationAboutY = -Math.PI / 32;
// planeMesh.rotateY(planeRotationAboutY);
const planeDepth = -300;
const planeNormal = new THREE.Vector3(0, 0, 1);
// const planeNormal = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), planeRotationAboutY);
// planeMesh.translateOnAxis(planeNormal, planeDepth);
planeMesh.translateZ(-300)
scene.add(planeMesh);

// Warpped scene
const wrapTexture = new THREE.CanvasTexture(canvasB);
const warpGeo = new THREE.PlaneGeometry(2, 2);
const warpMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTexture: { value: wrapTexture },
    uProj: { value: camA.projectionMatrix },
    uProjInv: { value: camB.projectionMatrixInverse },
    uHomo: { value: new THREE.Matrix4() }
  },
  vertexShader: `
  uniform mat4 uProj;
  uniform mat4 uProjInv;
  uniform mat4 uHomo;
  varying vec2 vTexCoord;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec4 b_ndc = vec4(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0, -1, 1);
    vec4 b_proj4 = uProjInv * b_ndc;
    vec3 b_proj3 = vec3(b_proj4) / b_proj4.w;
    vec3 planeN = vec3(0, 0, -1);
    float l = length(b_proj3);
    float factor = 300.0 * dot(planeN, b_proj3) / (l * l);
    vec3 Pb = b_proj3 * factor;
    vec4 Pa = uHomo * vec4(Pb, 1);
    vec4 a_ndc = uProj * Pa;
    vec3 t = vec3(a_ndc) / a_ndc.w;
    vTexCoord = vec2((t.x + 1.0) / 2.0, (t.y + 1.0) / 2.0);
  }`,
  fragmentShader: `
  uniform sampler2D uTexture;
  varying vec2 vTexCoord;
  void main() {
    gl_FragColor = texture2D(uTexture, vTexCoord);
  }
  `
});
const warpMesh = new THREE.Mesh(warpGeo, warpMaterial);
const camOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
const warpScene = new THREE.Scene();
warpScene.add(warpMesh);

// Render loop functions
function animateOverall() {
  camAHelper.update();
  camBHelper.update();
  rendererOverall.render(scene, camOverall);
}

function animateA() {
  rendererA.render(scene, camA);
}

function animateB() {
  rendererB.render(scene, camB);
  wrapTexture.needsUpdate = true;
}

function animateWarp() {
  // const worldA = new THREE.Matrix4().makeTranslation(camA.getWorldPosition(new THREE.Vector3()));
  // worldA.invert();
  warpMaterial.uniforms.uHomo.value = camA.matrixWorld;
  warpMaterial.uniforms.uProj.value = camA.projectionMatrix;
  warpMaterial.uniforms.uProjInv.value = camB.projectionMatrixInverse;
  rendererWarp.render(warpScene, camOrtho);
}

function vecMul(v1, v2) {
  return new THREE.Matrix3(
    v1.x * v2.x, v1.x * v2.y, v1.x * v2.z,
    v1.y * v2.x, v1.y * v2.y, v1.y * v2.z,
    v1.x * v2.x, v1.z * v2.y, v1.z * v2.z
  );
}
rendererOverall.setAnimationLoop(animateOverall);
rendererA.setAnimationLoop(animateA);
rendererB.setAnimationLoop(animateB);
rendererWarp.setAnimationLoop(animateWarp);

// const b1 = new THREE.Vector2()
// const b2 = new THREE.Vector2()
// camB.getViewBounds(camB.near, b1, b2)
// console.log(camB.near, b1, b2)

setTimeout(function () {
  const p = new THREE.Vector4(-1, 1, -1, 1)
  p.applyMatrix4(camB.projectionMatrixInverse)
  console.log(p)
  const bProj = new THREE.Vector3(p.x / p.w, p.y / p.w, p.z / p.w);
  console.log(bProj);
  const n = new THREE.Vector3(0, 0, -1);
  const factor = n.dot(bProj) / bProj.lengthSq() * 300;
  console.log(factor)
  bProj.multiplyScalar(factor)
  console.log(bProj)
  bProj.applyMatrix4(camA.matrixWorldInverse)
  console.log(bProj)
  bProj.applyMatrix4(camA.projectionMatrix)
  console.log(bProj)
}, 1000)
