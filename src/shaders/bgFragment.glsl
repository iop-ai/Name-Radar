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
    // Normalized coordinates
    vec2 uv = vUv;

    // Adjust aspect ratio
    float aspect = uResolution.x / uResolution.y;
    vec2 centeredUv = uv - 0.5;
    centeredUv.x *= aspect;

    // Base noise layer (subtle)
    float noiseVal = snoise(centeredUv * 3.0 + uTime * 0.1);

    // Radar parameters
    float radarSpeed = 0.5;
    float angle = -uTime * radarSpeed;
    float pixelAngle = atan(centeredUv.y, centeredUv.x);

    // Normalize angle to 0-1 range relative to rotation
    // We want the "beam" to be at 'angle'
    float diff = pixelAngle - angle;
    // Wrap difference to -PI to PI
    diff = mod(diff + 3.14159, 6.28318) - 3.14159;

    // Radar beam intensity (sharp line with trail)
    // We only want positive side of the beam (trail behind it) or simple proximity
    // Let's make a sweeping line
    float beamWidth = 0.1;
    float trailLength = 2.5;

    // Calculate intensity based on angle difference
    // We want a sharp front edge and a long fading tail
    // Check if we are "behind" the sweep line

    // To obtain a correct wrap-around sweep:
    // 1. Current radar angle in [0, 2PI)
    float curAngle = mod(-uTime * radarSpeed, 6.28318);
    if(curAngle < 0.0) curAngle += 6.28318;

    // 2. Pixel angle in [0, 2PI)
    float pAngle = atan(centeredUv.y, centeredUv.x);
    if(pAngle < 0.0) pAngle += 6.28318;

    // 3. Delta (Use pAngle - curAngle for Clockwise rotation trail)
    float delta = pAngle - curAngle;
    if(delta < 0.0) delta += 6.28318;

    // delta is now how far "behind" the beam passed this pixel
    // 0 means we are right on the beam

    // Intensity drops off as delta increases
    float beam = smoothstep(0.0, 0.02, delta) * smoothstep(trailLength, 0.0, delta);
    // Make the very front sharp
    float frontEdge = 1.0 - smoothstep(0.0, 0.05, delta);
    beam = max(beam, frontEdge * 2.0);


    // Color blending
    vec3 bgColor = vec3(0.96, 0.96, 0.97); // Off-white #fbfbfd
    // vec3 bgColor = vec3(0.9, 0.9, 0.92); // Slightly darker for contrast in test

    // Rainbow noise
    float rainbowNoise = snoise(centeredUv * 5.0 - uTime * 0.2);
    vec3 rainbow = palette(rainbowNoise * 0.5 + delta * 0.2);

    // Accent line color
    vec3 beamColor = uColorAccent;

    // Mix: Base + Beam(Rainbow/Color)
    // Where the beam is high, show more rainbow/accent

    // Final composition
    vec3 finalColor = mix(bgColor, rainbow, beam * 0.6 * smoothstep(0.2, 0.8, noiseVal + 0.5));

    // Add the sharp orange line at the very front
    // use frontEdge
    finalColor = mix(finalColor, uColorAccent, frontEdge * 0.8);

    gl_FragColor = vec4(finalColor, 1.0);
}
