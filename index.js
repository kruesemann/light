const MAXNUM = 16;

const vSrc = `
attribute vec2 a_sheetVertices;
attribute float a_objInd;

varying vec3 v_objPos;
varying vec2 v_sheetPos;
varying float v_objInd;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    v_objPos = position;
    v_sheetPos = a_sheetVertices;
    v_objInd = a_objInd;
}
`;

const fSrc = `
#define MAXNUM ${MAXNUM}
#define LIGHT_SCALAR 400.0
#define DISTANCE_EXP 1.5

varying vec3 v_objPos;
varying vec2 v_sheetPos;
varying float v_objInd;

uniform vec3 u_dims;
uniform vec4 u_ambientLight;

uniform sampler2D u_textureSheet;
uniform sampler2D u_bumpSheet;
uniform vec2 u_sheetDims;

uniform vec3 u_objPos[MAXNUM];
uniform vec2 u_objSheetPos[MAXNUM];
uniform vec3 u_objNormals[MAXNUM];
uniform vec3 u_objDims[MAXNUM];

uniform vec4 u_lightColors[MAXNUM];
uniform vec3 u_lightPos[MAXNUM];

vec3 bumpToNormal(vec3 bump) {
    vec3 normal = vec3(0.0);

    if (bump.x < 95.0 / 255.0) {
        normal.x = -1.0;
    } else if (bump.x < 159.0 / 255.0) {
        normal.x = 0.0;
    } else if (bump.x < 223.0 / 255.0) {
        normal.x = 1.0;
    } else {
        normal.x = 2.0;
    }

    if (bump.y < 95.0 / 255.0) {
        normal.y = 1.0;
    } else if (bump.y < 159.0 / 255.0) {
        normal.y = 0.0;
    } else if (bump.y < 223.0 / 255.0) {
        normal.y = -1.0;
    } else {
        normal.y = 2.0;
    }

    if (bump.z < 95.0 / 255.0) {
        normal.z = -1.0;
    } else if (bump.z < 159.0 / 255.0) {
        normal.z = 0.0;
    } else if (bump.z < 223.0 / 255.0) {
        normal.z = 1.0;
    } else {
        normal.z = 2.0;
    }

    return normal;
}

float computeNormalScalarProduct(vec3 vector1, vec3 vector2, float norm2) {
    float SP = 0.0;
    float norm1 = 0.0;

    if (vector1.x != 2.0) {
        if (vector1.y != 2.0) {
            if (vector1.z != 2.0) {
                norm1 = length(vector1);
                if (norm1 > 0.0) {
                    SP = dot(vector1, vector2);
                    SP /= norm1 * norm2;
                }
            } else {
                norm1 = length(vec3(vector1.xy, 1.0));
                if (norm1 > 0.0) {
                    SP = dot(vector1.xy, vector2.xy) + abs(vector2.z);
                    SP /= norm1 * norm2;
                }
            }
        } else {
            if (vector1.z != 2.0) {
                norm1 = length(vec3(vector1.xz, 1.0));
                if (norm1 > 0.0) {
                    SP = dot(vector1.xz, vector2.xz) + abs(vector2.y);
                    SP /= norm1 * norm2;
                }
            } else {
                norm1 = length(vec3(vector1.x, 1.0, 1.0));
                if (norm1 > 0.0) {
                    SP = vector1.x * vector2.x + abs(vector2.y) + abs(vector2.z);
                    SP /= norm1 * norm2;
                }
            }
        }
    } else {
        if (vector1.y != 2.0) {
            if (vector1.z != 2.0) {
                norm1 = length(vec3(vector1.yz, 1.0));
                if (norm1 > 0.0) {
                    SP = dot(vector1.yz, vector2.yz) + abs(vector2.x);
                    SP /= norm1 * norm2;
                }
            } else {
                norm1 = length(vec3(vector1.y, 1.0, 1.0));
                if (norm1 > 0.0) {
                    SP = vector1.y * vector2.y + abs(vector2.x) + abs(vector2.z);
                    SP /= norm1 * norm2;
                }
            }
        } else {
            if (vector1.z != 2.0) {
                norm1 = length(vec3(vector1.z, 1.0, 1.0));
                if (norm1 > 0.0) {
                    SP = vector1.z * vector2.z + abs(vector2.x) + abs(vector2.y);
                    SP /= norm1 * norm2;
                }
            } else {
                SP = 1.0;
            }
        }
    }

    return SP;
}

bool hitBox(vec3 projectedPos, vec3 objDims, vec3 objNormal) {
    if (dot(-objNormal, projectedPos) > dot(-objNormal, vec3(0.0)) + 0.00001) {
        return false;
    }
    if (dot(objNormal, projectedPos) > dot(objNormal, vec3(0.0, 0.0, objDims.z))) {
        return false;
    }

    float alpha = asin(objNormal.x);
    float beta = acos(objNormal.z / cos(alpha));

    vec3 upNormal = vec3(0, cos(alpha), sin(alpha));

    if (dot(upNormal, projectedPos) >  dot(upNormal, vec3(0.0, objDims.y, 0.0))) {
        return false;
    }
    if (dot(-upNormal, projectedPos) > dot(-upNormal, vec3(0.0))) {
        return false;
    }

    vec3 sideNormal = vec3(cos(beta), sin(alpha) * sin(beta), -cos(alpha) * sin(beta));

    if (dot(-sideNormal, projectedPos) >  dot(-sideNormal, vec3(0.0))) {
        return false;
    }

    return dot(sideNormal, projectedPos) <= dot(sideNormal, vec3(objDims.x, 0.0, 0.0));
}

void main() {
    vec2 texelCoords = vec2(v_sheetPos.x / u_sheetDims.x, 1.0 - v_sheetPos.y / u_sheetDims.y);
    vec4 texel = texture2D(u_textureSheet, texelCoords);

    if (texel.a > 0.0) {
        vec4 bump = texture2D(u_bumpSheet, texelCoords);
        vec3 normal = bumpToNormal(bump.xyz);

        float norm = 1.0;
        vec3 RGB = vec3(0.0);

        // lights
        for (int i = 0; i < MAXNUM; i++) {
            vec3 lightPos = u_lightPos[i];
            vec3 ray = lightPos - v_objPos;
            vec3 restLight = u_lightColors[i].rgb;

            // occlusion
            for (int j = 0; j < MAXNUM; j++) {
                if (float(j) != v_objInd) {
                    if (restLight != vec3(0.0)) {
                        vec3 occluderPos = u_objPos[j];
                        vec3 occluderNormal = u_objNormals[j];
                        float dotNormalRay = dot(occluderNormal, ray);
                        
                        if (dotNormalRay != 0.0) {
                            float lambda = dot(occluderNormal, occluderPos - v_objPos) / dotNormalRay;
            
                            if (lambda > 0.0 && lambda < 1.0) {
                                vec3 occluderDims = u_objDims[j];
                                vec3 projectedPos = v_objPos + lambda * ray - occluderPos;
            
                                if (hitBox(projectedPos, occluderDims, occluderNormal)) {
                                    vec4 occluderTexel = texture2D(u_textureSheet, vec2((projectedPos.x + u_objSheetPos[j].x) / u_sheetDims.x, 1.0 - (occluderDims.y - projectedPos.y + u_objSheetPos[j].y) / u_sheetDims.y));
                                    
                                    if (occluderTexel.a > 0.0) {
                                        restLight *= occluderTexel.rgb * (1.0 - occluderTexel.a);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (restLight != vec3(0.0)) {
                float rayNorm = length(ray);
                float brightness = 0.0;

                if (rayNorm > 0.0) {
                    float SP = computeNormalScalarProduct(normal, ray, rayNorm);
                    
                    if (SP > 0.0) {
                        brightness = u_lightColors[i].a * SP * pow(LIGHT_SCALAR / rayNorm, DISTANCE_EXP);
                    }
                }

                RGB += brightness * restLight / 255.0;
            }
        }

        vec3 over = vec3(max(vec3(0.0), RGB - vec3(1.0)));
        gl_FragColor = vec4(texel.rgb * max(min(vec3(1.0), RGB), u_ambientLight.rgb * u_ambientLight.a) + 0.1 * over, texel.a);
    }
}
`;

let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;
let VIEW_ANGLE = 45, ASPECT = WIDTH / HEIGHT, NEAR = 1, FAR = 1000;

let renderer = new THREE.WebGLRenderer();
let camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
let scene = new THREE.Scene();

renderer.setSize(WIDTH, HEIGHT);
document.body.appendChild(renderer.domElement);
scene.add(camera);

window.onresize = function resize() {
    WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;
    ASPECT = WIDTH / HEIGHT;
    camera.aspect = ASPECT;
    camera.updateProjectionMatrix();
    renderer.setSize(WIDTH, HEIGHT);
}

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
    switch (event.keyCode) {
        case 37:
            getSprite(3).move(-5,0,0);
            break;
        case 38:
            getSprite(3).move(0,0,-5);
            break;
        case 39:
            getSprite(3).move(5,0,0);
            break;
        case 40:
            getSprite(3).move(0,0,5);
            break;
        case 122:
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

let textureSheet = new THREE.TextureLoader().load("assets/textureSheet.png");
textureSheet.magFilter = THREE.NearestFilter;
textureSheet.minFilter = THREE.NearestFilter;
let bumpSheet = new THREE.TextureLoader().load("assets/bumpSheet.png");
bumpSheet.magFilter = THREE.NearestFilter;
bumpSheet.minFilter = THREE.NearestFilter;

let uniforms = {
    u_dimensions: { type: 'vec3', value: new Float32Array([1.0, 1.0, 0.0]) },
    u_ambientLight: { type: 'vec4', value: new Float32Array([1.0, 1.0, 1.0, 0.2])},
    u_textureSheet: { type: 'sampler2D', value: textureSheet },
    u_bumpSheet: { type: 'sampler2D', value: bumpSheet },
    u_sheetDims: { type: 'vec2', value: new Float32Array([128, 64]) },
    u_objPos: { type: 'vec3', value: new Float32Array(MAXNUM*3) },
    u_objSheetPos: { type: 'vec2', value: new Float32Array(MAXNUM*2) },
    u_objNormals: { type: 'vec3', value: new Float32Array(MAXNUM*3) },
    u_objDims: { type: 'vec3', value: new Float32Array(MAXNUM*3) },
    u_lightColors: { type: 'vec4', value: new Float32Array(MAXNUM*4) },
    u_lightPos: { type: 'vec3', value: new Float32Array(MAXNUM*3) }
};

let shaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader:   vSrc,
    fragmentShader: fSrc,
});

const sprites = [];
const lights = [];

function createSprite(dims, sheetCoordX, numAnimationsFrames) {
    const ind = sprites.length;
    if (ind == MAXNUM) {
        return null;
    }
    let vertices = [
              0,       0, 0,
        dims[0],       0, 0,
              0, dims[1], 0,
        dims[0],       0, 0,
        dims[0], dims[1], 0,
              0, dims[1], 0,
    ];
    let sheetVertices = [
                  sheetCoordX, dims[1] + 0, //down left
        dims[0] + sheetCoordX, dims[1] + 0, //down right
                  sheetCoordX,           0, //up left
        dims[0] + sheetCoordX, dims[1] + 0, //down right
        dims[0] + sheetCoordX,           0, //up right
                  sheetCoordX,           0, //up left
    ];
    let indices = [];
    for (let j = 0; j < 6; j++) {
        indices.push(ind);
    }

    let geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.addAttribute('a_sheetVertices', new THREE.BufferAttribute(new Float32Array(sheetVertices), 2));
    geometry.addAttribute('a_objInd', new THREE.BufferAttribute(new Float32Array(indices), 1));

    let sprite = {
        index: ind,
        x: 0,
        y: 0,
        z: 0,
        width: dims[0],
        height: dims[1],
        animationFrame: 0,
        numAnimationsFrames: numAnimationsFrames,
        mesh: new THREE.Mesh(geometry, shaderMaterial),
        move: function(dx, dy, dz) {
            this.mesh.geometry.attributes.position.needsUpdate = true;
            for (let i = 0; i < 18; i++) {
                this.mesh.geometry.attributes.position.array[i] += i % 3 == 0 ? dx : (i % 3 == 1 ? dy : dz);
            }
            this.x += dx;
            this.y += dy;
            this.z += dz;
            uniforms.u_objPos.value[this.index * 3] += dx;
            uniforms.u_objPos.value[this.index * 3 + 1] += dy;
            uniforms.u_objPos.value[this.index * 3 + 2] += dz;
        },
        set: function(x, y, z) {
            const values = [
                          x,           y, z,
                dims[0] + x,           y, z,
                          x, dims[1] + y, z,
                dims[0] + x,           y, z,
                dims[0] + x, dims[1] + y, z,
                          x, dims[1] + y, z,
            ];
            this.mesh.geometry.attributes.position.needsUpdate = true;
            for (let i = 0; i < 18; i++) {
                this.mesh.geometry.attributes.position.array[i] = values[i];
            }
            this.x = x;
            this.y = y;
            this.z = z;
            uniforms.u_objPos.value[this.index * 3] = x;
            uniforms.u_objPos.value[this.index * 3 + 1] = y;
            uniforms.u_objPos.value[this.index * 3 + 2] = z;
        },
        animationStep: function() {
            if (++this.animationFrame >= this.numAnimationsFrames) {
                this.animationFrame = 0;
            }
            const sheetCoordY = this.animationFrame * (this.height + 1);
            let values = [
                dims[1] + sheetCoordY,
                dims[1] + sheetCoordY,
                          sheetCoordY,
                dims[1] + sheetCoordY,
                          sheetCoordY,
                          sheetCoordY,
            ];
            this.mesh.geometry.attributes.a_sheetVertices.needsUpdate = true;
            for (let i = 0; i < 6; i++) {
                this.mesh.geometry.attributes.a_sheetVertices.array[i*2 + 1] = values[i];
            }
            uniforms.u_objSheetPos.value[ind * 2 + 1] = sheetCoordY;
        }
    };

    sprite.mesh.material.depthWrite = false;
    sprite.mesh.material.transparent = true;
    scene.add(sprite.mesh);

    sprites.push(sprite);

    sprite.set(0, 0, 0);
    uniforms.u_objSheetPos.value[ind * 2] = sheetCoordX;
    uniforms.u_objSheetPos.value[ind * 2 + 1] = 0;
    for (let i = 0; i < 3; i++) {
        uniforms.u_objNormals.value[ind * 3 + i] = i < 2 ? 0 : 1;
        uniforms.u_objDims.value[ind * 3 + i] = i < 2 ? dims[i] : 10;
    }

    return sprite;
}

function createLight(color, pos) {
    const ind = lights.length;
    if (ind == MAXNUM) {
        return null;
    }
    
    for (let i = 0; i < 4; i++) {
        uniforms.u_lightColors.value[ind * 4 + i] = color[i];
        if (i < 3) {
            uniforms.u_lightPos.value[ind * 3 + i] = pos[i];
        }
    }

    let light = {
        index: ind,
        color: color,
        pos: pos,
        set: function(x, y, z) {
            this.pos[0] = x;
            this.pos[1] = y;
            this.pos[2] = z;
            uniforms.u_lightPos.value[this.index * 3] = x;
            uniforms.u_lightPos.value[this.index * 3 + 1] = y;
            uniforms.u_lightPos.value[this.index * 3 + 2] = z;
        },
    };

    lights.push(light);
    return light;
}

function getSprite(index) {
    for (let sprite of sprites) {
        if (sprite.index == index) {
            return sprite;
        }
    }
    return null;
}

function createPlayerSprite() {
    return createSprite([22, 57], 0, 1);
}

/**
 * tests
 */

function createTestSprite() {
    return createSprite([50, 50], 23, 1);
}

createLight([1, 1, 1, 20], [0, 0, 15]);
createLight([1, 1, 1, 20], [-150, 0, -20]);
//createLight([1, 1, 1, 20], [-100, 0, 10]);
//createLight([1, 1, 1, 20], [-100, 0, -40]);
createTestSprite();
createSprite([24, 12], 86, 2);
getSprite(1).set(-10,0,-10);
createSprite([16, 12], 111, 1);

for (let i = 0; i < 2; i++) {
    createPlayerSprite();
}

getSprite(2).set(-10, 0, 10);
getSprite(3).set(-10, 0, -15);

function clientTo3D(x, y, z3D) {
    var vec = new THREE.Vector3();
    var pos = new THREE.Vector3();

    vec.set(
        (x / WIDTH) * 2 - 1,
        -(y / HEIGHT) * 2 + 1,
        0.5
    );

    vec.unproject(camera);
    vec.sub(camera.position).normalize();
    var distance = -camera.position.z / vec.z;

    pos.copy(camera.position).add(vec.multiplyScalar(distance));
    pos.z = z3D;

    return pos;
}

let mouse = { x: 0, y: 0, dx: 0, dy: 0 };

document.addEventListener("mousedown", event => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    let mouse3D = clientTo3D(mouse.x, mouse.y, 0);

    for (let sprite of sprites) {
        if (mouse3D.x >= sprite.x && mouse3D.y >= sprite.y && mouse3D.x < sprite.x + sprite.width && mouse3D.y < sprite.y + sprite.height) {
            mouse.dx = mouse3D.x - sprite.x;
            mouse.dy = mouse3D.y - sprite.y;
            sprite.drag = true;
            break;
        }
    }
});
document.addEventListener("mousemove", event => {
    let pos = clientTo3D(event.clientX, event.clientY, 0);

    for (let sprite of sprites) {
        if (sprite.drag) {
            sprite.set(pos.x - mouse.dx, pos.y - mouse.dy, sprite.z);
            break;
        }
    }
});
document.addEventListener("mouseup", _ => {
    for (let sprite of sprites) {
        if (sprite.drag) {
            sprite.drag = false;
            break;
        }
    }
});

camera.position.y = 100;
camera.position.z = 300;
camera.lookAt(new THREE.Vector3(0,0,0));

let count = 0;

function animate() {
    requestAnimationFrame(animate);

    count++;
    
    if (count == 5) {
        getSprite(1).animationStep();
        count = 0;
    }

    sprites.sort((s1, s2) => s1.z - s2.z);
    for (let i = 0; i < sprites.length; i++) {
        sprites[i].mesh.renderOrder = i;
    }
    
    //camera.position.x = -300 * Math.sin(Date.now()/1000);
    //camera.position.z = -300 * Math.cos(Date.now()/1000);
    //camera.lookAt(new THREE.Vector3(0,0,0));

	renderer.render(scene, camera);
}
animate();
