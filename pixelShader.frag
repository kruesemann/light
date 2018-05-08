precision mediump float;

varying vec2 vTextureCoord;
varying vec2 vFilterCoord;

uniform sampler2D uSampler;
uniform vec4 filterArea;
uniform vec2 dimensions;

uniform float uHeight;
uniform vec4 uLightColor;
uniform vec3 uLightCoord;
uniform float uScale;
uniform sampler2D uBumpMap;

void main() {
    vec4 bump = texture2D(uBumpMap, vTextureCoord * filterArea.xy / dimensions);
    vec3 coord = vec3((vTextureCoord * filterArea.xy + filterArea.zw) / uScale, bump.r / 12.0 + 3.0 * uHeight);

    float lX = uLightCoord.x - coord.x;
    float lY = uLightCoord.y - coord.y;
    float lZ = 3.0 * uLightCoord.z - coord.z;

    vec3 normal = vec3(0.0,0.0,0.0);
    if (bump.g < 18.0 / 255.0) {
        normal.y -= 1.0;
    } else if (bump.g < 54.0 / 255.0) {
        normal.y -= 1.0;
        normal.z += 1.0;
    } else if (bump.g < 90.0 / 255.0) {
        normal.z += 1.0;
    } else if (bump.g < 126.0 / 255.0) {
        normal.y += 1.0;
        normal.z += 1.0;
    } else if (bump.g < 162.0 / 255.0) {
        normal.y += 1.0;
    }

    if (bump.b < 18.0 / 255.0) {
        normal.x -= 1.0;
    } else if (bump.b < 54.0 / 255.0) {
        normal.x -= 1.0;
        normal.z += 1.0;
    } else if (bump.b < 90.0 / 255.0) {
        normal.z += 1.0;
    } else if (bump.b < 126.0 / 255.0) {
        normal.x += 1.0;
        normal.z += 1.0;
    } else if (bump.b < 162.0 / 255.0) {
        normal.x += 1.0;
    }

    float sp = 0.0;
    float norm = sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (norm > 0.0) {
        normal /= norm;
        sp = normal.x * lX + normal.y * lY + normal.z * lZ;
    } else {
        sp = abs(lX) + abs(lY) + abs(lZ);
    }

    float brightness = 0.0;

    if (sp >= 0.0) {
        float dist = (uLightCoord.x - coord.x) * (uLightCoord.x - coord.x) + (uLightCoord.y - coord.y) * (uLightCoord.y - coord.y) + (3.0 * uLightCoord.z - coord.z) * (3.0 * uLightCoord.z - coord.z);
        float intensity = sqrt(sp / sqrt(dist));
        brightness = max(0.0, (-0.071 * dist + uLightColor.w * 100.0) * intensity);
    }

    vec3 rgb = uLightColor.xyz * brightness / 100.0;

    vec3 over = vec3(max(0.0, rgb.x - 1.0), max(0.0, rgb.y - 1.0), max(0.0, rgb.z - 1.0));
    rgb.x += 0.5 * (over.y + over.z);
    rgb.y += 0.5 * (over.x + over.z);
    rgb.z += 0.5 * (over.x + over.y);

    vec4 color = texture2D(uSampler, vTextureCoord);
    gl_FragColor.r = min(1.0, color.r * rgb.x);
    gl_FragColor.g = min(1.0, color.g * rgb.y);
    gl_FragColor.b = min(1.0, color.b * rgb.z);
    gl_FragColor.a = color.a;
}
