uniform sampler2D uTexture;
uniform float uTime;
uniform vec3 uColor;

varying vec2 vUv;
varying vec3 vPosition;

// Palette function
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec4 texColor = texture2D(uTexture, vUv);

    // If fully transparent, discard (or just output transparent)
    if(texColor.a < 0.1) discard;

    // Coordinates relative to center of screen (assuming text is centered)
    // We might need to adjust if the text plane is scaled.
    // For simplicity, we can use vUv, but shift to center (0.5, 0.5)
    vec2 centeredUv = vUv - 0.5;
    // Correct aspect ratio if needed, but for text effect, raw UV might be fine
    // provided the effect matches the background speed/feel.

    // Radar match
    // We use global position if we pass it, or just rely on time.
    // Let's just make a sweeping effect across the text from left to right
    // that syncs with the rotation.

    // Or better: calculate the angle of this pixel relative to the screen center
    // But the text plane vertex position is local.
    // We can approximate or just do a linear wave for the text as requested "multi-color shift sweep"

    // Let's use the same rotational logic to make it feel connected.
    // The text is usually in the center. The radar sweeps around the center.
    // So the text should light up when the radar arm is horizontal (0 or 180 degrees).
    // Or if the text is wide, as the arm scans across it.

    float radarSpeed = 0.5;
    float curAngle = mod(-uTime * radarSpeed, 6.28318);
    if(curAngle < 0.0) curAngle += 6.28318;

    // Map pixel to angle range. Text is roughly -0.5 to 0.5 in x.
    // For a horizontal text, the angle is roughly 0 (right) or PI (left)?
    // Wait, canvas 0,0 is top left? Three.js 0,0 is center.

    // Let's treat the text as being swept by a linear wave that corresponds to the specific part of the rotation.
    // Or just simple:

    float sweep = sin(uTime * 2.0 + vUv.x * 3.0); // Simple wave

    // Better: Radar logic adaptation
    // Convert vUv to world-like coordinates approximately
    // Assuming text plane is roughly centered in the view
    vec2 worldPos = (vUv - 0.5) * vec2(4.0, 1.0); // Aspect ratio guess
    float pAngle = atan(worldPos.y, worldPos.x);
    if(pAngle < 0.0) pAngle += 6.28318;

    float delta = pAngle - curAngle;
    if(delta < 0.0) delta += 6.28318;

    // Effect intensity
    float intensity = smoothstep(0.0, 0.5, delta) * smoothstep(1.5, 0.0, delta);

    // Base color
    vec3 finalColor = uColor;

    // Rainbow shift
    vec3 rainbow = palette(vUv.x + uTime * 0.5);

    // Mix
    // Apply rainbow where intensity is high
    finalColor = mix(finalColor, rainbow, intensity * 0.8);

    gl_FragColor = vec4(finalColor, texColor.a);
}
