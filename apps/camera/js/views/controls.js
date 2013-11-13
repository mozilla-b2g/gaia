define(function(require) {
  'use strict';

  var View = require('view');

  var setBooleanAttribute = function(el, attribute, value) {
    if (value) {
      el.setAttribute(attribute, attribute);
    }

    else {
      el.removeAttribute(attribute);
    }
  };

  var setBooleanClass = function(el, className, value) {
    if (value) {
      el.classList.add(className);
    }

    else {
      el.classList.remove(className);
    }
  };

  var ControlsView = new View('#controls', {
    modeButton: document.getElementById('switch-button'),
    captureButton: document.getElementById('capture-button'),
    galleryButton: document.getElementById('gallery-button'),
    cancelPickButton: document.getElementById('cancel-pick'),

    setRecording: function(recording) {
      setBooleanClass(document.body, 'recording', recording);
    },

    setModeButtonEnabled: function(enabled) {
      setBooleanAttribute(this.modeButton, 'disabled', !enabled);
    },

    setCaptureButtonEnabled: function(enabled) {
      setBooleanAttribute(this.captureButton, 'disabled', !enabled);
    },

    setGalleryButtonEnabled: function(enabled) {
      setBooleanAttribute(this.galleryButton, 'disabled', !enabled);
    },

    setCancelPickButtonEnabled: function(enabled) {
      setBooleanAttribute(this.cancelPickButton, 'disabled', !enabled);
    },

    setModeButtonHidden: function(hidden) {
      setBooleanClass(this.modeButton, 'hidden', hidden);
    },

    setCaptureButtonHidden: function(hidden) {
      setBooleanClass(this.captureButton, 'hidden', hidden);
    },

    setGalleryButtonHidden: function(hidden) {
      setBooleanClass(this.galleryButton, 'hidden', hidden);
    },

    setCancelPickButtonHidden: function(hidden) {
      setBooleanClass(this.cancelPickButton, 'hidden', hidden);
    },

    // Event Handlers
    modeButtonHandler: function controls_modeButtonHandler(event) {
      if (event.target.getAttribute('disabled')) {
        return;
      }

      var newMode = (Camera._captureMode === CAMERA_MODE_TYPE.CAMERA) ?
        CAMERA_MODE_TYPE.VIDEO : CAMERA_MODE_TYPE.CAMERA;
      Camera.changeMode(newMode);
    },

    captureButtonHandler: function controls_captureButtonHandler(event) {
      if (event.target.getAttribute('disabled')) {
        return;
      }

      Camera.capture();
    },

    galleryButtonHandler: function controls_galleryButtonHandler(event) {
      // Can't launch the gallery if the lockscreen is locked.
      // The button shouldn't even be visible in this case, but
      // let's be really sure here.
      if (Camera._secureMode)
        return;

      // Launch the gallery with an activity
      var a = new MozActivity({
        name: 'browse',
        data: {
          type: 'photos'
        }
      });
    },

    cancelPickButtonHandler: function controls_cancelPickButtonHandler(event) {
      Camera.cancelPick();
    }
  });

  ControlsView.attach({
    'click #switch-button': 'modeButtonHandler',
    'click #capture-button': 'captureButtonHandler',
    'click #gallery-button': 'galleryButtonHandler',
    'click #cancel-pick': 'cancelPickButtonHandler'
  });

  return ControlsView;
});
