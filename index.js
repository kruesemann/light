const SUPERPIXEL_SIZE = 3;
const OVERLAP_PADDING = 40; // Needed for fast moving objects, as they tend to cause shadow artifacts. 40 should be sufficient for a maximum movement speed of 100px/tick.
const BASE_LIGHT_BRIGHTNESS = 0.15;

const BALL_RADIUS = 20;
const BALL_HEIGHT = 1;
const BALL_COLOR = "0x994411";

const CHAR_DEPTH = 5;

const DISTANCE_BRIGHTNESS_FACTOR = -0.002;
const LIGHT_OVERLOAD = 0.5;

const lights = [
    { x: 250, y: 250, z: 0, radius: 5, color: "0xff0000", intensity: 2 },
    { x: 375, y: 125, z: 0, radius: 5, color: "0x00ff00", intensity: 2 },
    { x: 125, y: 375, z: 0, radius: 5, color: "0x0000ff", intensity: 2 },
    { x: 500, y: 500, z: 45, radius: 5, color: "0xffffff", intensity: 2 },
    { x: 700, y: 250, z: 45, radius: 5, color: "0xd200ff", intensity: 2 },
    { x: 700, y: 700, z: 0, radius: 5, color: "0xffffff", intensity: 2 },
    { x: 1000, y: 700, z: 0, radius: 5, color: "0xffffff", intensity: 2 }
];

const objects = [];
const updateQueue = [];

let counter = 1;

function gameloop(delta) {
    /*if(charContainer.x >= width) {
        charContainer.x = counter++;
        console.log(counter);
    }
    else charContainer.x += 100;
    onObjectUpdate(charContainer);*/
    while (updateQueue.length > 0) updateContainer(updateQueue.shift());
}

PIXI.settings.RESOLUTION = window.devicePixelRatio;
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

const width = window.innerWidth;
const height = window.innerHeight;
const depth = 100;
APPLICATION = new PIXI.Application({
    width,
    height,
    autoResize: true,
    backgroundColor: 0x000000
});

window.onresize = function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    APPLICATION.renderer.resize(width, height);
}

document.body.appendChild(APPLICATION.view);
APPLICATION.ticker.add(gameloop);

const objectLayer = new PIXI.Container();
APPLICATION.stage.addChild(objectLayer);

let clickX = 0;
let clickY = 0;

/*const size = 2 * SUPERPIXEL_SIZE * BALL_RADIUS + SUPERPIXEL_SIZE;
const ballTexture = PIXI.RenderTexture.create(size, size);
const ballSprite = new PIXI.Sprite(ballTexture);
objectLayer.addChild(ballSprite);

ballSprite.x = 250;
ballSprite.y = 250;
ballSprite.z = BALL_HEIGHT;
ballSprite.radius = BALL_RADIUS;
ballSprite.color = BALL_COLOR;
ballSprite.interactive = true;
ballSprite.drag = false;
ballSprite.hitArea = new PIXI.Circle(p2spc(BALL_RADIUS), p2spc(BALL_RADIUS), p2sp(BALL_RADIUS));*/

for (let light of lights) {
    light.reach = Math.round(-100 / DISTANCE_BRIGHTNESS_FACTOR + p2sp(light.radius));
    const lightSprite = PIXI.Sprite.fromImage("assets/light.png");
    lightSprite.x = light.x;
    lightSprite.y = light.y
    lightSprite.z = light.z;
    lightSprite.tint = light.color;
    objectLayer.addChild(lightSprite);
}

/*ballSprite.on("mousedown", event => {
    clickX = event.data.global.x - ballSprite.x;
    clickY = event.data.global.y - ballSprite.y;
    ballSprite.drag = true;
});

function genCirclePixels(radius) {
    const layers = [];
    for (let x = 0; x <= 2 * radius; x++) {
        for (let y = 0; y <= 2 * radius; y++) {
            const z = Math.floor(Math.sqrt(Math.abs(Math.pow(x - radius, 2) + Math.pow(y - radius, 2))));
            if (z <= radius) layers.push([x, y, Math.floor(Math.sqrt(Math.pow(radius, 2) - Math.pow(z, 2)))]);
        }
    }
    return layers;
}

ballSprite.layers = genCirclePixels(BALL_RADIUS);*/

function createSpriteContainer(imageName, width, height) {
    const container = new PIXI.Container();
    container.w = width;
    container.h = height;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    const colorTexture = PIXI.RenderTexture.fromImage("assets/" + imageName + ".png");
    canvas.width = width;
    canvas.height = height;
    try {
        context.drawImage(colorTexture.baseTexture.source, 0, 0, width, height, 0, 0, width, height);
    }
    catch (_) {
        throw "Texture file not found";
    }
    const colorData = context.getImageData(0, 0, width, height).data;

    const depthTexture = PIXI.RenderTexture.fromImage("assets/" + imageName + "_depths.png");
    try {
        context.drawImage(depthTexture.baseTexture.source, 0, 0, width, height, 0, 0, width, height);
    } catch (_) {
        throw "Depth texture file not found";
    }
    const depthData = context.getImageData(0, 0, width, height).data;

    container.occupancyGrid = [];
    container.occluders = [];

    for (let n = 0; n < lights.length; n++) container.occluders.push([]);

    for (let i = 0; i < colorData.length; i += 4) {
        if (colorData[i + 3] == 0) {
            container.occupancyGrid.push(0);
            continue;
        }
        container.occupancyGrid.push(1);

        const superPixelTexture = new PIXI.Graphics();
        superPixelTexture.beginFill(0xffffff);
        superPixelTexture.drawRect(0, 0, SUPERPIXEL_SIZE, SUPERPIXEL_SIZE);
        superPixelTexture.endFill();

        const superPixel = new PIXI.Sprite(APPLICATION.renderer.generateTexture(superPixelTexture));
        superPixel.baseColor = rgb2html([colorData[i], colorData[i + 1], colorData[i + 2]]);
        superPixel.x = (Math.floor(i / 4) % width) * SUPERPIXEL_SIZE;
        superPixel.y = Math.floor(Math.floor(i / 4) / width) * SUPERPIXEL_SIZE;
        superPixel.z = depthData[i] / 36;
        superPixel.normals = [[0, 0, 0]];

        switch (depthData[i + 1]) {
            case 0:
                superPixel.normals[0][1] = -1;
                break;
            case 36:
                superPixel.normals[0][1] = -1;
                superPixel.normals[0][2] = 1;
                break;
            case 72:
                superPixel.normals[0][2] = 1;
                break;
            case 108:
                superPixel.normals[0][1] = 1;
                superPixel.normals[0][2] = 1;
                break;
            case 144:
                superPixel.normals[0][1] = 1;
                break;
            case 252:
                superPixel.normals[0][1] = -1;
                superPixel.normals[0][2] = 1;
                superPixel.normals.push([0, -1, -1]);
                break;
            default:
                console.log(depthData[i + 1]);
                throw "Unexpected value in depth texture!";
        }
        switch (depthData[i + 2]) {
            case 0:
                superPixel.normals[0][0] = -1;
                break;
            case 36:
                superPixel.normals[0][0] = -1;
                superPixel.normals[0][2] = 1;
                break;
            case 72:
                superPixel.normals[0][2] = 1;
                break;
            case 108:
                superPixel.normals[0][0] = 1;
                superPixel.normals[0][2] = 1;
                break;
            case 144:
                superPixel.normals[0][0] = 1;
                break;
            case 252:
                if (superPixel.normals.length == 1) {
                    superPixel.normals[0][0] = -1;
                    superPixel.normals[0][2] = 1;
                } else {
                    superPixel.normals.push([-1, 0, 1]);
                }
                superPixel.normals.push([-1, 0, -1]);
                break;
            default:
                console.log(depthData[i + 2]);
                throw "Unexpected value in depth texture!";
        }

        const norm = Math.sqrt(metric(superPixel.normals[0][0], superPixel.normals[0][1], superPixel.normals[0][2], 0, 0, 0));

        for (let normal of superPixel.normals) {
            normal[0] /= norm;
            normal[1] /= norm;
            normal[2] /= norm;
        }

        container.addChild(superPixel);
    }

    objectLayer.addChild(container);
    objects.push(container);

    return container;
}

const charContainer = createSpriteContainer("char01", 22, 57);
charContainer.x = 400;
charContainer.y = 400;
charContainer.z = CHAR_DEPTH;
charContainer.scale.x = charContainer.scale.y = 1 + charContainer.z / depth;
charContainer.interactive = true;
charContainer.drag = false;
charContainer.hitArea = new PIXI.Rectangle(0, 0, p2sp(22), p2sp(57));
charContainer.on("mousedown", event => {
    clickX = event.data.global.x - charContainer.x;
    clickY = event.data.global.y - charContainer.y;
    charContainer.drag = true;
});

const test = createSpriteContainer("char01", 22, 57);
test.x = 470;
test.y = 420;
test.z = 20;
test.scale.x = test.scale.y = 1 + test.z / depth;
test.interactive = true;
test.drag = false;
test.hitArea = new PIXI.Rectangle(0, 0, p2sp(22), p2sp(57));
test.on("mousedown", event => {
    clickX = event.data.global.x - test.x;
    clickY = event.data.global.y - test.y;
    test.drag = true;
});

const test2 = createSpriteContainer("test", 50, 50);
test2.x = 375;
test2.y = 375;
test2.z = 1;
test2.scale.x = test2.scale.y = 1 + test2.z / depth;

document.addEventListener("mousemove", event => {
    /*if (ballSprite.drag) {
        ballSprite.x = event.clientX - clickX;
        ballSprite.y = event.clientY - clickY;
        getOcclusions();
        updateBall();
    }*/
    if (charContainer.drag) {
        if (ctrlKey) {
            charContainer.z = Math.max(0, Math.min(depth - 1, charContainer.z + (event.clientY - clickY - charContainer.y) / 10));
            charContainer.scale.x = charContainer.scale.y = 1 + charContainer.z / depth;
        } else {
            charContainer.x = event.clientX - clickX;
            charContainer.y = event.clientY - clickY;
        }
        //getOcclusions();
        //updateObjects();
        onObjectUpdate(charContainer);
    }
    if (test.drag) {
        if (ctrlKey) {
            test.z = Math.max(0, Math.min(depth - 1, test.z + (event.clientY - clickY - test.y) / 10));
            test.scale.x = test.scale.y = 1 + test.z / depth;
        } else {
            test.x = event.clientX - clickX;
            test.y = event.clientY - clickY;
        }
        //getOcclusions();
        //updateObjects();
        onObjectUpdate(test);
    }
});

document.addEventListener("mouseup", _ => {
    //ballSprite.drag = false;
    charContainer.drag = false;
    test.drag = false;
});

let ctrlKey = false;

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
    } else if (event.keyCode == 17) {
        ctrlKey = true;
    }
});

window.addEventListener("keyup", event => {
    if (event.keyCode == 17) {
        ctrlKey = false;
    }
});

function html2rgb(htmlColor) {
    return [
        parseInt(htmlColor.substr(2, 2), 16),
        parseInt(htmlColor.substr(4, 2), 16),
        parseInt(htmlColor.substr(6, 2), 16)
    ];
}

function dec2hex(dec) {
    let hex = dec.toString(16);
    while (hex.length < 2) {
        hex = "0" + hex;
    }
    return hex;
}

function rgb2html(rgbColor) {
    return "0x" + dec2hex(rgbColor[0]) + dec2hex(rgbColor[1]) + dec2hex(rgbColor[2]);
}

function metric(x1, y1, z1, x2, y2, z2) {
    return Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2);
}

function p2spc(pix) {
    return SUPERPIXEL_SIZE * pix + Math.floor(SUPERPIXEL_SIZE / 2);
}

function p2sp(pix) {
    return SUPERPIXEL_SIZE * pix;
}

function sp2p(superPixel) {
    return Math.floor(superPixel / SUPERPIXEL_SIZE);
}
/*
const occlusionMap = [];

function initOcclussionMap() {
    for (let i = 0; i < objects.length; i++) {
        const row = [];
        for (let n = 0; n < lights.length; n++) {
            row.push(0);
        }
        occlusionMap.push(row);
    }
}*/

function overlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    if (x1 < x2) {
        if (y1 < y2) {
            return x2 < x1 + w1 && y2 < y1 + h1;
        } else {
            return x2 < x1 + w1 && y1 < y2 + h2;
        }
    } else {
        if (y1 < y2) {
            return x1 < x2 + w2 && y2 < y1 + h1;
        } else {
            return x1 < x2 + w2 && y1 < y2 + h2;
        }
    }
}

function getOcclusions() {
    for (let i = 0; i < objects.length; i++) {
        const o1 = objects[i];

        for (let n = 0; n < lights.length; n++) {
            const l = lights[n];
            o1.occluders[n] = [];

            for (let j = 0; j < objects.length; j++) {
                if (i == j) continue;

                const o2 = objects[j];
                const lambda = p2sp(o2.z - o1.z) / p2sp(l.z - o1.z);

                if (lambda < 0 || lambda > 1) continue;
                const x = o1.x + lambda * (l.x - o1.x);
                const w = o1.x + o1.width + lambda * (l.x - o1.x - o1.width) - x;
                const y = o1.y + lambda * (l.y - o1.y);
                const h = o1.y + o1.height + lambda * (l.y - o1.y - o1.height) - y;

                if (overlap(
                    x - OVERLAP_PADDING,
                    y - OVERLAP_PADDING,
                    w + 2 * OVERLAP_PADDING,
                    h + 2 * OVERLAP_PADDING,
                    o2.x - OVERLAP_PADDING,
                    o2.y - OVERLAP_PADDING,
                    o2.width + 2 * OVERLAP_PADDING,
                    o2.height + 2 * OVERLAP_PADDING
                )) {
                    o1.occluders[n].push(j);
                    //o2.occluded.push(i);
                    updateQueue.push(o1);
                }
            }
        }
    }
}

function getColor(absPoint, normals, radius, center, baseColor, object) {
    let [r, g, b] = [0, 0, 0];
    for (let n = 0; n < lights.length; n++) {
        const light = lights[n];

        const dist = Math.max(0, metric(
            absPoint[0],
            absPoint[1],
            absPoint[2],
            light.x,
            light.y,
            p2spc(light.z)
        ));
        if (light.reach < dist) continue;

        if (object.occluders[n].length > 0) {
            let occluded = false;
            for (let index of object.occluders[n]) {
                const occluder = objects[index];

                const lambda = p2sp(occluder.z - object.z) / p2sp(light.z - object.z);
                //const lambda = (p2spc(occluder.z) - absPoint[2]) / (p2spc(light.z) - absPoint[2]);
                const x = sp2p(Math.floor(absPoint[0] + lambda * (light.x - absPoint[0]) - occluder.x));
                const y = sp2p(Math.floor(absPoint[1] + lambda * (light.y - absPoint[1]) - occluder.y));
                if (
                    x >= 0 &&
                    x < occluder.w &&
                    y >= 0 &&
                    y < occluder.h &&
                    occluder.occupancyGrid[y * occluder.w + x] == 1
                ) {
                    occluded = true;
                    break;
                }
            }
            if (occluded) continue;
        }
        /*if (occlusionMap[objectIndex][n].length > 0) {
            let occluded = false;
            for (let index of occlusionMap[objectIndex][n]) {
                const occluder = objects[index];

                const lambda = p2sp(occluder.z - objects[objectIndex].z) / p2sp(light.z - objects[objectIndex].z);
                //const lambda = (p2spc(occluder.z) - absPoint[2]) / (p2spc(light.z) - absPoint[2]);
                const x = sp2p(Math.floor(absPoint[0] + lambda * (light.x - absPoint[0]) - occluder.x));
                const y = sp2p(Math.floor(absPoint[1] + lambda * (light.y - absPoint[1]) - occluder.y));
                if (x >= 0 &&
                    x < occluder.w &&
                    y >= 0 &&
                    y < occluder.h &&
                    occluder.occupancyGrid[y * occluder.w + x] == 1) {
                    occluded = true;
                    break;
                }
            }
            if (occluded) continue;
        }*/

        let lX = light.x - center[0];
        let lY = light.y - center[1];
        let lZ = p2spc(light.z) - center[2];
        let sPmax = 0;

        for (let normal of normals) {
            const sP = normal[0] * lX + normal[1] * lY + normal[2] * lZ;
            sPmax = sPmax < sP ? sP : sPmax;
        }
        if (sPmax < radius) continue;

        const rDash = sPmax - radius;
        const intensity = Math.sqrt(rDash / Math.sqrt(dist));
        const brightness = Math.max(0, DISTANCE_BRIGHTNESS_FACTOR * (dist - p2sp(light.radius)) + 100) * intensity;

        const rgbLightColor = html2rgb(light.color);
        r += rgbLightColor[0] * brightness * light.intensity / 100;
        g += rgbLightColor[1] * brightness * light.intensity / 100;
        b += rgbLightColor[2] * brightness * light.intensity / 100;
    }

    let overR = Math.max(0, r - 255);
    let overG = Math.max(0, g - 255);
    let overB = Math.max(0, b - 255);
    r += LIGHT_OVERLOAD * (overG + overB);
    g += LIGHT_OVERLOAD * (overR + overB);
    b += LIGHT_OVERLOAD * (overR + overG);

    let rgbBaseColor = html2rgb(baseColor);

    return rgb2html([
        Math.max(Math.min(255, Math.round(rgbBaseColor[0] / 255 * r)), Math.round(rgbBaseColor[0] * BASE_LIGHT_BRIGHTNESS)),
        Math.max(Math.min(255, Math.round(rgbBaseColor[1] / 255 * g)), Math.round(rgbBaseColor[1] * BASE_LIGHT_BRIGHTNESS)),
        Math.max(Math.min(255, Math.round(rgbBaseColor[2] / 255 * b)), Math.round(rgbBaseColor[2] * BASE_LIGHT_BRIGHTNESS)),
    ]);
}

/*function updateBall() {
    const ball = new PIXI.Graphics();
    for (let point of ballSprite.layers) {
        let nX = p2spc(point[0] - ballSprite.radius);
        let nY = p2spc(point[1] - ballSprite.radius);
        let nZ = p2spc(point[2]);
        const norm = Math.sqrt(metric(nX, nY, nZ, 0, 0, 0));
        nX /= norm;
        nY /= norm;
        nZ /= norm;

        const color = getColor(
            [p2spc(point[0]) + ballSprite.x,
            p2spc(point[1]) + ballSprite.y,
            p2spc(point[2] + ballSprite.z)],
            [[nX, nY, nZ]],
            norm,
            [(ballSprite.x + p2spc(ballSprite.radius)),
            (ballSprite.y + p2spc(ballSprite.radius)),
            p2spc(ballSprite.z + ballSprite.radius)],
            ballSprite.color
        );
        ball.beginFill(color);
        ball.drawRect(p2sp(point[0]), p2sp(point[1]), SUPERPIXEL_SIZE, SUPERPIXEL_SIZE);
        ball.endFill();
    }
    APPLICATION.renderer.clearBeforeRender = false;
    APPLICATION.renderer.render(ball, ballTexture);
    APPLICATION.renderer.clearBeforeRender = true;
}*/

function updateContainer(container) {
    for (let superPixel of container.children) {
        const centerX = container.x + superPixel.x - p2spc(superPixel.normals[0][0]);
        const centerY = container.y + superPixel.y - p2spc(superPixel.normals[0][1]);
        const centerZ = p2spc(container.z + superPixel.z - superPixel.normals[0][2]);
        const color = getColor(
            [
                container.x + superPixel.x,
                container.y + superPixel.y,
                p2spc(container.z + superPixel.z)
            ],
            superPixel.normals,
            1,
            [centerX, centerY, centerZ],
            superPixel.baseColor,
            container
        );
        superPixel.tint = color;
    }
}

function onObjectUpdate(object) {
    //object.occluded = [];
    getOcclusions();
    updateQueue.push(object);
    //updateContainer(object);
    //for (let occludedIndex of object.occluded) updateContainer(objects[occludedIndex]);
}

function updateObjects() {
    getOcclusions();
    for (let object of objects) updateContainer(object);
}

objectLayer.children.sort((c1, c2) => c1.z - c2.z);
//initOcclussionMap();
//getOcclusions();
//updateBall();
updateObjects();
