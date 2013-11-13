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

    render: function() {
      if (!this.model) {
        return;
      }

      var properties = this.model.get();

      setBooleanAttribute(this.modeButton,       'disabled', !properties.modeButtonEnabled);
      setBooleanAttribute(this.captureButton,    'disabled', !properties.captureButtonEnabled);
      setBooleanAttribute(this.galleryButton,    'disabled', !properties.galleryButtonEnabled);
      setBooleanAttribute(this.cancelPickButton, 'disabled', !properties.cancelPickButtonEnabled);

      setBooleanClass(this.modeButton,       'hidden', properties.modeButtonHidden);
      setBooleanClass(this.captureButton,    'hidden', properties.captureButtonHidden);
      setBooleanClass(this.galleryButton,    'hidden', properties.galleryButtonHidden);
      setBooleanClass(this.cancelPickButton, 'hidden', properties.cancelPickButtonHidden);
    },

    setRecording: function(recording) {
      setBooleanClass(document.body, 'recording', recording);
    },

    // Event Handlers
    modeButtonHandler: function controls_modeButtonHandler(event) {
      if (event.target.getAttribute('disabled')) {
        return;
      }

      var newMode = (Camera._captureMode === CameraMode.CAMERA) ?
        CameraMode.VIDEO : CameraMode.CAMERA;
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
