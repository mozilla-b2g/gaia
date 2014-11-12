define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:setting-options');
var attach = require('attach');
var View = require('view');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'setting-options',

  initialize: function(options) {
    this.model = options.model;
    this.l10n = options.l10n || navigator.mozL10n;
    this.on('destroy', this.onDestroy);
    attach(this.el, 'click', 'li', this.onOptionClick);
    attach(this.el, 'click', '.js-back', this.firer('click:back'));
    this.model.on('change:selected', this.onSelectedChange);
    debug('initialized');
  },

  onDestroy: function() {
    this.model.off('change:selected', this.onSelectedChange);
  },

  onOptionClick: function(event, el) {
    var key = el.getAttribute('data-key');
    this.emit('click:option', key, this.model);
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

    // we need to pass a boolean flag indicating if the
    // options should be localized
    var localizable = data.optionsLocalizable === false ? false : true;
    data.options.forEach(this.renderOption.bind(this, localizable));

    // Clean up
    delete this.template;

    debug('rendered');
    return this;
  },

  renderOption: function(localizable, option) {
    var li = document.createElement('li');
    var isSelected = option.key === this.selectedKey;

    li.textContent = localizable ? this.l10n.get(option.title) : option.title;
    li.setAttribute('data-key', option.key);
    li.className = 'setting-option';
    li.dataset.icon = 'tick';
    this.els.ul.appendChild(li);
    this.els[option.key] = li;

    if (isSelected) {
      li.classList.add('selected');
      this.els.selected = li;
    }
  },

  template: function(data) {
    return '<div class="inner">' +
      '<div class="settings_header">' +
        '<div class="settings-back-btn js-back" ' +
          'data-icon="back" role="button"></div>' +
        '<h2 class="settings_title" data-l10n-id="' + data.header + '"></h2>' +
      '</div>' +
      '<div class="settings_items"><ul class="inner js-list"></ul></div>' +
    '</div>';
  }
});

});
