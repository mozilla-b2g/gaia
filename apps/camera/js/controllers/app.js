/*global PerformanceTestingHelper, CAMERA_MODE_TYPE*/

define(function(require) {
  'use strict';

  var evt = require('libs/evt');
  var filmstrip = require('views/filmstrip');
  var CameraState = require('models/state');
  var CameraSettings = require('models/settings');
  var ViewfinderView = require('views/viewfinder');
  var broadcast = require('broadcast');
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

    window.DCFApi = DCF;

    camera.loadCameraPreview(CameraState.get('cameraNumber'), function() {
      PerformanceTestingHelper.dispatch('camera-preview-loaded');
      camera.checkStorageSpace();
      broadcast.emit('cameraLoaded');
    });

    window.LazyL10n.get(function() {
      camera.delayedInit();
    });

    CameraState.on('change:recording', function(evt) {
      var recording = evt.value;

      // Hide the filmstrip to prevent the users from entering the
      // preview mode after Camera starts recording button pressed
      if (recording && filmstrip.isShown()) {
        filmstrip.hide();
      }
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
