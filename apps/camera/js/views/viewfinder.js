/*global define*/

define(function(require) {
  'use strict';

  var View = require('view');
  var bind = require('utils/event').bind;
  var find = require('utils/find');

  return View.extend({
    initialize: function() {

      // Bind events
      bind(this.el, 'click', this.toggleFilmstrip);
    },

    toggleFilmstrip: function viewfinder_toggleFilmstrip(evt) {
      // We will just ignore
      // because the filmstrip shouldn't be shown
      // while Camera is recording
      var recording = CameraState.get('recording');
      if (recording || Camera._pendingPick) // TODO: Move _pendingPick into CameraState
        return;

      if (Filmstrip.isShown())
        Filmstrip.hide();
      else
        Filmstrip.show();
    },

    setPreviewStream: function(previewStream) {
      this.el.mozSrcObject = previewStream;
    },

    startPreview: function() {
      this.el.play();
    },

    stopPreview: function() {
      this.el.stop();
    }
  });
});
