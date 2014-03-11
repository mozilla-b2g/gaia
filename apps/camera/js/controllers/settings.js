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
  this.settings.pictureSizesFront.format = formatters.pictureSizes;
  this.settings.pictureSizesBack.format = formatters.pictureSizes;
  this.configureAliases();
};

/**
 * Bind to app events.
 *
 * @private
 */
SettingsController.prototype.bindEvents = function() {
  this.app.on('change:capabilities', this.onCapabilitiesChange);
  this.app.on('settings:toggle', this.toggleSettings);
  this.app.on('localized', this.settings.localize);
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

  var items = this.menuItems();
  this.view = new SettingsView({ items: items })
    .render()
    .appendTo(this.app.el)
    .on('click:close', this.closeSettings)
    .on('click:option', this.onOptionTap);

  this.app.emit('settings:opened');
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

  this.app.emit('settings:closed');
  debug('settings closed');
};

/**
 * Selects the option that was
 * clicked on the setting.
 *
 * @param  {String} key
 * @param  {Setting} setting
 * @private
 */
SettingsController.prototype.onOptionTap = function(key, setting) {
  setting.select(key);
  this.closeSettings();
  //setting notification
  var message = setting.get('title')+" set "+setting.selected('title')
  this.app.emit('setting:notification', message);
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
 * @param  {Object} capabilities
 */
SettingsController.prototype.onCapabilitiesChange = function(capabilities) {

  // Update the options for any settings
  // keys that match capabilities keys
  this.settings.options(capabilities);

  // Reset both picture and video flash modes
  // as it is possible to change between the
  // two *without* re-requesting the mozCamera.
  this.settings.flashModesPicture.resetOptions(capabilities.flashModes);
  this.settings.flashModesVideo.resetOptions(capabilities.flashModes);

  // Only reset the current alias
  this.settings.recorderProfiles.resetOptions(capabilities.recorderProfiles);
  this.settings.pictureSizes.resetOptions(capabilities.pictureSizes);

  // Let the rest of the app
  // know we're good to go.
  this.app.emit('settings:configured');
};

SettingsController.prototype.configureAliases = function() {
  this.settings.alias('recorderProfiles', aliases.recorderProfiles);
  this.settings.alias('pictureSizes', aliases.pictureSizes);
  this.settings.alias('flashModes', aliases.flashModes);
};

/**
 * Returns a list of settings
 * based on the `settingsMenu`
 * cofiguration.
 *
 * If any `conditions` are defined
 * they must pass to be in the list.
 *
 * @return {Array}
 */
SettingsController.prototype.menuItems = function() {
  var items = this.settings.settingsMenu.get('items');
  return items.filter(this.validMenuItem, this)
    .map(function(item) { return this.settings[item.key]; }, this);
};

/**
 * Tests if the passed `settingsMenu`
 * item is allowed in the settings menu.
 *
 * Should:
 *
 *   1. Be a currently supported setting
 *   2. Pass a defined condition
 *
 * @param  {Object} item
 * @return {Boolean}
 */
SettingsController.prototype.validMenuItem = function(item) {
  var setting = this.settings[item.key];
  var supported = !setting.get('disabled') && !!setting.get('options').length;
  var self = this;
  var test = function(condition) {
    for (var key in condition) {
      var value = condition[key];
      var setting = self.settings[key];
      if (setting.selected('key') !== value) { return false; }
    }
    return true;
  };

  return supported && (!item.condition || test(item.condition));
};

/**
 * Settings aliases provide
 * convenient pointers to
 * specific settings based on
 * the state of other settings.
 *
 * @type {Object}
 */
var aliases = {
  recorderProfiles: {
    map: {
      back: 'recorderProfilesBack',
      front: 'recorderProfilesFront'
    },
    get: function() {
      var camera = this.settings.cameras.selected('key');
      return this.settings[this.map[camera]];
    }
  },
  pictureSizes: {
    map: {
      back: 'pictureSizesBack',
      front: 'pictureSizesFront'
    },
    get: function() {
      var camera = this.settings.cameras.selected('key');
      return this.settings[this.map[camera]];
    }
  },
  flashModes: {
    map: {
      video: 'flashModesVideo',
      picture: 'flashModesPicture'
    },
    get: function() {
      var mode = this.settings.mode.selected('key');
      return this.settings[this.map[mode]];
    }
  }
};

var formatters = {
  pictureSizes: function(options) {
    var getMP = function(w, h) { return Math.round((w * h) / 1000000); };
    var maxPixelSize = this.get('maxPixelSize');
    var MP = navigator.mozL10n.get('mp');
    var normalized = [];

    options.forEach(function(option) {
      var w = option.width;
      var h = option.height;
      var pixelSize = w * h;

      // Don't allow pictureSizes above the maxPixelSize limit
      if (maxPixelSize && pixelSize > maxPixelSize) {
        return;
      }

      option.aspect = getAspect(w, h);
      option.mp = getMP(w, h);

      var mp = option.mp ? option.mp + MP + ' ' : '';

      normalized.push({
        key: w + 'x' + h,
        title: mp + w + '×' + h + ' ' + option.aspect,
        data: option
      });
    });

    return normalized;
  }
};

/**
 * Returns aspect ratio string.
 *
 * Makes use of Euclid's GCD algorithm,
 * http://en.wikipedia.org/wiki/Euclidean_algorithm
 *
 * @param  {Number} w
 * @param  {Number} h
 * @return {String}
 */
function getAspect(w, h) {
  var gcd = function(a, b) { return (b === 0) ? a : gcd(b, a % b); };
  var divisor = gcd(w, h);
  return (w / divisor) + ':' + (h / divisor);
}

});
