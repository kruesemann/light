precision mediump float;

varying vec2 vTextureCoord;
varying vec2 vFilterCoord;
uniform sampler2D uSampler;
uniform vec4 filterArea;
uniform vec2 dimensions;

uniform float uHeight;
uniform vec3 uAmbient;
uniform float uLightColors[40];
uniform float uLightCoords[30];
uniform float uScale;
uniform sampler2D uBumpMap;

void main() {
    vec4 bump = texture2D(uBumpMap, vTextureCoord * filterArea.xy / dimensions);
    vec3 coord = vec3((vTextureCoord * filterArea.xy + filterArea.zw) / uScale, bump.r / 12.0 + 3.0 * uHeight);

    vec3 rgb = vec3(0.0, 0.0, 0.0);

    for(int i = 0; i < 10; i++) {
        float lX = uLightCoords[i * 3] - coord.x;
        float lY = uLightCoords[i * 3 + 1] - coord.y;
        float lZ = 3.0 * uLightCoords[i * 3 + 2] - coord.z;

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
            float dist = (uLightCoords[i * 3] - coord.x) * (uLightCoords[i * 3] - coord.x) + (uLightCoords[i * 3 + 1] - coord.y) * (uLightCoords[i * 3 + 1] - coord.y) + (3.0 * uLightCoords[i * 3 + 2] - coord.z) * (3.0 * uLightCoords[i * 3 +2] - coord.z);
            float intensity = sqrt(sp / sqrt(dist));
            brightness = max(0.0, (-0.71 * dist + uLightColors[i * 4 + 3] * 100.0) * intensity);
        }

        rgb.x += uLightColors[i * 4] * brightness / 100.0;
        rgb.y += uLightColors[i * 4 + 1] * brightness / 100.0;
        rgb.z += uLightColors[i * 4 + 2] * brightness / 100.0;
    }

    vec3 over = vec3(max(0.0, rgb.x - 1.0), max(0.0, rgb.y - 1.0), max(0.0, rgb.z - 1.0));
    rgb.x += 0.5 * (over.y + over.z);
    rgb.y += 0.5 * (over.x + over.z);
    rgb.z += 0.5 * (over.x + over.y);

    vec4 color = texture2D(uSampler, vTextureCoord);
    gl_FragColor.r = min(1.0, color.r * max(rgb.x, uAmbient.x));
    gl_FragColor.g = min(1.0, color.g * max(rgb.y, uAmbient.y));
    gl_FragColor.b = min(1.0, color.b * max(rgb.z, uAmbient.z));
    gl_FragColor.a = color.a;
}
