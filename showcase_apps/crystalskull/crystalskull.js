
var engine, scene;
var root, model, shader;
var mx = 0, my = 0;

var properties = {
  dispersionRed: 0.90,
  dispersionGreen: 0.97,
  dispersionBlue: 1.04,
  bias: 0.9,
  scale: 0.7,
  power: 1.1
};

window.onload = function(){
  engine = new J3D.Engine();

  J3D.Loader.loadGLSL("shaders/Glass.glsl", function(s) {
    shader = s;
  setup();
  });
}

function setup(){
  var camera = new J3D.Transform();
  camera.camera = new J3D.Camera({far: 100});
  camera.position.z = 5;	
  engine.camera = camera;	

  root = new J3D.Transform();
  root.add(camera);
  engine.scene.add(root);

  var cubemap = new J3D.Cubemap({
    left: "models/textures/skybox/left.jpg",
    right: "models/textures/skybox/right.jpg",
    up: "models/textures/skybox/up.jpg",
    down: "models/textures/skybox/down.jpg",
    back: "models/textures/skybox/back.jpg",
    front: "models/textures/skybox/front.jpg",
  });

  engine.scene.addSkybox(cubemap);

  shader.uCubemap = cubemap;

  var model = new J3D.Transform();
  model.rotation.x = 0.2;	
  model.renderer = shader;
  J3D.Loader.loadJSON("models/skull.js", function(j) {
    model.geometry = new J3D.Mesh(j);
  });
  engine.scene.add(model);

  document.onmousemove = onMouseMove;

  draw();

  // If we become hidden, then draw() stops requesting redraws.
  // So when we become visible again, start drawing again
  document.addEventListener('visibilitychange', function vis() {
    if (!document.hidden) 
      draw();
  });
}

function onMouseMove(e) {
  mx = (e.clientX / window.innerWidth) * 2 - 1;
  my = (e.clientY / window.innerHeight) * 2 - 1;
  if(isNaN(mx)) mx = 0;
  if(isNaN(my)) my = 0;
}

function draw() {
  // Keep redrawing while we're not hidden
  if (!document.hidden)
    requestAnimationFrame(draw);

  shader.chromaticDispertion = [
    properties.dispersionRed,
    properties.dispersionGreen,
    properties.dispersionBlue
  ];	
  shader.bias = properties.bias;	
  shader.scale = properties.scale;	
  shader.power = properties.power;	

  root.rotation.x += (my - root.rotation.x) / 20;
  root.rotation.y += mx * J3D.Time.deltaTime / 2000;

  engine.render();
}

