
define(function(require) {
  'use strict';

  var HudView = require('views/hud');
  var broadcast = require('broadcast');
  var camera = window.Camera;

  var hud = new HudView();

  hud.on('flashToggle', onFlashToggle);
  hud.on('cameraToggle', onCameraToggle);
  broadcast.on('cameraLoaded', onCameraLoaded);

  function onCameraLoaded() {
    hud.setFlashMode(camera.getFlashMode());
  }

  function onFlashToggle() {
    var mode = camera.toggleFlash();
    hud.setFlashMode(mode);
  }

  function onCameraToggle() {
    camera.toggleCamera();
  }

  document.body.appendChild(hud.el);
});