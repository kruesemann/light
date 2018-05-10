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


let clickX = 0;
let clickY = 0;



const temp = new PIXI.RenderTexture(width, height);
const canvas = new PIXI.Sprite(temp);
APPLICATION.stage.addChild(canvas);

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
char1.id = "char1";
objects.push(char1);

/**
 * char1 test
 */
char1.drag = false;
char1.interactive = true;
char1.hitArea = new PIXI.Rectangle(0, 0, 22, 57);

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

function writeShader() {
    objects.sort((o1, o2) => o1.z - o2.z);

    let lightInitials = false;
    const uniforms = {
        dimensions: [width, height]
    };

    let imports = `
precision mediump float;
uniform vec2 dimensions;
    `;

    let mainStart = `
void main(void) {
    vec2 st = gl_FragCoord.xy / dimensions;
    `;

    let main = `
    vec3 color = vec3(0.,0.,0.);
    `;

    /*for (let object of objects) {
        eval(`uniforms.${object.id}Texture = object.texture;`);
        eval(`uniforms.${object.id}BumpMap = object.bumpMap;`);
        eval(`uniforms.${object.id}Position = [object.x, object.y, object.z];`);

        imports += `
uniform sampler2D ${object.id}Texture;
uniform sampler2D ${object.id}BumpMap;
uniform vec3 ${object.id}Position;
        `;

        main += `
    vec4 ${object.id}Bump = texture2D(${object.id}BumpMap, gl_FragCoord.xy);
    vec4 ${object.id}Color = texture2D(${object.id}Texture, gl_FragCoord.xy);
    float ${object.id}X = ${object.id}Position.x;
        `;

        for (let light of lights) {
            if (!lightInitials) {
                eval(`uniforms.${light.id}Color = light.color;`);
                eval(`uniforms.${light.id}Position = light.position;`);

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

        lightInitials = true;
    }*/

    const fragSrc = imports + mainStart + main + `
    gl_FragColor = vec4(color, 1.);
}
    `;

    console.log(fragSrc);

    canvas.filters = [new PixelLightFilter(fragSrc, uniforms)];
}

writeShader();
