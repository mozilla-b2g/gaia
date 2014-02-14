define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var Overlay = require('views/overlay');
var bindAll = require('utils/bindAll');
var debug = require('debug')('controller:overlay');

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
  this.storage = app.storage;
  this.overlays = [];
  bindAll(this);
  this.storage.on('statechange', this.onStorageStateChange);
  debug('initialized');
}

/**
 * Respond to storage `statechange`
 * events by inserting or destroying
 * overlays from the app.
 *
 * @param  {String} value  ['nospace'|'shared'|'unavailable'|'available']
 */
OverlayController.prototype.onStorageStateChange = function(value) {
  debug('storage state change: \'%s\'', value);
  if (value === 'available') {
    this.destroyOverlays();
    return;
  }
  this.insertOverlay(value);
};

OverlayController.prototype.insertOverlay = function(type) {
  var data = this.getOverlayData(type);
  var activity = this.activity;

  if (!data) {
    return;
  }

  var isClosable = activity.active;
  var overlay = new Overlay({
    type: type,
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
  debug('inserted \'%s\' overlay', type);
};

/**
 * Get the overlay data required
 * to render a specific type of overlay.
 *
 * @param  {String} type
 * @return {Object}
 */
OverlayController.prototype.getOverlayData = function(type) {
  var l10n = navigator.mozL10n;
  var data = {};

  switch (type) {
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
OverlayController.prototype.onStorageSettingsClick = function() {
  var MozActivity = window.MozActivity;
  this.mozActivity = new MozActivity({
    name: 'configure',
    data: {
      target: 'device',
      section: 'mediaStorage'
    }
  });
};

/**
 * Destroy all overlays.
 */
OverlayController.prototype.destroyOverlays = function() {
  this.overlays.forEach(function(overlay) {
    overlay.destroy();
  });
  this.overlays = [];
  debug('destroyed overlays');
};

});
