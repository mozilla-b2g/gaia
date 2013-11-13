/*global define*/

define(function(require) {
  'use strict';

  var evt = require('libs/evt');

  var CameraState = require('models/state');
  var CameraSettings = require('models/settings');

  var AppController = function(views) {
    var ControlsView = views.ControlsView;
    var ViewfinderView = views.ViewfinderView;

    CameraState.on('change:recording', function(evt) {
      var recording = evt.value;

      ControlsView.setRecording(recording);

      // Hide the filmstrip to prevent the users from entering the
      // preview mode after Camera starts recording button pressed
      if (recording && Filmstrip.isShown()) {
        Filmstrip.hide();
      }
    });

    CameraState.on('change:modeButtonEnabled', function(evt) {
      ControlsView.setModeButtonEnabled(evt.value);
    });

    CameraState.on('change:captureButtonEnabled', function(evt) {
      ControlsView.setCaptureButtonEnabled(evt.value);
    });

    CameraState.on('change:galleryButtonEnabled', function(evt) {
      ControlsView.setGalleryButtonEnabled(evt.value);
    });

    CameraState.on('change:cancelPickButtonEnabled', function(evt) {
      ControlsView.setCancelPickButtonEnabled(evt.value);
    });

    CameraState.on('change:modeButtonHidden', function(evt) {
      ControlsView.setModeButtonHidden(evt.value);
    });

    CameraState.on('change:captureButtonHidden', function(evt) {
      ControlsView.setCaptureButtonHidden(evt.value);
    });

    CameraState.on('change:galleryButtonHidden', function(evt) {
      ControlsView.setGalleryButtonHidden(evt.value);
    });

    CameraState.on('change:cancelPickButtonHidden', function(evt) {
      ControlsView.setCancelPickButtonHidden(evt.value);
    });
  };

  AppController.prototype = evt.mix({
    views: null
  });

  return AppController;
});
