define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var Model = require('vendor/model');
var debug = require('debug')('setting');

/**
 * Exports
 */

module.exports = Setting;

/**
 * Locals
 */

var has = {}.hasOwnProperty;

// Extend Model
Setting.prototype = Object.create(Model.prototype);

function Setting(data) {
  this.key = data.key;
  data = this.configure(data);
  this.reset(data, { silent: true });
  this.updateSelected({ silent: true });
}

Setting.prototype.configure = function(data) {
  var newData = {};
  var options = data.options;

  newData.options = data.options;
  newData.originalOptions = data.options;
  newData.optionsKeys = options.map(function(option) { return option.key; });
  newData.selected = data.default;
  newData.value = options[newData.selected];

  return newData;
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
  var keys = this.get('optionsKeys');
  var index = keys.indexOf(value);
  this.setOptionByIndex(index);
};

Setting.prototype.setOptionByIndex = function(index, options) {
  debug('set option by index:', index);

  var list = this.get('options');
  var oldIndex = this.get('selected');
  var oldOption = list[oldIndex];
  var newOption = list[index];
  var newValue = newOption.value;

  delete oldOption.selected;
  newOption.selected = true;

  this.set({ selected: index, value: newValue }, options);
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
  this.updateSelected({ silent: true });
};

Setting.prototype.saveValue = function() {

};

Setting.prototype.fetchValue = function() {

};

});