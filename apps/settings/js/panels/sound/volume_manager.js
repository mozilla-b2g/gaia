/**
 * Setup the sliders for previewing the tones.
 * @module VolumeManager
 */
define(function(require) {
  'use strict';

  var SliderHandler = require('panels/sound/slider_handler');

  var VolumeManager = function() {
    this._elements = null;
  };

  VolumeManager.prototype = {
    /**
     * initialization
     *
     * @access public
     * @memberOf VolumeManager.prototype
     */
    init: function vm_init(elements) {
      this._elements = elements;

      var contentHandler = SliderHandler();
      contentHandler.init(this._elements.media, 'content');
      var notification = SliderHandler();
      notification.init(this._elements.notification, 'notification');
      var alarm = SliderHandler();
      alarm.init(this._elements.alarm, 'alarm');
    }
  };

  return function ctor_volumeManager() {
    return new VolumeManager();
  };
});
