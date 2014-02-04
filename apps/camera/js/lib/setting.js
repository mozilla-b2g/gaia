define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('setting');
var storage = require('asyncStorage');
var model = require('vendor/model');

/**
 * Exports
 */

module.exports = Setting;

// Mixin Model methods
model(Setting.prototype);

/**
 * Initialize a new `Setting` model.
 *
 * @param {Object} data
 */
function Setting(data) {
  this.key = data.key;
  this.configure(data);
  this.reset(data, { silent: true });
}

Setting.prototype.configure = function(data) {
  var options = data.options;
  data.originalOptions = data.options;
  data.optionValues = options.map(function(option) { return option.value; });
  if (data.persistent) { this.on('change:selected', this.save); }
};

/**
 * Set the `selected` option to
 * the next option in the list.
 *
 * First option is chosen if
 * there is no next option.
 */
Setting.prototype.next = function() {
  var options = this.get('options');
  var index = this.get('selected');
  var newIndex = (index + 1) % options.length;
  this.setOptionByIndex(newIndex);
};

/**
 * Get the value of the currently
 * selected option.
 *
 * @return {*}
 */
Setting.prototype.value = function() {
  return this.selected('value');
};

/**
 * Get the selected option,
 * or just a particular key
 * if given.
 *
 * @param  {String} key
 * @return {Object|*}
 */
Setting.prototype.selected = function(key) {
  var options = this.get('options');
  var selected = this.get('selected');
  var option = options[selected];
  return key ? option && option[key] : option;
};

/**
 * Set the `selected` option to
 * the given option index.
 *
 * @param {Number} index
 * @param {Object} opts  Model#set() options
 */
Setting.prototype.setOptionByIndex = function(index, opts) {
  debug('set option by index:', index);

  var options = this.get('options');
  var index_old = this.get('selected');
  var selected_old = options[index_old];
  var selected_new = options[index];

  // Remove old `selected` key
  if (selected_old) { delete selected_old.selected; }

  // Edge cases
  if (!options.length) { return; }
  if (!selected_new) { return this.setOptionByIndex(0); }

  // Add new `selected` key and save
  selected_new.selected = true;
  this.set('selected', index, opts);
};

Setting.prototype.updateSelected = function(options) {
  this.setOptionByIndex(this.get('selected'), options);
};

/**
 * Filters the setting's `option`s
 * based on the list of values given.
 *
 * @param  {Array} values
 */
Setting.prototype.configureOptions = function(values) {
  var config = this.get('originalOptions');
  var filtered = config.filter(function(option) {
    return values && !!~values.indexOf(option.value);
  });

  this.set('options', filtered);
  this.updateSelected();
};

/**
 * Persists the current selection
 * to storage for retreval in the
 * next session.
 */
Setting.prototype.save = function() {
  storage.setItem('settings:' + this.key, this.get('selected'));
  debug('saving key: %s', this.key);
};

/**
 * Fetches the persisted selection
 * from storage, updating the
 * `selected` key.
 *
 * @param  {Function} done
 */
Setting.prototype.fetch = function(done) {
  var self = this;
  debug('fetch value');
  storage.getItem('settings:' + this.key, function(value) {
    if (value) { self.set('selected', value, { silent: true }); }
    debug('fetched %s value: %s', self.key, value);
    if (done) { done(); }
  });
};

});