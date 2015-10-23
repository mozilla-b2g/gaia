define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:overlay');
var View = require('view');
var bind = require('lib/bind');

/**
 * Exports
 */

module.exports = View.extend({
  className: 'overlay',

  initialize: function(options) {
    var data = this.getData(options.type);
    if (!data) { return; }

    this.data('type', options.type);
    this.data('closable', options.closable);
    this.render(data);
  },

  render: function(data) {

    // Inject HTML
    this.el.innerHTML = this.template(data);

    // Pick out elements
    this.els.buttons = {
      close: this.find('.js-close-btn')
    };

    // Clean up
    delete this.template;

    debug('rendered');
    return this.bindEvents();
  },

  rendered: function() {
    return this.el.innerHTML.length > 0;
  },

  bindEvents: function() {
    bind(this.els.buttons.close, 'click', this.onButtonClick);
    return this;
  },

  template: function(data) {
    /*jshint maxlen:false*/
    return '<form role="dialog" data-type="confirm">' +
      '<section>' +
        '<h1 class="overlay-title" data-l10n-id="' + data.title + '"></h1>' +
        '<p id="overlay-text" data-l10n-id="' + data.body + '"></p>' +
      '</section>' +
      '<menu class="overlay-menu-close">' +
        '<button class="full js-close-btn" type="button" ' +
        'data-l10n-id="' + data.closeButtonText + '" name="close-btn">' +
        '</button>' +
      '</menu>' +
    '</form>';
  },

  getData: function(type) {
    var data = {};

    switch (type) {
      case 'unavailable':
        data.title = 'nocard2-title';
        data.body = 'nocard3-text';
      break;
      case 'nospace':
        data.title = 'nospace2-title';
        data.body = 'nospace2-text';
      break;
      case 'shared':
        data.title = 'pluggedin2-title';
        data.body = 'pluggedin2-text';
      break;
      case 'shutdown':
        data.title = 'battery-shutdown-title';
        data.body = 'battery-shutdown-text';
      break;
      case 'request-fail':
        data.title = 'camera-unavailable-title';
        data.body = 'camera-unavailable-text';
      break;
      default:
        return false;
    }

    data.closeButtonText = 'close-button';
    return data;
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
