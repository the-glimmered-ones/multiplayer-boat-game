import * as BABYLON from "babylonjs";
import { WaterMaterial } from "babylonjs-materials"; 
import "babylonjs-materials";
import "babylonjs-loaders";
import "babylonjs-post-process";
import "babylonjs-serializers";
import "babylonjs-gui";
import { ClientPacket, ClientPacketTypes } from "@shared/PacketTypes";
import { PlayerLocation, GlobalClientLocation } from "@shared/Consts"; 
import { ws } from "@src/shared";

const startWindow = window.parent //TODO this is in the iframe, so it should be treated and referenced as the child to prevent weirdness
const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('renderCanvas');

let engine: BABYLON.Engine | null = null;
var boatRoot: BABYLON.TransformNode;
var boatObj: BABYLON.Mesh;
var camera: BABYLON.FollowCamera;
export var gameLoaded: boolean = false
var joinedWithName: boolean;

export function setJoinedWithName(value: boolean){
  console.log("set true")
  joinedWithName = true
  setInterval(queueClientAction, 15)
}

//TODO: fix loading times

addEventListener("load", () => {
  window.parent.alert("shart") // YAYYYYYYYYY
  //console.log("game loaded")
  //requestWs.call(window.parent, window)
})

function requestWs(window: Window) {
  let gameWindow = window 
  console.log("game window is " + gameWindow)
}

const BOAT_Y_POSITION = 5
const BOAT_SCALE = new BABYLON.Vector3(5,5,5)
const BOAT_STARTING_ROTATION = new BABYLON.Vector3(0, 4.712, 0)
function createWaterScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
    var scene: BABYLON.Scene = new BABYLON.Scene(engine);
    console.log("scene created")
    //var camera = new BABYLON.ArcRotateCamera("Camera", 3 * Math.PI / 2, 8 * Math.PI / 45, 100, BABYLON.Vector3.Zero(), scene);
    camera = new BABYLON.FollowCamera("Camera", new BABYLON.Vector3(0,0,0), scene);
    //camera.attachControl(canvas, true);
    
    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, .1), scene);
    light.diffuse = new BABYLON.Color3(1, .992, .867)
    light.intensity = 0.5

    var skybox = BABYLON.CreateBox("skyBox", { size: 1e3 }, scene);
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
    var ground = BABYLON.CreateGround("ground", { width: 512, height: 512, subdivisions: 32}, scene);
    ground.position.y = -1;
    ground.material = groundMaterial;

    var waterMesh = BABYLON.CreateGround("waterMesh", { width: 512, height: 512, subdivisions: 32}, scene);
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

    loadBoatMesh(scene)

    // BABYLON.Effect.ShadersStore["customFragmentShader"] = `
    // #ifdef GL_ES
    // precision highp float;
    // #endif

    // // Samplers
    // varying vec2 vUV;
    // uniform sampler2D textureSampler;
    
    // // Parameters
    // uniform vec2 screenSize;
    // uniform float threshold;

    // void main(void) {
    // vec2 texelSize = vec2(1.0 / screenSize.x, 1.0 / screenSize.y);
    // vec4 baseColor = texture2D(textureSampler, vUV);
    
    // // if (baseColor.r < threshold) {
    // gl_FragColor = baseColor;
    // // } else {
    // // gl_FragColor = vec4(0);
    // // }
    // }`;

    // var postProcess = new BABYLON.PostProcess("My custom post process", "custom", ["screenSize", "threshold"], null, 0.25, camera);
    // postProcess.onApply = function(effect) {
    //     effect.setFloat2("screenSize", postProcess.width, postProcess.height);
    //     effect.setFloat("threshold", 0.3);
    // };

return scene;
}

var boatMesh: BABYLON.Mesh
var sceneMeshes: BABYLON.ISceneLoaderAsyncResult;
const githubSrc =  "https://github.com/the-glimmered-ones/multiplayer-boat-game/tree/318830bbfc462dc9976751e62f7494207e59bbba/textures/"
async function loadBoatMesh(scene: BABYLON.Scene){
    sceneMeshes = (await BABYLON.ImportMeshAsync(githubSrc + "boat-placeholder.obj", scene));
    for (let mesh of sceneMeshes.meshes){
      if (mesh.name == 'BOAT'){
        boatMesh = <BABYLON.Mesh>mesh
        addBoat(boatMesh, new BABYLON.Vector3(0, BOAT_Y_POSITION, 0), BOAT_SCALE, BOAT_STARTING_ROTATION, camera);
      }
    }
    //y is height, x and z are width and length, rotation is in radians
    
}

function addBoat(mesh: BABYLON.Mesh, pos: BABYLON.Vector3, scale: BABYLON.Vector3, rotation: BABYLON.Vector3, camera?: BABYLON.FollowCamera){
  boatRoot = new BABYLON.TransformNode("boatTransform");
  var boatMat: BABYLON.StandardMaterial;
  
  boatObj = <BABYLON.Mesh> mesh
  boatMat = new BABYLON.StandardMaterial("boatMat")
  boatMat.diffuseColor = new BABYLON.Color3(97/255, 38/255, 0);
  boatObj.material = boatMat

  boatObj.parent = boatRoot
  boatRoot.position = pos
  boatRoot.scaling = scale
  boatObj.rotation = rotation

  if (camera){
    camera.position = new BABYLON.Vector3(0, 30, -3)
    camera.setTarget(new BABYLON.Vector3(0, -10, -3))
    camera.fov = 1.1
    camera.parent = boatRoot;
    //camera.attachControl();
    //camera.cameraAcceleration = 1;
    //camera.maxCameraSpeed = 10;
  }

  console.log(boatRoot) 
}

export function addOtherBoat(player: GlobalClientLocation){
  addBoat(boatMesh, new BABYLON.Vector3(player.position[0], BOAT_Y_POSITION, player.position[1]), BOAT_SCALE, new BABYLON.Vector3(0, player.angle, 0))
}

//https://stackoverflow.com/questions/251420/invoking-javascript-code-in-an-iframe-from-the-parent-page
//https://www.reddit.com/r/javascript/comments/657ma6/attempting_to_call_parent_function_from_iframe_is/
if (ws){//parent.getWebsocket()){
  ws.addEventListener("open", async () => {
    if (!engine) {
      engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    }

    let createScene = createWaterScene;// || mod.default;
    // if (!createScene && mod.Playground?.CreateScene) createScene = (e,c)=>mod.Playground.CreateScene(e,c);
    if (!createScene) throw new Error('No createScene() export found.');

    console.log("made here")

    const scene = await (createWaterScene(engine, canvas));
    gameLoaded = true;
    engine.runRenderLoop(() => scene.render());
    addEventListener('resize', () => { if(engine) { engine.resize() } });
    scene.debugLayer.show()
    joinedWithName = false
    // //this stopped it from rendering
    // if (typeof createWaterScene === 'function') {
    //   try { engine = await createWaterScene; } catch {}
    // }
  })
}


//const MAX_ACCELERATION = 1;
const acceleration = .2;
const MAX_VELOCITY = 2;
let velocity: number  = 0;
const rotSpeed: number = 0.087; //5 deg
let moveNS: number = 0
function moveBoat(){
  if (!gameLoaded || !joinedWithName) { return; }

  if (actionParams.length == 0) { return; }
  console.log("move boat")

  moveNS = 0
  const inputWE = actionParams[0]
  const inputNS = actionParams[1]
  //console.log(actionParams)

  //TODO: acceleration / lerp with delta for smoother movement

  if (inputNS != "" || inputWE != ""){
    console.log("hasJoinedWithName " + joinedWithName)
    ws.send(
      JSON.stringify(
        new ClientPacket(ClientPacketTypes.PLAYER_POSITION_UPDATE, 
        new PlayerLocation(
          [boatObj.absolutePosition.x, boatObj.absolutePosition.z],
          boatObj.rotation.y,
          velocity
    ))))
  }

  if (inputNS != ""){
    //if NS input, move boat forward/backward
    // "Every frame, you add your acceleration value (PLAYER_ACCELERATION) to the player's velocity until it reaches a maximum."

    if (inputNS == "N"){
      if (velocity > 0)
        velocity = 0
      accelerate(false);
      moveNS = velocity//-1 * (velocity + acceleration)
    }
    else if (inputNS == "S"){
      if (velocity < 0)
        velocity = 0
      accelerate(true);
      moveNS = velocity// + acceleration
    }
    //console.log("pos " + boatObj.position)
    boatObj.locallyTranslate(new BABYLON.Vector3(moveNS, 0, 0))//new BABYLON.Vector3(moveNS, 0, 0))

    //console.log("new pos " + boatObj.position)
    camera.position = new BABYLON.Vector3(boatObj.position.x, camera.position.y, boatObj.position.z - 3)
    //if boat angle > 180, shift camera down, if angle < 180, shift camera up; center boat on screen?
    
  }
  //if WE input, turn on rudder
  if (inputWE != ""){
    velocity = 0
    if (inputWE == "W")
      boatObj.addRotation(0, -1 * rotSpeed, 0)
    else if (inputWE == "E")
      boatObj.addRotation(0, rotSpeed, 0)
  }
}

function accelerate(reversing: boolean){
  if (reversing){
    if (velocity < MAX_VELOCITY)
      velocity += acceleration;
    if (velocity > MAX_VELOCITY)
      velocity = MAX_VELOCITY;
    console.log("reversing velocity " + velocity)
  }
  else{
    if (velocity > (MAX_VELOCITY * -1) && velocity <= 0) // if > -3
      velocity -= acceleration; //
    if (velocity < (MAX_VELOCITY * -1))
      velocity = (MAX_VELOCITY * -1);
  }
}

function decelerate(reversing: boolean){
  if (reversing){
    if (velocity < 0)
      velocity += acceleration;
    if (velocity > 0)
      velocity = 0;
  }
  else{
    if (velocity > 0)
      velocity -= acceleration;
    if (velocity < 0)
      velocity = 0;
  }
  //boatObj.locallyTranslate(new BABYLON.Vector3(moveNS, 0, 0))
}

const pressedMoveKeys: Array<string> = []
window.addEventListener("keydown", (event) => {
//w/up = go forward, left/right = turn, down = slowly back up
//change view = space, attack = shift, map = tab
  const key = event.key
  //console.log(key)
  console.log(gameLoaded, joinedWithName)
  if (gameLoaded && joinedWithName){
    actionParams = [];
    pressedMoveKeys.splice(0)
    if(key == "a" || pressedMoveKeys.includes(key)){
      actionParams[0] = "W";
    }
    else if(key == "d" || pressedMoveKeys.includes(key)){
      actionParams[0] = "E";
    }
    else{
      actionParams[0] = "";
    }

    if(key == "w" || pressedMoveKeys.includes(key)){
      actionParams[1] = "N";
    }
    else if(key == "s" || pressedMoveKeys.includes(key)){
      actionParams[1] = "S";
    }
    else{
      actionParams[1] = "";
    }
    currentAction = moveBoat
    pressedMoveKeys.push(key)
  }
})

window.addEventListener("keyup", (event) => {
  const key = event.key
  if (pressedMoveKeys.includes(key)){
    pressedMoveKeys.splice(pressedMoveKeys.indexOf(key), 1)
  }
})

function setCameraPosRelativeToBoat(){
  if (boatObj.rotation.y > Math.PI){
    camera.position = new BABYLON.Vector3(boatObj.position.x, camera.position.y, boatObj.position.z + 12)
    camera.setTarget(new BABYLON.Vector3(boatObj.position.x, camera.position.y, boatObj.position.z + 12))
  }
  else if (boatObj.rotation.y < Math.PI){
    camera.position = new BABYLON.Vector3(boatObj.position.x, camera.position.y, boatObj.position.z - 12)
    camera.setTarget(new BABYLON.Vector3(boatObj.position.x, camera.position.y, boatObj.position.z - 12))
  }
}

var currentAction: CallableFunction = () => {};
var actionParams: Array<any> = [];
var delta;// = (engine).getDeltaTime()/1000 
async function queueClientAction(){
  if (gameLoaded){
    delta = (<BABYLON.Engine> engine).getDeltaTime()/1000
    //console.log("tick ", currentAction)
    let moveKeysPressed: boolean = false;
    console.log("velocity " + velocity + " action params " + actionParams)
    if (velocity != 0){
      if (pressedMoveKeys.includes("w") || pressedMoveKeys.includes("s") || pressedMoveKeys.includes("d") || pressedMoveKeys.includes("a")){//not moving, decelerate
        moveKeysPressed = true
        console.log("move keys pressed " + pressedMoveKeys)
      }

      if (!moveKeysPressed){
        console.log("decelerate")
        decelerate((velocity < 0) ? true:false);
        boatObj.locallyTranslate(new BABYLON.Vector3(velocity, 0, 0))
        camera.position = new BABYLON.Vector3(boatObj.position.x, camera.position.y, boatObj.position.z - 3)
      }
    }
    //setCameraPosRelativeToBoat();

    await currentAction()
    currentAction = () => {};
    actionParams = [];
  }
}
