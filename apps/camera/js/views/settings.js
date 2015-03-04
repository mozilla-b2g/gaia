define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:settings');
var OptionsView = require('views/setting-options');
var SettingView = require('views/setting');
var View = require('view');
var bind = require('lib/bind');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'settings',
  fadeTime: 150,

  initialize: function(options) {
    this.OptionsView = options.OptionsView || OptionsView;
    this.items = options.items;
    this.children = [];
    this.on('destroy', this.onDestroy);
    bind(this.el, 'click', this.onClick);
  },

  onClick: function(e) {
    e.stopPropagation();
  },

  onItemClick: function(view) {
    this.showSetting(view.model);
  },

  showSetting: function(model) {
    this.optionsView = new this.OptionsView({ model: model })
      .render()
      .appendTo(this.els.pane2)
      .on('click:option', this.firer('click:option'))
      .on('click:back', this.goBack);

    this.showPane(2);
  },

  onDestroy: function() {
    this.children.forEach(this.destroyChild);
    this.destroyOptionsView();
    debug('destroyed');
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.items = this.find('.js-items');
    this.els.pane2 = this.find('.js-pane-2');
    this.els.close = this.find('.js-close');
    this.items.forEach(this.addItem);

    // Clean up
    delete this.template;

    debug('rendered');
    return this.bindEvents();
  },

  bindEvents: function() {
    bind(this.els.close, 'click', this.firer('click:close'));
    return this;
  },

  goBack: function() {
    this.showPane(1);
    this.destroyOptionsView();
  },

  destroyChild: function(view) {
    view.destroy();
    debug('destroyed child');
  },

  destroyOptionsView: function() {
    if (this.optionsView) {
      this.optionsView.destroy();
      this.optionsView = null;
      debug('options view destroyed');
    }
  },

  addItem: function(model) {
    var setting = new SettingView({ model: model })
      .render()
      .appendTo(this.els.items)
      .on('click', this.onItemClick);

    this.children.push(setting);
    debug('add item key: %s', model.key);
  },

  showPane: function(name) {
    this.el.setAttribute('show-pane', 'pane-' + name);
  },

  fadeIn: function(done) {
    setTimeout(this.show);
    if (!done) { return; }
    setTimeout(done, this.fadeTime);
  },

  fadeOut: function(done) {
    this.hide();
    if (!done) { return; }
    setTimeout(done, this.fadeTime);
  },

  template: function() {
    return '<div class="pane pane-1">' +
      '<div class="inner">' +
        '<div class="settings_inner">' +
          '<div class="settings_header">' +
            '<h2 class="settings_title" data-l10n-id="options" ' +
              'aria-level="1"></h2>' +
          '</div>' +
          '<div class="settings_items">' +
            '<ul class="inner js-items" role="listbox"></ul>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="pane pane-2">' +
      '<div class="inner js-pane-2"></div>' +
    '</div>' +
    '<div role="button" class="settings_close js-close" data-icon="menu" ' +
      'data-l10n-id="close-menu-button"></div>';
  }
});

});
