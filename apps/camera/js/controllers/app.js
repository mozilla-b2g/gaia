/*global define*/

define(function(require) {
  'use strict';

  var evt = require('libs/evt');

  var CameraState = require('models/state');
  var CameraSettings = require('models/settings');
  var ViewfinderView = require('views/viewfinder');
  var ControlsView = require('views/controls');
  var HudView = require('views/hud');
  var DCF = require('dcf');

  var AppController = function() {

    PerformanceTestingHelper.dispatch('initialising-camera-preview');

    // We dont want to initialise until we know what type of activity
    // we are handling
    var hasMessage = navigator.mozHasPendingMessage('activity');
    navigator.mozSetMessageHandler('activity', Camera.handleActivity.bind(Camera));

    if (hasMessage) {
      return;
    }

    // The activity may have defined a captureMode, otherwise
    // be default we use the camera
    if (Camera._captureMode === null) {
      Camera.setCaptureMode(CAMERA_MODE_TYPE.CAMERA);
    }

    window.CameraState = CameraState;
    window.CameraSettings = CameraSettings;
    window.ViewfinderView = new ViewfinderView(document.getElementById('viewfinder'));
    var controlsView = window.ControlsView
                     = new ControlsView(document.getElementById('controls'));

    var hud = new HudView();
    hud.on('flashToggle', function() {
      var mode = Camera.toggleFlash();
      hud.setFlashMode(mode);
    });
    hud.on('cameraToggle', function() {
      Camera.toggleCamera();
    });

    document.body.appendChild(hud.el);

    window.DCFApi = DCF;

    Camera.loadCameraPreview(CameraState.get('cameraNumber'), function() {
      PerformanceTestingHelper.dispatch('camera-preview-loaded');
      Camera.checkStorageSpace();
      hud.setFlashMode(Camera.getFlashMode());
    });

    window.LazyL10n.get(function localized() {
      Camera.delayedInit();
    });

    CameraState.on('change:recording', function(evt) {
      var recording = evt.value;

      controlsView.setRecording(recording);

      // Hide the filmstrip to prevent the users from entering the
      // preview mode after Camera starts recording button pressed
      if (recording && Filmstrip.isShown()) {
        Filmstrip.hide();
      }
    });

    CameraState.on('change:modeButtonEnabled', function(evt) {
      controlsView.setModeButtonEnabled(evt.value);
    });

    CameraState.on('change:captureButtonEnabled', function(evt) {
      controlsView.setCaptureButtonEnabled(evt.value);
    });

    CameraState.on('change:galleryButtonEnabled', function(evt) {
      controlsView.setGalleryButtonEnabled(evt.value);
    });

    CameraState.on('change:cancelPickButtonEnabled', function(evt) {
      controlsView.setCancelPickButtonEnabled(evt.value);
    });

    CameraState.on('change:modeButtonHidden', function(evt) {
      controlsView.setModeButtonHidden(evt.value);
    });

    CameraState.on('change:captureButtonHidden', function(evt) {
      controlsView.setCaptureButtonHidden(evt.value);
    });

    CameraState.on('change:galleryButtonHidden', function(evt) {
      controlsView.setGalleryButtonHidden(evt.value);
    });

    CameraState.on('change:cancelPickButtonHidden', function(evt) {
      controlsView.setCancelPickButtonHidden(evt.value);
    });

  };

  AppController.prototype = evt.mix({
    views: null
  });

  return AppController;
});
