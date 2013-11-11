define(function(require) {
  'use strict';

  var View = require('view');

  var ControlsView = new View('#controls', {
    modeButton: document.getElementById('switch-button'),
    captureButton: document.getElementById('capture-button'),
    galleryButton: document.getElementById('gallery-button'),
    cancelPickButton: document.getElementById('cancel-pick'),

    orientationStyle: (function() {
      var style = document.createElement('style');
      
      document.head.appendChild(style);

      return style;
    })(),

    render: function() {
      if (!this.model) {
        return;
      }

      var properties = this.model.get();

      this.setBooleanAttribute(this.modeButton,       'disabled', !properties.modeButtonEnabled);
      this.setBooleanAttribute(this.captureButton,    'disabled', !properties.captureButtonEnabled);
      this.setBooleanAttribute(this.galleryButton,    'disabled', !properties.galleryButtonEnabled);
      this.setBooleanAttribute(this.cancelPickButton, 'disabled', !properties.cancelPickButtonEnabled);

      this.setBooleanClass(this.modeButton,       'hidden', properties.modeButtonHidden);
      this.setBooleanClass(this.captureButton,    'hidden', properties.captureButtonHidden);
      this.setBooleanClass(this.galleryButton,    'hidden', properties.galleryButtonHidden);
      this.setBooleanClass(this.cancelPickButton, 'hidden', properties.cancelPickButtonHidden);

      this.orientationStyle.innerHTML =
        '#switch-button span,'            +
        '#capture-button span,'           +
        '#toggle-flash,'                  +
        '#toggle-camera,'                 +
        '#gallery-button span {'          +
          '-moz-transform: rotate(' + (-properties.orientation) + 'deg);' +
        '}';
    },

    setRecording: function(recording) {
      this.setBooleanClass(document.body, 'recording', recording);
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
