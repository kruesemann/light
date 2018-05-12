PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
let width = window.innerWidth;
let height = window.innerHeight;
const depth = 500;
APPLICATION = new PIXI.Application({
    width,
    height,
    backgroundColor: 0x000000
});

window.onresize = function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    APPLICATION.renderer.resize(width, height);
    APPLICATION.stage.width = width;
    APPLICATION.stage.height = height;
    APPLICATION.stage.filterArea = new PIXI.Rectangle(0, 0, width, height);
    canvasFilter.uniforms.dimensions = [width, height, depth];
}

document.body.appendChild(APPLICATION.view);

const ambientLight = [255, 255, 255, 0.2];

const canvas = new PIXI.Container(width, height);
APPLICATION.stage.filterArea = new PIXI.Rectangle(0, 0, width, height);
let canvasFilter;
APPLICATION.stage.addChild(canvas);

let clickX = 0;
let clickY = 0;

/**
 * entities
 */
const objects = [];
function createObject(x, y, z, width, height, name, id) {
    const object = {
        id: id ? id : `o${objects.length}`,
        x: x,
        y: y,
        z: z,
        width: (1 + 4 * z / depth) * width,
        height: (1 + 4 * z / depth) * height,
        texture: PIXI.loader.resources[name].texture, //PIXI.Texture.fromImage(`assets/${name}.png`),
        bumpMap: PIXI.loader.resources[name + "_bumpMap"].texture //PIXI.Texture.fromImage(`assets/${name}_bumpMap.png`)
    };
    objects.push(object);
    return object;
}

const lights = [];
function createLight(x, y, z, r, g, b, i, id) {
    const light = {
        id: id ? id : `l${lights.length}`,
        position: [x, y, z],
        color: [r, g, b, i]
    };
    lights.push(light);
    return light;
}

PIXI.loader
    .add("char01", `assets/char01.png`)
    .add("char01_bumpMap", `assets/char01_bumpMap.png`)
    .add("test", `assets/test.png`)
    .add("test_bumpMap", `assets/test_bumpMap.png`)
    .add("light", `assets/light.png`)
    .add("light_bumpMap", `assets/light_bumpMap.png`)
    .load(setup);

function setup() {
    const char1 = createObject(50, 50, 400, 22, 57, "char01");
    const char2 = createObject(200, 150, 300, 22, 57, "char01");
    const char3 = createObject(900, 300, 249, 11, 11, "light");
    //const char4 = createObject(150, 50, 300, 22, 57, "char01");
    //const char5 = createObject(150, 50, 300, 22, 57, "char01");
    const char6 = createObject(150, 50, 350, 50, 50, "test");

    createLight(300, 300, 450, 255, 255, 255, 10);
    createLight(900, 300, 250, 255, 255, 0, 10);
    /*createLight(500, 500, 250, 255, 255, 255, 8);
    createLight(750, 150, 500, 0, 0, 255, 3);
    createLight(150, 750, 0, 255, 255, 0, 7);
    createLight(550, 150, 200, 0, 255, 255, 4);
    createLight(150, 550, 350, 255, 0, 255, 11);
    createLight(750, 750, 450, 128, 192, 255, 7);
    createLight(1050, 150, 500, 192, 255, 128, 1);
    createLight(1050, 850, 0, 255, 128, 192, 9);*/

    /**
     * test
     */
    document.addEventListener("mousedown", event => {
        objects.sort((o1, o2) => o2.z - o1.z);
        clickX = event.clientX;
        clickY = event.clientY;
        //console.log(clickX, clickY);

        for (let object of objects) {
            if (clickX >= object.x && clickY >= object.y && clickX <= object.x + object.width && clickY <= object.y + object.height) {
                clickX -= object.x;
                clickY -= object.y;
                object.drag = true;
                break;
            }
        }
    });
    document.addEventListener("mousemove", event => {
        for (let object of objects) {
            if (object.drag) {
                object.x = event.clientX - clickX;
                object.y = event.clientY - clickY;
                eval(`canvasFilter.uniforms.${object.id}Position = [object.x, object.y, object.z];`);
                break;
            }
        }
    });
    document.addEventListener("mouseup", _ => {
        for (let object of objects) {
            if (object.drag) {
                object.drag = false;
                break;
            }
        }
    });
    window.addEventListener("keydown", event => {
        function enterFullscreen() {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.msRequestFullscreen) {
                document.documentElement.msRequestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen();
            }
        }

        function exitFullscreen() {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
        if (event.keyCode == 122) {
            if (
                (document.fullScreenElement && document.fullScreenElement !== null) ||
                (document.mozFullScreen || document.webkitIsFullScreen)
            ) {
                exitFullscreen();
            } else {
                enterFullscreen();
            }
            event.preventDefault();
        }
    });

    updateShader();

    APPLICATION.ticker.add(gameloop);
}

function updateShader() {
    objects.sort((o1, o2) => o1.z - o2.z);
    let lightInitials = false;
    const uniforms = {};
    uniforms.dimensions = { type: 'vec3', value: [width, height, depth] };
    uniforms.ambientLight = { type: 'vec4', value: ambientLight };

    let imports = `
precision mediump float;
uniform vec3 dimensions;
uniform vec4 ambientLight;
    `;

    let mainStart = `
bool hit(in vec2 xy, in vec2 pos, in vec2 dims) {
    return xy.x >= pos.x && xy.y >= pos.y && xy.x <= pos.x + dims.x && xy.y <= pos.y + dims.y;
}

void main(void) {
    vec2 xy = vec2(gl_FragCoord.x, dimensions.y - gl_FragCoord.y);
    `;

    let main = `
    gl_FragColor = vec4(0., 0., 0., 1.);
    `;

    for (let object of objects) {
        eval(`uniforms.${object.id}Texture = { type: 'sampler2D', value: object.texture };`);
        eval(`uniforms.${object.id}BumpMap = { type: 'sampler2D', value: object.bumpMap };`);
        eval(`uniforms.${object.id}Position = { type: 'vec3', value: [object.x, object.y, object.z] };`);
        eval(`uniforms.${object.id}Dimensions = { type: 'vec2', value: [object.width, object.height] };`);

        imports += `
uniform sampler2D ${object.id}Texture;
uniform sampler2D ${object.id}BumpMap;
uniform vec3 ${object.id}Position;
uniform vec2 ${object.id}Dimensions;
        `;

        main += `
    if (hit(xy, ${object.id}Position.xy, ${object.id}Dimensions)) {
        vec2 ${object.id}TexturePos = (xy - ${object.id}Position.xy)  / (${object.id}Dimensions);
        vec4 ${object.id}Color = texture2D(${object.id}Texture, ${object.id}TexturePos);
        if (${object.id}Color.a != 0.) {
            vec4 ${object.id}Bump = texture2D(${object.id}BumpMap, ${object.id}TexturePos);

            vec3 ${object.id}Normal = vec3(0., 0., 0.);

            if (${object.id}Bump.x < 95. / 255.) {
                ${object.id}Normal.x = -1.;
            } else if (${object.id}Bump.x < 159. / 255.) {
                ${object.id}Normal.x = 0.;
            } else if (${object.id}Bump.x < 223. / 255.) {
                ${object.id}Normal.x = 1.;
            } else {
                ${object.id}Normal.x = 2.;
            }
        
            if (${object.id}Bump.y < 95. / 255.) {
                ${object.id}Normal.y = -1.;
            } else if (${object.id}Bump.y < 159. / 255.) {
                ${object.id}Normal.y = 0.;
            } else if (${object.id}Bump.y < 223. / 255.) {
                ${object.id}Normal.y = 1.;
            } else {
                ${object.id}Normal.y = 2.;
            }

            if (${object.id}Bump.z < 95. / 255.) {
                ${object.id}Normal.z = -1.;
            } else if (${object.id}Bump.z < 159. / 255.) {
                ${object.id}Normal.z = 0.;
            } else if (${object.id}Bump.z < 223. / 255.) {
                ${object.id}Normal.z = 1.;
            } else {
                ${object.id}Normal.z = 2.;
            }

            float ${object.id}Norm = 1.;

            vec3 ${object.id}RGB = vec3(0., 0., 0.);
        `;

        for (let light of lights) {
            if (!lightInitials) {
                eval(`uniforms.${light.id}Color = { type: 'vec4', value: light.color };`);
                eval(`uniforms.${light.id}Position = { type: 'vec3', value: light.position };`);

                imports += `
uniform vec4 ${light.id}Color;
uniform vec3 ${light.id}Position;
                `;
            }

            main += `
            vec3 ${light.id}RestColor = ${light.id}Color.rgb;
            `;

            for (let occluder of objects) {
                if (occluder.id == object.id) continue;
                main += `
            if (${light.id}RestColor != vec3(0., 0., 0.)) {
                float ${object.id}${occluder.id}Lambda = (${object.id}Position.z - ${light.id}Position.z) / (${occluder.id}Position.z - ${light.id}Position.z);

                if (${object.id}${occluder.id}Lambda > 1.) {
                    vec2 ${object.id}${occluder.id}XY = floor(${light.id}Position.xy + (xy - ${light.id}Position.xy) / ${object.id}${occluder.id}Lambda - ${occluder.id}Position.xy);

                    if (hit(${object.id}${occluder.id}XY, vec2(0., 0.), ${occluder.id}Dimensions)) {
                        vec4 ${occluder.id}Color = texture2D(${occluder.id}Texture, ${object.id}${occluder.id}XY / ${occluder.id}Dimensions);
                        if (${occluder.id}Color.a > 0.) {
                            if (${occluder.id}Color.a < 1.) {
                                ${light.id}RestColor *= ${occluder.id}Color.rgb;
                            } else {
                                ${light.id}RestColor *= 0.;
                            }
                        }
                    }
                }
            }
                `;
            }

            main += `
            if (${light.id}RestColor != vec3(0., 0., 0.)) {
                vec3 ${object.id}${light.id}Ray = vec3(${light.id}Position.xy - xy, ${light.id}Position.z - ${object.id}Position.z);
                float ${object.id}${light.id}Norm = length(${object.id}${light.id}Ray);

                float ${object.id}${light.id}SP = 0.;
                if (${object.id}${light.id}Norm > 0.) {
                    if (${object.id}Normal.x != 2.) {
                        if (${object.id}Normal.y != 2.) {
                            if (${object.id}Normal.z != 2.) {
                                ${object.id}Norm = length(${object.id}Normal);
                                if (${object.id}Norm > 0.) {
                                    ${object.id}${light.id}SP = dot(${object.id}Normal, ${object.id}${light.id}Ray);
                                    ${object.id}${light.id}SP /= ${object.id}Norm * ${object.id}${light.id}Norm;
                                }
                            } else {
                                ${object.id}Norm = length(vec3(${object.id}Normal.xy, 1.));
                                if (${object.id}Norm > 0.) {
                                    ${object.id}${light.id}SP = dot(${object.id}Normal.xy, ${object.id}${light.id}Ray.xy) + abs(${object.id}${light.id}Ray.z);
                                    ${object.id}${light.id}SP /= ${object.id}Norm * ${object.id}${light.id}Norm;
                                }
                            }
                        } else {
                            if (${object.id}Normal.z != 2.) {
                                ${object.id}Norm = length(vec3(${object.id}Normal.xz, 1.));
                                if (${object.id}Norm > 0.) {
                                    ${object.id}${light.id}SP = dot(${object.id}Normal.xz, ${object.id}${light.id}Ray.xz) + abs(${object.id}${light.id}Ray.y);
                                    ${object.id}${light.id}SP /= ${object.id}Norm * ${object.id}${light.id}Norm;
                                }
                            } else {
                                ${object.id}Norm = length(vec3(${object.id}Normal.x, 1., 1.));
                                if (${object.id}Norm > 0.) {
                                    ${object.id}${light.id}SP = ${object.id}Normal.x * ${object.id}${light.id}Ray.x + abs(${object.id}${light.id}Ray.y) + abs(${object.id}${light.id}Ray.z);
                                    ${object.id}${light.id}SP /= ${object.id}Norm * ${object.id}${light.id}Norm;
                                }
                            }
                        }
                    } else {
                        if (${object.id}Normal.y != 2.) {
                            if (${object.id}Normal.z != 2.) {
                                ${object.id}Norm = length(vec3(${object.id}Normal.yz, 1.));
                                if (${object.id}Norm > 0.) {
                                    ${object.id}${light.id}SP = dot(${object.id}Normal.yz, ${object.id}${light.id}Ray.yz) + abs(${object.id}${light.id}Ray.x);
                                    ${object.id}${light.id}SP /= ${object.id}Norm * ${object.id}${light.id}Norm;
                                }
                            } else {
                                ${object.id}Norm = length(vec3(${object.id}Normal.y, 1., 1.));
                                if (${object.id}Norm > 0.) {
                                    ${object.id}${light.id}SP = ${object.id}Normal.y * ${object.id}${light.id}Ray.y + abs(${object.id}${light.id}Ray.x) + abs(${object.id}${light.id}Ray.z);
                                    ${object.id}${light.id}SP /= ${object.id}Norm * ${object.id}${light.id}Norm;
                                }
                            }
                        } else {
                            if (${object.id}Normal.z != 2.) {
                                ${object.id}Norm = length(vec3(${object.id}Normal.z, 1., 1.));
                                if (${object.id}Norm > 0.) {
                                    ${object.id}${light.id}SP = ${object.id}Normal.z * ${object.id}${light.id}Ray.z + abs(${object.id}${light.id}Ray.x) + abs(${object.id}${light.id}Ray.y);
                                    ${object.id}${light.id}SP /= ${object.id}Norm * ${object.id}${light.id}Norm;
                                }
                            } else {
                                ${object.id}${light.id}SP = 1.;
                            }
                        }
                    }
                }

                float ${object.id}${light.id}Brightness = 0.;
                if (${object.id}${light.id}SP > 0.) {
                    ${object.id}${light.id}Brightness = 25. * ${light.id}Color.a / ${object.id}${light.id}Norm * ${object.id}${light.id}SP;
                }

                ${object.id}RGB += ${object.id}${light.id}Brightness * ${light.id}RestColor / 255.;
            }
            `;
        }

        main += `
            vec3 ${object.id}Over = vec3(max(vec3(0.), ${object.id}RGB - vec3(1.)));
            gl_FragColor = vec4(mix(gl_FragColor.rgb, min(vec3(1.), max(ambientLight.rgb / 255. * ambientLight.a, min(vec3(1.),${object.id}RGB)) * ${object.id}Color.rgb + .1 * ${object.id}Over), ${object.id}Color.a), 1.);
        }
    }
        `;
        lightInitials = true;
    }

    const fragSrc = imports + mainStart + main + `
}
    `;

    canvasFilter = new PIXI.Filter(null, fragSrc, uniforms);
    APPLICATION.stage.filters = [canvasFilter];
}

function gameloop(delta) {
    //char1.x = char1.x > width ? -100 : char1.x + 10;
    //canvasFilter.uniforms.char1Position = [char1.position.x, char1.position.y, char1.z];
    //char2.x = char2.x > width ? -100 : char2.x + 10;
    //canvasFilter.uniforms.char1Position = [char2.position.x, char2.position.y, char2.z];
}
