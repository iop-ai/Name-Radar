"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Import shaders as raw text
const bgVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const bgFragmentShader = `
uniform float uTime;
uniform vec3 uColorAccent;
uniform vec2 uResolution;

varying vec2 vUv;

// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Palette function
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 centeredUv = uv - 0.5;
    centeredUv.x *= aspect;

    float noiseVal = snoise(centeredUv * 3.0 + uTime * 0.1);

    float radarSpeed = 0.5;
    float trailLength = 2.5;

    float curAngle = mod(-uTime * radarSpeed, 6.28318);
    if(curAngle < 0.0) curAngle += 6.28318;

    float pAngle = atan(centeredUv.y, centeredUv.x);
    if(pAngle < 0.0) pAngle += 6.28318;

    float delta = pAngle - curAngle;
    if(delta < 0.0) delta += 6.28318;

    float beam = smoothstep(0.0, 0.02, delta) * smoothstep(trailLength, 0.0, delta);
    float frontEdge = 1.0 - smoothstep(0.0, 0.05, delta);
    beam = max(beam, frontEdge * 2.0);

    vec3 bgColor = vec3(0.96, 0.96, 0.97);

    float rainbowNoise = snoise(centeredUv * 5.0 - uTime * 0.2);
    vec3 rainbow = palette(rainbowNoise * 0.5 + delta * 0.2);

    vec3 finalColor = mix(bgColor, rainbow, beam * 0.6 * smoothstep(0.2, 0.8, noiseVal + 0.5));
    finalColor = mix(finalColor, uColorAccent, frontEdge * 0.8);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const textVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const textFragmentShader = `
uniform sampler2D uTexture;
uniform float uTime;
uniform vec3 uColor;

varying vec2 vUv;
varying vec3 vPosition;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    if(texColor.a < 0.1) discard;

    vec2 centeredUv = vUv - 0.5;

    float radarSpeed = 0.5;
    float curAngle = mod(-uTime * radarSpeed, 6.28318);
    if(curAngle < 0.0) curAngle += 6.28318;

    vec2 worldPos = (vUv - 0.5) * vec2(4.0, 1.0);
    float pAngle = atan(worldPos.y, worldPos.x);
    if(pAngle < 0.0) pAngle += 6.28318;

    float delta = pAngle - curAngle;
    if(delta < 0.0) delta += 6.28318;

    float intensity = smoothstep(0.0, 0.5, delta) * smoothstep(1.5, 0.0, delta);

    vec3 finalColor = uColor;
    vec3 rainbow = palette(vUv.x + uTime * 0.5);
    finalColor = mix(finalColor, rainbow, intensity * 0.8);

    gl_FragColor = vec4(finalColor, texColor.a);
}
`;

interface ThreeBackgroundProps {
  className?: string;
}

export default function ThreeBackground({ className }: ThreeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    bgMaterial: THREE.ShaderMaterial;
    textMesh: THREE.Mesh | null;
    clock: THREE.Clock;
    animationId: number;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      sizes.width / sizes.height,
      0.1,
      100
    );
    camera.position.z = 5;
    scene.add(camera);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Background
    const fov = camera.fov * (Math.PI / 180);
    const height = 2 * Math.tan(fov / 2) * camera.position.z;
    const width = height * camera.aspect;

    const bgGeometry = new THREE.PlaneGeometry(width, height, 32, 32);
    const bgMaterial = new THREE.ShaderMaterial({
      vertexShader: bgVertexShader,
      fragmentShader: bgFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColorAccent: { value: new THREE.Color("#FF6B00") },
        uResolution: { value: new THREE.Vector2(sizes.width, sizes.height) },
      },
    });

    const bgBox = new THREE.Mesh(bgGeometry, bgMaterial);
    bgBox.position.z = -0.01;
    scene.add(bgBox);

    // 3D Text
    let textMesh: THREE.Mesh | null = null;

    function createTextTexture(text: string) {
      const textCanvas = document.createElement("canvas");
      const ctx = textCanvas.getContext("2d");
      if (!ctx) return null;

      const fontSize = 100;
      const fontFamily = "Space Grotesk";
      const fontWeight = "700";

      textCanvas.width = 2048;
      textCanvas.height = 512;

      ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);

      const texture = new THREE.CanvasTexture(textCanvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;

      return { texture, aspect: textCanvas.width / textCanvas.height };
    }

    // Wait for fonts to load
    document.fonts.ready.then(() => {
      const textData = createTextTexture("Find Your Perfect Brand");
      if (!textData) return;

      const textGeometry = new THREE.PlaneGeometry(8, 8 / textData.aspect);
      const textMaterial = new THREE.ShaderMaterial({
        vertexShader: textVertexShader,
        fragmentShader: textFragmentShader,
        uniforms: {
          uTexture: { value: textData.texture },
          uTime: { value: 0 },
          uColor: { value: new THREE.Color("#1d1d1f") },
        },
        transparent: true,
      });

      textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.y = 1.5;
      scene.add(textMesh);

      if (sceneRef.current) {
        sceneRef.current.textMesh = textMesh;
      }
    });

    // Resize handler
    const handleResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;

      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();

      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      bgMaterial.uniforms.uResolution.value.set(sizes.width, sizes.height);

      const rh = 2 * Math.tan(fov / 2) * camera.position.z;
      const rw = rh * camera.aspect;
      bgBox.scale.set(rw / width, rh / height, 1);
    };

    window.addEventListener("resize", handleResize);

    // Animation loop
    const clock = new THREE.Clock();

    const tick = () => {
      const elapsedTime = clock.getElapsedTime();

      bgMaterial.uniforms.uTime.value = elapsedTime;
      if (sceneRef.current?.textMesh) {
        (
          sceneRef.current.textMesh.material as THREE.ShaderMaterial
        ).uniforms.uTime.value = elapsedTime;
      }

      renderer.render(scene, camera);

      const animationId = window.requestAnimationFrame(tick);
      if (sceneRef.current) {
        sceneRef.current.animationId = animationId;
      }
    };

    const animationId = window.requestAnimationFrame(tick);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      bgMaterial,
      textMesh,
      clock,
      animationId,
    };

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (sceneRef.current) {
        window.cancelAnimationFrame(sceneRef.current.animationId);
      }
      renderer.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
