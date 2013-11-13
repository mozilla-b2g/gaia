define(function(require) {
  'use strict';

  /**
   * Dependencies
   */

  var View = require('view');

  /**
   * Exports
   */

  return View.extend({
    initialize: function() {
      this.el.innerHTML = this.render();

      // Get elments
      this.els.flash = this.find('.js-flash-button');
      this.els.camera = this.find('.js-toggle-button');

      // Bind events
      this.bind(this.els.flash, 'click', this.onFlashClick);
      this.bind(this.els.camera, 'click', this.onCameraClick);
    },

    onFlashClick: function() {
      this.fire('flashToggle');
    },

    onCameraClick: function() {
      this.fire('cameraToggle');
    },

    render: function() {
      return '<button>Flash</button>';
    }
  });
});
