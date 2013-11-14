/*global define*/

define(function(require) {
  'use strict';

  var View = require('view');
  var bind = require('utils/bind');
  var find = require('utils/find');

  return View.extend({
    initialize: function() {
      this.el.innerHTML = this.render();

      // Get elments
      this.els.flash = find('.js-toggle-flash', this.el);
      this.els.flashModeName = find('.js-flash-mode-name', this.el);
      this.els.camera = find('.js-toggle-camera', this.el);

      // Bind events
      bind(this.els.flash, 'click', this.onFlashClick, this);
      bind(this.els.camera, 'click', this.onCameraClick, this);
    },

    setFlashMode: function(mode) {
      this.els.flash.setAttribute('data-mode', mode);
      this.els.flashModeName.textContent = mode;
    },

    onFlashClick: function() {
      var toggleClass = 'is-toggling';
       // Add the toggle state class,
       // then remove it after 1 second
       // of inactivity. We use this class
       // to show the flash name text.
       this.els.flash.classList.add(toggleClass);
       clearTimeout(this.toggleTimer);
       this.toggleTimer = setTimeout(function() {
         this.els.flash.classList.remove(toggleClass);
       }.bind(this), 1000);
       this.emit('flashToggle');
    },

    onCameraClick: function() {
      this.emit('cameraToggle');
    },

    render: function() {
      return '<div id="hud" class="hud">' +
        '<a id="toggle-flash" class="toggle-flash rotates hidden js-toggle-flash">' +
          '<div class="flash-text">Flash: <span class="flash-name js-flash-mode-name"></span></div>' +
        '</a>' +
        '<a id="toggle-camera" class="toggle-camera rotates hidden js-toggle-camera"></a>' +
      '</div>';
    }
  });
});
