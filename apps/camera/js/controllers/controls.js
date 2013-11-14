
define(function(require) {
  'use strict';

  var cameraState = require('models/state');
  var ControlsView = require('views/controls');
  var find = require('utils/find');

  var controlsView = new ControlsView(find('#controls'));

  cameraState.on('change:recording', function(e) {
    controlsView.setRecording(e.value);
  });

  cameraState.on('change:modeButtonEnabled', function(e) {
    controlsView.setModeButtonEnabled(e.value);
  });

  cameraState.on('change:captureButtonEnabled', function(e) {
    controlsView.setCaptureButtonEnabled(e.value);
  });

  cameraState.on('change:galleryButtonEnabled', function(e) {
    controlsView.setGalleryButtonEnabled(e.value);
  });

  cameraState.on('change:cancelPickButtonEnabled', function(e) {
    controlsView.setCancelPickButtonEnabled(e.value);
  });

  cameraState.on('change:modeButtonHidden', function(e) {
    controlsView.setModeButtonHidden(e.value);
  });

  cameraState.on('change:captureButtonHidden', function(e) {
    controlsView.setCaptureButtonHidden(e.value);
  });

  cameraState.on('change:galleryButtonHidden', function(e) {
    controlsView.setGalleryButtonHidden(e.value);
  });

  cameraState.on('change:cancelPickButtonHidden', function(evt) {
    controlsView.setCancelPickButtonHidden(evt.value);
  });
});