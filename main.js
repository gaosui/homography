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

// Camera A
const camA = new THREE.PerspectiveCamera(20, canvasA.width / canvasA.height, 100, 1000);
camA.position.set(30, 0, 0);

// Camera B
const camB = new THREE.PerspectiveCamera(20, canvasB.width / canvasB.height, 100, 1000);
camB.rotateY(-Math.PI / 8);
camB.position.set(-50, 0, 80);

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
const planeGeo = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshBasicMaterial({ map: planeTex });
const planeMesh = new THREE.Mesh(planeGeo, planeMaterial);
const planeNormal = new THREE.Vector3(0.3, 0, -1).normalize();
const planeDepth = 200;
planeMesh.lookAt(planeNormal.clone().negate());
planeMesh.translateZ(-planeDepth);
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
    uPlaneN: { value: new THREE.Vector3() },
    uPlaneD: { value: 0 }
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
      gl_FragColor = vec4(0, 0, 0, 1);
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
  warpMaterial.uniforms.uView.value = camB.matrixWorldInverse.clone().multiply(camA.matrixWorld);
  warpMaterial.uniforms.uProj.value = camB.projectionMatrix;

  const pointOnPlane = planeNormal.clone().multiplyScalar(planeDepth);
  const newNorm = planeNormal.clone().applyMatrix4(camA.matrixWorld.clone().transpose());
  const newPoP = pointOnPlane.applyMatrix4(camA.matrixWorldInverse);
  const newD = newPoP.dot(newNorm);

  warpMaterial.uniforms.uPlaneD.value = newD;
  warpMaterial.uniforms.uPlaneN.value = newNorm;

  rendererWarp.render(warpScene, camOrtho);
}

rendererOverall.setAnimationLoop(animateOverall);
rendererA.setAnimationLoop(animateA);~
rendererB.setAnimationLoop(animateB);
rendererWarp.setAnimationLoop(animateWarp);
