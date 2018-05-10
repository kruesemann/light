PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
let width = window.innerWidth;
let height = window.innerHeight;
const depth = 10;
APPLICATION = new PIXI.Application({
    width,
    height,
    autoResize: true,
    backgroundColor: 0x000000
});

window.onresize = function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    APPLICATION.renderer.resize(width, height);
    APPLICATION.stage.resize = width;
    APPLICATION.stage.height = height;
}

document.body.appendChild(APPLICATION.view);

class PixelLightFilter extends PIXI.Filter {
    constructor(fragSrc, uniforms) {
        super(null, fragSrc);
        this.uniforms = uniforms;
    }

    apply(filterManager, input, output) {
        filterManager.applyFilter(this, input, output);
    }
}

const ambient = [0.2, 0.2, 0.2];

const temp = new PIXI.Sprite();
APPLICATION.stage.addChild(temp);

let clickX = 0;
let clickY = 0;

const objects = [];
const lights = [
    { id: "light1", color: [1, 1, 1, 10], position: [5, 5, 6] }
];

/**
     * char1 essentials
     */
const char1 = PIXI.Sprite.fromImage("assets/char01.png");
char1.bumpMap = PIXI.Texture.fromImage("assets/char01_bumpMap.png");
char1.position.set(50, 50);
char1.z = 5;
char1.w = 22;
char1.h = 57;
char1.id = "char1";
objects.push(char1);

/**
 * char1 test
 */
char1.drag = false;
char1.interactive = true;
char1.hitArea = new PIXI.Rectangle(0, 0, 22, 57);
//char1.renderable = false;
//APPLICATION.stage.addChild(char1);

char1.on("mousedown", event => {
    clickX = event.data.global.x - char1.x;
    clickY = event.data.global.y - char1.y;
    char1.drag = true;
});
document.addEventListener("mousemove", event => {
    if (char1.drag) {
        char1.position.set(event.clientX - clickX, event.clientY - clickY);
    }
});

/**
 * test
 */
document.addEventListener("mouseup", _ => {
    char1.drag = false;
});

document.addEventListener("mousedown", event => {
    console.log(event.clientX, event.clientY);
});

PIXI.loader
    .add("char1", "assets/char01.png")
    .add("char1_bumpMap", "assets/char01_bumpMap.png")
    .load(setup);

function setup(loader, res) {
    updateShader();
}

function updateShader() {
    let lightInitials = false;
    const uniforms = {};
    uniforms.dimensions = { type: 'vec2', value: [width, height] };

    let imports = `
precision mediump float;
varying vec2 vTextureCoord;
uniform vec2 dimensions;
    `;

    let mainStart = `
bool hit(in vec2 xy, in vec2 pos, in vec2 dims) {
    return xy.x >= pos.x && xy.y >= pos.y && xy.x <= pos.x + dims.x && xy.y <= pos.y + dims.y;
}

void main(void) {
    vec2 xy = vec2(gl_FragCoord.x, dimensions.y - gl_FragCoord.y);
    `;

    let main = `
    vec3 color = vec3(0., 0., 0.);
    float maxZ = -1.;
    `;

    for (let object of objects) {
        eval(`uniforms.${object.id}Texture = { type: 'sampler2D', value: object.texture };`);
        eval(`uniforms.${object.id}BumpMap = { type: 'sampler2D', value: object.bumpMap };`);
        eval(`uniforms.${object.id}Position = { type: 'vec3', value: [object.x, object.y, object.z] };`);
        eval(`uniforms.${object.id}Dimensions = { type: 'vec2', value: [object.w, object.h] };`);

        imports += `
uniform sampler2D ${object.id}Texture;
uniform sampler2D ${object.id}BumpMap;
uniform vec3 ${object.id}Position;
uniform vec2 ${object.id}Dimensions;
        `;

        main += `
    if (hit(xy, ${object.id}Position.xy, ${object.id}Dimensions)) {
        if (maxZ < ${object.id}Position.z) {
            vec2 texturePos = xy - ${object.id}Position.xy;
            vec4 ${object.id}Bump = texture2D(${object.id}BumpMap, vTextureCoord);
            vec4 ${object.id}Color = texture2D(${object.id}Texture, vTextureCoord);
            float ${object.id}X = ${object.id}Position.x;
            color = ${object.id}Color.rgb;
        `;

        for (let light of lights) {
            if (!lightInitials) {
                eval(`uniforms.${light.id}Color = { type: 'vec4', value: light.color };`);
                eval(`uniforms.${light.id}Position = { type: 'vec3', value: light.position };`);

                imports += `
uniform vec4 ${light.id}Color;
uniform vec3 ${light.id}Position;
                `;

                main += `
            vec3 ${light.id}RGB = ${light.id}Color.xyz;
            float ${light.id}X = ${light.id}Position.x;
                `;
            }
            for (let object of objects) {

            }
        }

        main += `
        }
    }
        `;
        lightInitials = true;
    }

    const fragSrc = imports + mainStart + main + `
    gl_FragColor = vec4(color, 1.);
}
    `;

    APPLICATION.stage.width = width;
    APPLICATION.stage.height = height;
    APPLICATION.stage.filters = [new PIXI.Filter(null, fragSrc, uniforms)];
}
