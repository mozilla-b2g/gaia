/*global define*/

define(function(require) {
  'use strict';

  var View = require('view');
  var bind = require('utils/event').bind;
  var find = require('utils/find');

  return View.extend({
    initialize: function() {
      this.el.innerHTML = this.render();

      // Get elments
      this.els.flash = find('.js-flash-button', this.el);
      this.els.camera = find('.js-toggle-button', this.el);

      // Bind events
      bind(this.els.flash, 'click', this.onFlashClick);
      bind(this.els.camera, 'click', this.onCameraClick);
    },

    onFlashClick: function() {
      this.emit('flashToggle');
    },

    onCameraClick: function() {
      this.emit('cameraToggle');
    },

    render: function() {
      return '<button>Flash</button>';
    }
  });
});
