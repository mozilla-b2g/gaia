/*global PerformanceTestingHelper, CAMERA_MODE_TYPE*/

define(function(require) {
  'use strict';

  var evt = require('libs/evt');
  var filmstrip = require('views/filmstrip');
  var CameraState = require('models/state');
  var CameraSettings = require('models/settings');
  var ViewfinderView = require('views/viewfinder');
  var ControlsView = require('views/controls');
  var HudView = require('views/hud');
  var find = require('utils/find');
  var DCF = require('dcf');
  var camera = window.Camera;

  var AppController = function() {

    PerformanceTestingHelper.dispatch('initialising-camera-preview');

    // We dont want to initialise until we know what type of activity
    // we are handling
    var hasMessage = navigator.mozHasPendingMessage('activity');
    var onActivity = camera.handleActivity.bind(camera);
    navigator.mozSetMessageHandler('activity', onActivity);

    if (hasMessage) {
      return;
    }

    // The activity may have defined a captureMode, otherwise
    // be default we use the camera
    if (camera._captureMode === null) {
      camera.setCaptureMode(CAMERA_MODE_TYPE.CAMERA);
    }

    window.CameraState = CameraState;
    window.CameraSettings = CameraSettings;
    window.ViewfinderView = new ViewfinderView(find('#viewfinder'));
    var controlsView = new ControlsView(find('#controls'));
    window.ControlsView = controlsView;

    var hud = new HudView();
    hud.on('flashToggle', function() {
      var mode = camera.toggleFlash();
      hud.setFlashMode(mode);
    });
    hud.on('cameraToggle', function() {
      camera.toggleCamera();
    });

    document.body.appendChild(hud.el);

    window.DCFApi = DCF;

    camera.loadCameraPreview(CameraState.get('cameraNumber'), function() {
      PerformanceTestingHelper.dispatch('camera-preview-loaded');
      camera.checkStorageSpace();
      hud.setFlashMode(camera.getFlashMode());
    });

    window.LazyL10n.get(function localized() {
      camera.delayedInit();
    });

    CameraState.on('change:recording', function(evt) {
      var recording = evt.value;

      controlsView.setRecording(recording);

      // Hide the filmstrip to prevent the users from entering the
      // preview mode after Camera starts recording button pressed
      if (recording && filmstrip.isShown()) {
        filmstrip.hide();
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


    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        camera.turnOffFlash();
        camera.stopPreview();
        camera.cancelPick();
        camera.cancelPositionUpdate();

        // If the lockscreen is locked
        // then forget everything when closing camera
        if (camera._secureMode) {
          filmstrip.clear();
        }

      } else {
        camera.startPreview();
      }
    });

    window.addEventListener('beforeunload', function() {
      window.clearTimeout(camera._timeoutId);
      delete camera._timeoutId;
      ViewfinderView.setPreviewStream(null);
    });

  };

  AppController.prototype = evt.mix({
    views: null
  });

  return AppController;
});
