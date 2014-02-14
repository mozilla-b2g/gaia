define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var find = require('utils/find');
var bind = require('utils/bind');

/**
 * Exports
 */

module.exports = View.extend({
  className: 'overlay',

  initialize: function(options) {
    this.model = options.data;
    this.data('type', options.type);
    this.data('closable', options.closable);
    this.render();
  },

  render: function() {

    // Inject HTML
    this.el.innerHTML = this.template(this.model);

    // Pick out elements
    this.els.buttons = {
      storage: find('.js-storage-btn', this.el),
      close: find('.js-close-btn', this.el)
    };

    // Attach event listeners
    bind(this.els.buttons.storage, 'click', this.onButtonClick, this);
    bind(this.els.buttons.close, 'click', this.onButtonClick, this);
  },

  template: function(data) {
    /*jshint maxlen:false*/
    return '<form role="dialog" data-type="confirm">' +
      '<section>' +
        '<h1 class="overlay-title">' + data.title + '</h1>' +
        '<p id="overlay-text">' + data.body + '<p>' +
      '</section>' +
      '<menu class="overlay-menu-close">' +
        '<button class="full js-close-btn" type="button" name="close-btn">' +
        data.closeButtonText + '</button>' +
      '</menu>' +
      '<menu class="overlay-menu-storage">' +
        '<button class="full js-storage-btn" type="button"' +
        'name="storage-settings-btn">' + data.storageButtonText + '</button>' +
      '</menu>' +
    '</form>';
  },

  data: function(key, value) {
    switch (arguments.length) {
      case 1: return this.el.getAttribute('data-' + key);
      case 2: this.el.setAttribute('data-' + key, value);
    }
  },

  onButtonClick: function(event) {
    var el = event.currentTarget;
    var name = el.getAttribute('name');
    this.emit('click:' + name);
  }
});

});
