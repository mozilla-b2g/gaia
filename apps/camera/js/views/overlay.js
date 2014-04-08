define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var find = require('lib/find');
var bind = require('lib/bind');

/**
 * Exports
 */

module.exports = View.extend({
  className: 'overlay',

  initialize: function(options) {
    this.model = options.data;
    this.data('type', options.type);
    this.data('closable', options.closable);
    this.data('fullbutton', options.fullButton);
    this.render();
  },

  render: function() {

    // Inject HTML
    this.el.innerHTML = this.template(this.model);

    // Pick out elements
    this.els.buttons = {
      close: find('.js-close-btn', this.el),
      confirm: find('.js-confirm-btn', this.el),
    };

    // Attach event listeners
    bind(this.els.buttons.close, 'click', this.onButtonClick);
    bind(this.els.buttons.confirm, 'click', this.onButtonClick);
  },

  template: function(data) {
    /*jshint maxlen:false*/
    return '<form role="dialog" data-type="confirm">' +
      '<section class="overlay-body">' +
        '<h1 class="overlay-title">' + data.title + '</h1>' +
        '<p id="overlay-text">' + data.body + '<p>' +
      '</section>' +
      '<menu class="overlay-menu-close">' +
        '<button class="full js-close-btn" type="button" name="close-btn">' +
        data.closeButtonText + '</button>' +
        '<button class="second-button js-confirm-btn" type="button" name="confirm-btn">' +
        data.confirmButtonText + '</button>' +
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
  },

  setButtonType: function(recommend) {
    this.els.buttons.close.classList.remove('full');
    this.els.buttons.confirm.classList.remove('hidden');

    if (!recommend) {
      this.els.buttons.confirm.classList.add('danger');
    }
  }
});

});
