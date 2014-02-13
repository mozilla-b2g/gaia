define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var OptionsView = require('views/setting-options');
var debug = require('debug')('view:settings');
var SettingView = require('views/setting');
var View = require('vendor/view');
var bind = require('lib/bind');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'settings',

  initialize: function(options) {
    this.items = options.items;
    this.children = [];
    this.on('destroy', this.onDestroy);
    bind(this.el, 'click', this.onClick);
  },

  onClick: function(e) {
    e.stopPropagation();
  },

  onItemClick: function(view) {
    var model = view.model;
    var optionsView = new OptionsView({ model: model });
    var self = this;

    optionsView
      .render()
      .appendTo(this.els.pane2)
      .on('click:option', model.select)
      .on('click:back', function() {
        self.showPane(1);
        setTimeout(optionsView.destroy, 400);
      });

    this.showPane(2);
    this.children.push(optionsView);
  },

  onDestroy: function() {
    this.children.forEach(this.destroyChild);
    debug('destroyed');
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.items = this.find('.js-items');
    this.els.pane2 = this.find('.js-pane-2');
    this.items.forEach(this.addItem);
    debug('rendered');
    return this;
  },

  destroyChild: function(view) {
    view.destroy();
    debug('destroyed child');
  },

  addItem: function(model) {
    var view = new SettingView({ model: model });

    view
      .render()
      .appendTo(this.els.items)
      .on('click', this.onItemClick);

    this.children.push(view);
    debug('initialized child');
  },

  showPane: function(name) {
    this.el.setAttribute('show-pane', 'pane-' + name);
  },

  template: function() {
    return '<div class="pane pane-1">' +
      '<div class="settings_inner">' +
        '<h2 class="settings_title">Options</h2>' +
        '<ul class="settings_items js-items"></ul>' +
      '</div>' +
    '</div>' +
    '<div class="pane pane-2 js-pane-2"></div>';
  }
});

});
