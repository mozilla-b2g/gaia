define(function(require, exports, module) {
'use strict';

/**
* Dependencies
*/

var View = require('vendor/view');
var find = require('lib/find');

/**
* Exports
*/

module.exports = View.extend({
  name:'notification',

  initialize: function() {
    this.persistentMessage = null;
    this.l10n = navigator.mozL10n;
    this.timeout = null;
    this.render();
    this.hide();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.notification = find('.js-notification', this.el);
    
  },

  template: function() {
    return '<div class="js-notification"></div>';
  },

  showNotification: function(options) {
    if (options.isPersistent) {
      this.persistentMessage = options;
      this._clearMessage();
    } else {
      this._showMessage(options);
    }
  },
  
  _showMessage: function(options) {
    var message = this.l10n.get(options.message) || options.message;
    var iconElement = options.icon ?
                      '<div class="imgBox '+options.icon+'" ></div>' : '';
    this.els.notification.innerHTML = iconElement+message;
    this.show();
    if (!options.isPersistent) {
      this.timeout = setTimeout(this._clearMessage, 3000);
    }
  },

  _clearMessage: function() {
    if (this.timeout) {
      window.clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.els.notification.textContent = '';
    if (this.persistentMessage) {
      this._showMessage(this.persistentMessage);
    } else {
      this.hide();
    }
  },

  hideNotification: function() {
    if (this.persistentMessage) {
      this.persistentMessage = null;
    }
    this._clearMessage();
  }

});

});