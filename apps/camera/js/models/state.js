define(function(require) {
  'use strict';

  var Model = require('model');

  var CameraState = new Model({
    initialized: false,
    
    cameraNumber: 0,
    autoFocusSupported: false,
    manuallyFocused: false,
    recording: false,

    previewActive: false,

    modeButtonEnabled: false,
    captureButtonEnabled: false,
    galleryButtonEnabled: false,
    cancelPickButtonEnabled: false,

    modeButtonHidden: true,
    captureButtonHidden: false,
    galleryButtonHidden: true,
    cancelPickButtonHidden: true,

    orientation: 0
  });

  CameraState.enableButtons = function() {
    this.set({
      modeButtonEnabled: true,
      captureButtonEnabled: true,
      galleryButtonEnabled: true,
      cancelPickButtonEnabled: true
    });
  };

  CameraState.disableButtons = function() {
    this.set({
      modeButtonEnabled: false,
      captureButtonEnabled: false,
      galleryButtonEnabled: false,
      cancelPickButtonEnabled: false
    });
  };

  return CameraState;
});
