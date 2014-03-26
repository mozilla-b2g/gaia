define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:setting-options');
var attach = require('vendor/attach');
var View = require('vendor/view');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'setting-options',

  initialize: function(options) {
    this.model = options.model;
    this.on('destroy', this.onDestroy);
    attach(this.el, 'click', 'li', this.onOptionClick);
    attach(this.el, 'click', '.js-back', this.firer('tap:back'));
    this.model.on('change:selected', this.onSelectedChange);
    debug('initialized');
  },

  onDestroy: function() {
    this.model.off('change:selected', this.onSelectedChange);
  },

  onOptionClick: function(event, el) {
    var key = el.getAttribute('data-key');
    this.emit('tap:option', key, this.model);
  },

  onSelectedChange: function(key) {
    var next = this.els[key];
    this.els.selected.classList.remove('selected');
    next.classList.add('selected');
    this.els.selected = next;
  },

  render: function() {
    var data = this.model.get();
    this.selectedKey = data.selected;
    this.el.innerHTML = this.template(data);
    this.els.ul = this.find('.js-list');
    data.options.forEach(this.renderOption);
    return this;
  },

  renderOption: function(option) {
    var li = document.createElement('li');
    var isSelected = option.key === this.selectedKey;

    li.textContent = option.title;
    li.setAttribute('data-key', option.key);
    li.className = 'setting-option icon-tick';
    this.els.ul.appendChild(li);
    this.els[option.key] = li;

    if (isSelected) {
      li.classList.add('selected');
      this.els.selected = li;
    }
  },

  template: function(data) {
    return '<div class="inner">' +
      '<h2 class="settings_title icon-back-arrow js-back">' +
      data.title + '</h2>' +
      '<div class="settings_items"><ul class="inner js-list"></ul></div>' +
    '</div>';
  }
});

});
