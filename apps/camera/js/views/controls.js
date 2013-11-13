/*global define*/

define(function(require) {
  'use strict';

  var View = require('view');
  var bind = require('utils/bind');
  var find = require('utils/find');

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

  return View.extend({
    initialize: function() {

      // Find elements
      this.els.modeButton = find('#switch-button', this.el);
      this.els.captureButton = find('#capture-button', this.el);
      this.els.galleryButton = find('#gallery-button', this.el);
      this.els.cancelPickButton = find('#cancel-pick', this.el);

      // Bind events
      bind(this.els.modeButton, 'click', this.modeButtonHandler);
      bind(this.els.captureButton, 'click', this.captureButtonHandler);
      bind(this.els.galleryButton, 'click', this.galleryButtonHandler);
      bind(this.els.cancelPickButton, 'click', this.cancelPickButtonHandler);
    },

    setRecording: function(recording) {
      setBooleanClass(document.body, 'recording', recording);
    },

    setModeButtonEnabled: function(enabled) {
      setBooleanAttribute(this.els.modeButton, 'disabled', !enabled);
    },

    setCaptureButtonEnabled: function(enabled) {
      setBooleanAttribute(this.els.captureButton, 'disabled', !enabled);
    },

    setGalleryButtonEnabled: function(enabled) {
      setBooleanAttribute(this.els.galleryButton, 'disabled', !enabled);
    },

    setCancelPickButtonEnabled: function(enabled) {
      setBooleanAttribute(this.els.cancelPickButton, 'disabled', !enabled);
    },

    setModeButtonHidden: function(hidden) {
      setBooleanClass(this.els.modeButton, 'hidden', hidden);
    },

    setCaptureButtonHidden: function(hidden) {
      setBooleanClass(this.els.captureButton, 'hidden', hidden);
    },

    setGalleryButtonHidden: function(hidden) {
      setBooleanClass(this.els.galleryButton, 'hidden', hidden);
    },

    setCancelPickButtonHidden: function(hidden) {
      setBooleanClass(this.els.cancelPickButton, 'hidden', hidden);
    },

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
});
