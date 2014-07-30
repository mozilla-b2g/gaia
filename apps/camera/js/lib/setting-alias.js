define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('setting-alias');

/**
 * Locals
 */

var forwardMethods = [
  'filterOptions',
  'resetOptions',
  'supported',
  'selected',
  'select',
  'next',
  'get',
  'set'
];

/**
 * Exports
 */

module.exports = SettingAlias;

/**
 * Initialize a new `SettingsAlias`
 *
 * SettingsAlias's are kinda confusing,
 * but they simplify our app code massively
 * in the long run.
 *
 * A `SettingAlias` has the same API as a `Setting`
 * but behind the scenes provides a single interface
 * to several `Setting`s. Depending on the state
 * of the app, the `SettingAlias` will point to
 * a different settings instance.
 *
 * Example:
 *
 *    var flashModesPicture = new Setting({ key: 'flashModesPicture' });
 *    var flashModesVideo = new Setting({ key: 'flashModesVideo' });
 *    var mode = 'picture';
 *
 *    var flashModes = new SettingAlias({
 *      key: 'flashModes',
 *      settings: {
 *        'picture': flashModesPicture,
 *        'video': flashModesVideo
 *      },
 *      get: function() {
 *        return this.settings[mode];
 *      }
 *    });
 *
 *    flashModes.get('key'); //=> 'flashModesPicture'
 *    mode = 'video';
 *    flashModes.get('key'); //=> 'flashModesVideo'
 *
 * This means our app can simply call API on
 * `flashModes` setting-alias and not worry
 * about which 'mode' the app is in.
 *
 * Options:
 *
 *   - `key` The name of the setting-alias
 *   - `settings` Hash of possible `Setting`s
 *   - `get` Method that returns the current `Setting`
 *
 * @param {Object} options
 */
function SettingAlias(options) {
  debug('initialize');
  this.key = options.key;
  this.settings = options.settings;
  this.current = options.get.bind(this);
  forwardMethods.forEach(this.forward, this);
  debug('initialized');
}

/**
 * Iterates over each setting.
 *
 * @param  {Function} fn
 * @private
 */
SettingAlias.prototype.each = function(fn) {
  for (var key in this.settings) {
    fn(this.settings[key]);
  }
};

/**
 * States whether the passed key
 * is the currently active setting.
 *
 * @param  {String}  key
 * @return {Boolean}
 */
SettingAlias.prototype.is = function(key) {
  return this.get('key') === key;
};

/**
 * Attaches a method that forwards
 * the call onto the current
 * matching setting.
 *
 * @param  {String} method
 */
SettingAlias.prototype.forward = function(method) {
  this[method] = function() {
    var setting = this.current();
    return setting[method].apply(setting, arguments);
  };
};

/**
 * Add an event callback.
 *
 * The callback is wrapped in
 * a function that first checks that
 * the setting is the active setting
 * before calling the original callback.
 *
 * @param  {String}   name
 * @param  {Function} fn
 */
SettingAlias.prototype.on = function(name, fn) {
  var alias = this;
  var wrapped = function() {
    if (!alias.is(this.key)) { return; }
    fn.apply(this, arguments);
  };

  this.each(function(setting) { setting.on(name, wrapped); });
  fn._settingAliasCallback = wrapped;
};

/**
 * Remove an event callback.
 *
 * @param  {String}   name
 * @param  {Function} fn
 */
SettingAlias.prototype.off = function(name, fn) {
  var wrapped = fn._settingAliasCallback;
  this.each(function(setting) { setting.off(name, wrapped); });
  delete fn._settingAliasCallback;
};

});
