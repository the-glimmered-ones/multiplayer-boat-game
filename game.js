// shared/PacketTypes.ts
class ClientPacket {
  packetType = 0 /* NONE */;
  data;
  constructor(packetType, data) {
    this.packetType = packetType;
    this.data = data;
  }
}

// shared/Consts.ts
class PlayerLocation {
  position = [0, 0];
  angle = 0;
  velocity = 0;
  constructor(position, angle, velocity) {
    this.position = position;
    this.angle = angle;
    this.velocity = velocity;
  }
}

// client/src/game.ts
var ws;
var BABYLON = window.BABYLON;
var startWindow = window.parent;
var canvas = document.getElementById("renderCanvas");
console.log(canvas);
var engine = null;
var boatRoot;
var boatObj;
var camera;
var gameLoaded = false;
var joinedWithName;
function setJoinedWithName(value) {
  console.log("set true");
  joinedWithName = true;
  setInterval(queueClientAction, 15);
}
addEventListener("load", () => {});
var BOAT_Y_POSITION = 5;
var BOAT_SCALE = new BABYLON.Vector3(5, 5, 5);
var BOAT_STARTING_ROTATION = new BABYLON.Vector3(0, 4.712, 0);
function createWaterScene(engine2, canvas2) {
  var scene = new BABYLON.Scene(engine2);
  console.log("scene created");
  camera = new BABYLON.FollowCamera("Camera", new BABYLON.Vector3(0, 0, 0), scene);
  var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0.1), scene);
  light.diffuse = new BABYLON.Color3(1, 0.992, 0.867);
  light.intensity = 0.5;
  var skybox = BABYLON.CreateBox("skyBox", { size: 1000 }, scene);
  var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
  skyboxMaterial.backFaceCulling = false;
  skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/TropicalSunnyDay/", scene);
  skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
  skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
  skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
  skyboxMaterial.disableLighting = true;
  skybox.material = skyboxMaterial;
  var groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
  groundMaterial.diffuseTexture = new BABYLON.Texture("textures/ground.jpg", scene);
  groundMaterial.diffuseTexture.scale(4);
  var ground = BABYLON.CreateGround("ground", { width: 512, height: 512, subdivisions: 32 }, scene);
  ground.position.y = -1;
  ground.material = groundMaterial;
  var waterMesh = BABYLON.CreateGround("waterMesh", { width: 512, height: 512, subdivisions: 32 }, scene);
  var water = new WaterMaterial("water", scene);
  water.bumpTexture = new BABYLON.Texture("textures/waterbump.png", scene);
  water.windForce = 15;
  water.waveHeight = 0.6;
  water.windDirection = new BABYLON.Vector2(1, 1);
  water.waterColor = new BABYLON.Color3(0.11, 0.3, 0.75);
  water.colorBlendFactor = 0.8;
  water.bumpHeight = 0.1;
  water.waveLength = 0.6;
  water.addToRenderList(skybox);
  water.addToRenderList(ground);
  waterMesh.material = water;
  loadBoatMesh(scene);
  return scene;
}
var boatMesh;
var sceneMeshes;
var githubSrc = "https://github.com/the-glimmered-ones/multiplayer-boat-game/tree/318830bbfc462dc9976751e62f7494207e59bbba/textures/";
async function loadBoatMesh(scene) {
  sceneMeshes = await BABYLON.ImportMeshAsync(githubSrc + "boat-placeholder.obj", scene);
  for (let mesh of sceneMeshes.meshes) {
    if (mesh.name == "BOAT") {
      boatMesh = mesh;
      addBoat(boatMesh, new BABYLON.Vector3(0, BOAT_Y_POSITION, 0), BOAT_SCALE, BOAT_STARTING_ROTATION, camera);
    }
  }
}
function addBoat(mesh, pos, scale, rotation, camera2) {
  boatRoot = new BABYLON.TransformNode("boatTransform");
  var boatMat;
  boatObj = mesh;
  boatMat = new BABYLON.StandardMaterial("boatMat");
  boatMat.diffuseColor = new BABYLON.Color3(97 / 255, 38 / 255, 0);
  boatObj.material = boatMat;
  boatObj.parent = boatRoot;
  boatRoot.position = pos;
  boatRoot.scaling = scale;
  boatObj.rotation = rotation;
  if (camera2) {
    camera2.position = new BABYLON.Vector3(0, 30, -3);
    camera2.setTarget(new BABYLON.Vector3(0, -10, -3));
    camera2.fov = 1.1;
    camera2.parent = boatRoot;
  }
  console.log(boatRoot);
}
function addOtherBoat(player) {
  addBoat(boatMesh, new BABYLON.Vector3(player.position[0], BOAT_Y_POSITION, player.position[1]), BOAT_SCALE, new BABYLON.Vector3(0, player.angle, 0));
}
if (ws) {
  ws.addEventListener("open", async () => {
    if (!engine) {
      engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    }
    let createScene = createWaterScene;
    if (!createScene)
      throw new Error("No createScene() export found.");
    console.log("made here");
    const scene = await createWaterScene(engine, canvas);
    gameLoaded = true;
    engine.runRenderLoop(() => scene.render());
    addEventListener("resize", () => {
      if (engine) {
        engine.resize();
      }
    });
    scene.debugLayer.show();
    joinedWithName = false;
  });
}
var acceleration = 0.2;
var MAX_VELOCITY = 2;
var velocity = 0;
var rotSpeed = 0.087;
var moveNS = 0;
function moveBoat() {
  if (!gameLoaded || !joinedWithName) {
    return;
  }
  if (actionParams.length == 0) {
    return;
  }
  console.log("move boat");
  moveNS = 0;
  const inputWE = actionParams[0];
  const inputNS = actionParams[1];
  if (inputNS != "" || inputWE != "") {
    console.log("hasJoinedWithName " + joinedWithName);
    ws.send(JSON.stringify(new ClientPacket(2 /* PLAYER_POSITION_UPDATE */, new PlayerLocation([boatObj.absolutePosition.x, boatObj.absolutePosition.z], boatObj.rotation.y, velocity))));
  }
  if (inputNS != "") {
    if (inputNS == "N") {
      if (velocity > 0)
        velocity = 0;
      accelerate(false);
      moveNS = velocity;
    } else if (inputNS == "S") {
      if (velocity < 0)
        velocity = 0;
      accelerate(true);
      moveNS = velocity;
    }
    boatObj.locallyTranslate(new BABYLON.Vector3(moveNS, 0, 0));
    camera.position = new BABYLON.Vector3(boatObj.position.x, camera.position.y, boatObj.position.z - 3);
  }
  if (inputWE != "") {
    velocity = 0;
    if (inputWE == "W")
      boatObj.addRotation(0, -1 * rotSpeed, 0);
    else if (inputWE == "E")
      boatObj.addRotation(0, rotSpeed, 0);
  }
}
function accelerate(reversing) {
  if (reversing) {
    if (velocity < MAX_VELOCITY)
      velocity += acceleration;
    if (velocity > MAX_VELOCITY)
      velocity = MAX_VELOCITY;
    console.log("reversing velocity " + velocity);
  } else {
    if (velocity > MAX_VELOCITY * -1 && velocity <= 0)
      velocity -= acceleration;
    if (velocity < MAX_VELOCITY * -1)
      velocity = MAX_VELOCITY * -1;
  }
}
function decelerate(reversing) {
  if (reversing) {
    if (velocity < 0)
      velocity += acceleration;
    if (velocity > 0)
      velocity = 0;
  } else {
    if (velocity > 0)
      velocity -= acceleration;
    if (velocity < 0)
      velocity = 0;
  }
}
var pressedMoveKeys = [];
window.addEventListener("keydown", (event) => {
  const key = event.key;
  console.log(gameLoaded, joinedWithName);
  if (gameLoaded && joinedWithName) {
    actionParams = [];
    pressedMoveKeys.splice(0);
    if (key == "a" || pressedMoveKeys.includes(key)) {
      actionParams[0] = "W";
    } else if (key == "d" || pressedMoveKeys.includes(key)) {
      actionParams[0] = "E";
    } else {
      actionParams[0] = "";
    }
    if (key == "w" || pressedMoveKeys.includes(key)) {
      actionParams[1] = "N";
    } else if (key == "s" || pressedMoveKeys.includes(key)) {
      actionParams[1] = "S";
    } else {
      actionParams[1] = "";
    }
    currentAction = moveBoat;
    pressedMoveKeys.push(key);
  }
});
window.addEventListener("keyup", (event) => {
  const key = event.key;
  if (pressedMoveKeys.includes(key)) {
    pressedMoveKeys.splice(pressedMoveKeys.indexOf(key), 1);
  }
});
var currentAction = () => {};
var actionParams = [];
var delta;
async function queueClientAction() {
  if (gameLoaded) {
    delta = engine.getDeltaTime() / 1000;
    let moveKeysPressed = false;
    console.log("velocity " + velocity + " action params " + actionParams);
    if (velocity != 0) {
      if (pressedMoveKeys.includes("w") || pressedMoveKeys.includes("s") || pressedMoveKeys.includes("d") || pressedMoveKeys.includes("a")) {
        moveKeysPressed = true;
        console.log("move keys pressed " + pressedMoveKeys);
      }
      if (!moveKeysPressed) {
        console.log("decelerate");
        decelerate(velocity < 0 ? true : false);
        boatObj.locallyTranslate(new BABYLON.Vector3(velocity, 0, 0));
        camera.position = new BABYLON.Vector3(boatObj.position.x, camera.position.y, boatObj.position.z - 3);
      }
    }
    await currentAction();
    currentAction = () => {};
    actionParams = [];
  }
}
export {
  addOtherBoat,
  gameLoaded,
  setJoinedWithName
};
