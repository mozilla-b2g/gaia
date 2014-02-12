define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var attach = require('vendor/attach');
var SettingView = require('views/setting');
var debug = require('debug')('view:settings');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'setting-options',

  initialize: function(options) {
    this.model = options.model;
    this.on('destroy', this.onDestroy);
    attach(this.el, 'click', 'li', this.onItemClick);
    attach(this.el, 'click', '.js-back', this.firer('click:back'));
  },

  onDestroy: function() {},

  render: function() {
    var data = this.model.get();
    this.selectedKey = data.selected;
    this.el.innerHTML = this.template(data);
    this.els.list = this.find('.js-list');
    data.options.forEach(this.renderOption);
    return this;
  },

  renderOption: function(option) {
    var li = document.createElement('li');
    var isSelected = option.key === this.selectedKey;
    li.textContent = option.title;
    li.setAttribute('data-key', option.key);
    li.className = 'icon-tick';
    this.els.list.appendChild(li);
    if (isSelected) { li.classList.add('selected'); }
  },

  onItemClick: function(event, el) {
    var key = el.getAttribute('data-key');
    this.emit('click:option', key);
  },

  template: function(data) {
    return '<div class="inner">' +
      '<h2 class="setting-options_title icon-back-arrow js-back">' + data.title + '</h2>' +
      '<ul class="setting-options_items js-list"></ul>' +
    '</div>';
  }
});

});
