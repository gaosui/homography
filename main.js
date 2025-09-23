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
camOverall.position.set(30, 50, 80);
camOverall.lookAt(0, 0, -200);

// Camera A at origin
const camA = new THREE.PerspectiveCamera(20, canvasA.width / canvasA.height, 100, 1000);

// Camera B floating
const camB = new THREE.PerspectiveCamera(20, canvasB.width / canvasB.height, 100, 1000);
// camB.rotateY(-Math.PI / 16)
camB.position.set(0, 0, -20);

// Scene creation
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x44444E);

// Show axis
const axesHelper = new THREE.AxesHelper(300);
scene.add(axesHelper);

// Camera helpers
const camAHelper = new THREE.CameraHelper(camA);
scene.add(camAHelper);
const camBHelper = new THREE.CameraHelper(camB);
scene.add(camBHelper);

// Plane
const planeTex = new THREE.TextureLoader().load("https://upload.wikimedia.org/wikipedia/commons/7/70/Checkerboard_pattern.svg");
const planeGeo = new THREE.PlaneGeometry(105.796, 105.796);
const planeMaterial = new THREE.MeshBasicMaterial({ map: planeTex });
const planeMesh = new THREE.Mesh(planeGeo, planeMaterial);
const planeDepth = 300;
const planeNormal = new THREE.Vector3(0, 0, -1);
planeMesh.translateOnAxis(planeNormal, planeDepth);
scene.add(planeMesh);

// Warpped scene
const wrapTexture = new THREE.CanvasTexture(canvasB);
const warpGeo = new THREE.PlaneGeometry(2, 2);
const warpMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTexture: { value: wrapTexture },
    uProj: { value: new THREE.Matrix4() },
    uProjInv: { value: new THREE.Matrix4() },
    uView: { value: new THREE.Matrix4() },
    uPlaneN: { value: planeNormal },
    uPlaneD: { value: planeDepth }
  },
  vertexShader: `
  varying vec2 vTexCoord;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vTexCoord = uv;
  }`,
  fragmentShader: `
  uniform mat4 uProj;
  uniform mat4 uProjInv;
  uniform mat4 uView;
  uniform vec3 uPlaneN;
  uniform float uPlaneD;
  uniform sampler2D uTexture;
  varying vec2 vTexCoord;

  void main() {
    vec4 a_ndc = vec4(vTexCoord.x * 2.0 - 1.0, vTexCoord.y * 2.0 - 1.0, -1, 1);
    vec4 a_proj4 = uProjInv * a_ndc;
    vec3 a_proj3 = a_proj4.xyz / a_proj4.w;
    float factor = uPlaneD / dot(uPlaneN, a_proj3);
    vec3 Pa = a_proj3 * factor;
    vec4 Pb = uView * vec4(Pa, 1.0);
    vec4 b_ndc4 = uProj * Pb;
    vec3 b_ndc3 = b_ndc4.xyz / b_ndc4.w;
    vec2 warpTex = vec2((b_ndc3.x + 1.0) / 2.0, (b_ndc3.y + 1.0) / 2.0);

    if (warpTex.x < 0.0 || warpTex.x > 1.0 || warpTex.y < 0.0 || warpTex.y > 1.0) {
      gl_FragColor = vec4(0.2, 0.2, 0.2, 1);
    } else {
      gl_FragColor = texture2D(uTexture, warpTex);
    }
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
  warpMaterial.uniforms.uProjInv.value = camA.projectionMatrixInverse;
  warpMaterial.uniforms.uView.value = camB.matrixWorldInverse;
  warpMaterial.uniforms.uProj.value = camB.projectionMatrix;
  rendererWarp.render(warpScene, camOrtho);
}

rendererOverall.setAnimationLoop(animateOverall);
rendererA.setAnimationLoop(animateA);
rendererB.setAnimationLoop(animateB);
rendererWarp.setAnimationLoop(animateWarp);

setTimeout(function () {
  const size = new THREE.Vector2();
  camB.getViewSize(300, size);
  console.log(size)
  const p = new THREE.Vector3(1, -1, -1);
  const b = p.applyMatrix4(camB.projectionMatrixInverse);
  console.log(b);
  const factor = planeDepth / b.dot(planeNormal);
  const Pb = b.multiplyScalar(factor);
  console.log(Pb);
  const Pa = Pb.applyMatrix4(camA.matrixWorldInverse);
  console.log(camA.matrixWorldInverse)
  console.log(Pa);
  const a = Pa.applyMatrix4(camA.projectionMatrix);
  console.log(a);
}, 1000)
