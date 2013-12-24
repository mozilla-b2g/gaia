define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var Overlay = require('views/overlay');
var bindAll = require('utils/bindAll');

/**
 * Locals
 */

var proto = OverlayController.prototype;

/**
 * Exports
 */

module.exports = OverlayController;

/**
 * Initialize a new `OverlayController`
 *
 * @param {App} app
 */
function OverlayController(app) {
  if (!(this instanceof OverlayController)) {
    return new OverlayController(app);
  }

  this.activity = app.activity;
  this.camera = app.camera;
  this.overlays = [];
  bindAll(this);

  // Events
  this.camera.state.on('change:storage', this.onStorageChange);
}

proto.onStorageChange = function(value) {
  if (value === 'available') {
    this.destroyOverlays();
    return;
  }

  this.insertOverlay(value);
};

proto.insertOverlay = function(value) {
  var data = this.getOverlayData(value);
  var activity = this.activity;

  if (!data) {
    return;
  }

  var isClosable = activity.active;
  var overlay = new Overlay({
    type: value,
    closable: isClosable,
    data: data
  });

  overlay
    .appendTo(document.body)
    .on('click:storage-settings-btn', this.onStorageSettingsClick)
    .on('click:close-btn', function() {
      overlay.destroy();
      activity.cancel();
    });

  this.overlays.push(overlay);
};

proto.getOverlayData = function(value) {
  var l10n = navigator.mozL10n;
  var data = {};

  switch (value) {
    case 'unavailable':
      data.title = l10n.get('nocard2-title');
      data.body = l10n.get('nocard2-text');
    break;
    case 'nospace':
      data.title = l10n.get('nospace2-title');
      data.body = l10n.get('nospace2-text');
    break;
    case 'shared':
      data.title = l10n.get('pluggedin-title');
      data.body = l10n.get('pluggedin-text');
    break;
    default:
      return false;
  }

  data.closeButtonText = l10n.get('close-button');
  data.storageButtonText = l10n.get('storage-setting-button');

  return data;
};

/**
 * Click to open the media
 * storage panel when the default
 * storage is unavailable.
 *
 * @return {undefined}
 */
proto.onStorageSettingsClick = function() {
  var MozActivity = window.MozActivity;
  this.mozActivity = new MozActivity({
    name: 'configure',
    data: {
      target: 'device',
      section: 'mediaStorage'
    }
  });
};

proto.destroyOverlays = function() {
  this.overlays.forEach(function(overlay) {
    overlay.destroy();
  });
  this.overlays = [];
};

});
