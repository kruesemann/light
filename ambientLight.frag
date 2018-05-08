precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec3 uAmbient;

void main() {
    vec4 color = texture2D(uSampler, vTextureCoord);
    gl_FragColor = vec4(color.rgb * uAmbient, color.a);
}
