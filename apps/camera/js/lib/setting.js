define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var Model = require('vendor/model');
var storage = require('asyncStorage');
var debug = require('debug')('setting');

/**
 * Exports
 */

module.exports = Setting;

// Extend Model
Setting.prototype = Object.create(Model.prototype);

function Setting(data) {
  this.key = data.key;
  this.configure(data);
  this.reset(data, { silent: true });
  if (data.persistent) { this.on('change:selected', this.save); }
}

Setting.prototype.configure = function(data) {
  var options = data.options;
  data.originalOptions = data.options;
  data.optionValues = options.map(function(option) { return option.value; });
  data.selected = data.default;
};

Setting.prototype.next = function() {
  var options = this.get('options');
  var index = this.get('selected');
  var newIndex = (index + 1) % options.length;
  this.setOptionByIndex(newIndex);
};

Setting.prototype.value = function(value) {
  if (value) { return this.setValue(value); }

  var options = this.get('options');
  var selected = this.get('selected');
  var option = options[selected];

  return option && option.value;
};

Setting.prototype.setValue = function(value) {
  switch (typeof value) {
    case 'number': return this.setOptionByIndex(value);
    case 'string': return this.setOptionByValue(value);
  }
};

// Not needed yet
Setting.prototype.setOptionByValue = function(value) {
  var keys = this.get('optionValues');
  var index = keys.indexOf(value);
  this.setOptionByIndex(index);
};

// TODO: Tidy this mess
Setting.prototype.setOptionByIndex = function(index, options) {
  debug('set option by index:', index);

  var list = this.get('options');
  var oldIndex = this.get('selected');
  var oldOption = list[oldIndex];
  var newOption = list[index];

  if (!list.length) { return; }
  if (!newOption) {
    this.setOptionByIndex(0);
    return;
  }

  if (oldOption) { delete oldOption.selected; }
  newOption.selected = true;
  this.set('selected', index, options);
};

Setting.prototype.updateSelected = function(options) {
  this.setOptionByIndex(this.get('selected'), options);
};

Setting.prototype.configureOptions = function(values) {
  var config = this.get('originalOptions');
  var filtered = config.filter(function(option) {
    return values && !!~values.indexOf(option.value);
  });

  this.set('options', filtered);
  this.updateSelected();
};

Setting.prototype.save = function() {
  storage.setItem('settings:' + this.key, this.get('selected'));
  debug('saving key: %s', this.key);
  return this;
};

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