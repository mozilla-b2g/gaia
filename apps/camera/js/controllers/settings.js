define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:settings');
var SettingsView = require('views/settings');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new SettingsController(app); };
module.exports.SettingsController = SettingsController;

/**
 * Initialize a new `SettingsController`
 *
 * @constructor
 * @param {App} app
 */
function SettingsController(app) {
  bindAll(this);
  this.app = app;
  this.settings = app.settings;
  this.configure();
  this.bindEvents();
  debug('initialized');
}

SettingsController.prototype.configure = function() {
  this.settings.pictureSizes.format = formatters.pictureSizes;
};

/**
 * Bind to app events.
 *
 * @private
 */
SettingsController.prototype.bindEvents = function() {
  this.app.on('change:capabilities', this.onCapabilitiesChange);
  this.app.on('settings:toggle', this.toggleSettings);
};

/**
 * Render and display the settings menu.
 *
 * We use settings.menu() to retrieve
 * and ordered list of settings that
 * have a `menu` property.
 *
 * @private
 */
SettingsController.prototype.openSettings = function() {
  if (this.view) { return; }
  debug('open settings');

  var items = this.settings.menu();
  this.view = new SettingsView({ items: items })
    .render()
    .appendTo(this.app.el)
    .on('tap:close', this.closeSettings)
    .on('tap:option', this.onOptionTap);

  debug('settings opened');
};

/**
 * Destroy the settings menu.
 *
 * @private
 */
SettingsController.prototype.closeSettings = function() {
  if (this.view) {
    this.view.destroy();
    this.view = null;
  }
};

/**
 * Selects the option that was
 * tapped on the setting.
 *
 * @param  {String} key
 * @param  {Setting} setting
 * @private
 */
SettingsController.prototype.onOptionTap = function(key, setting) {
  setting.select(key);
};

/**
 * Toggle the settings menu open/closed.
 *
 * @private
 */
SettingsController.prototype.toggleSettings = function() {
  if (this.view) { this.closeSettings(); }
  else { this.openSettings(); }
};

/**
 * When the hardware capabilities change
 * we update the available options for
 * each setting to match what is available.
 *
 * The rest of the app should listen for
 * the 'settings:configured' event as an
 * indication to update UI etc.
 *
 * We fire the 'settings:beforeconfigured'
 * event to allow other parts of the app
 * a last chance to manipulate options
 * before they are rendered to the UI.
 *
 * @param  {Object} capabilities
 */
SettingsController.prototype.onCapabilitiesChange = function(capabilities) {
  capabilities.pictureFlashModes = capabilities.flashModes;
  capabilities.videoFlashModes = capabilities.flashModes;
  this.app.settings.options(capabilities);
  this.app.emit('settings:configured');
};

var formatters = {
  pictureSizes: function(options) {
    var getMP = function(w, h) { return Math.round((w * h) / 1000000); };
    var maxBytes = this.get('maxBytes');
    var normalized = [];

    options.forEach(function(option) {
      var w = option.width;
      var h = option.height;
      var bytes = w * h;

      // Don't allow pictureSizes above the maxBytes limit
      if (maxBytes && bytes > maxBytes) { return; }

      option.aspect = getAspect(w, h);
      option.mp = getMP(w, h);

      var mp = option.mp ? option.mp + 'MP ' : '';

      normalized.push({
        key: w + 'x' + h,
        title: mp + w + 'x' + h + ' ' + option.aspect,
        value: option
      });
    });

    return normalized;
  }
};

function getAspect(w, h) {
  var getDevisor = function(a, b) {
    return (b === 0) ? a : getDevisor(b, a % b);
  };
  var devisor = getDevisor(w, h);
  return (w / devisor) + ':' + (h / devisor);
}

});
