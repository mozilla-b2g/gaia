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
    this.el.innerHTML = this.render();
    this.l10n = navigator.mozL10n;
    this.timeout = null;
    this.els.notification = find('.js-notification', this.el);
    this.hide();
  },

  render: function() {
    return '<div class="js-notification"></div>';
  },

  showNotification: function(options) {
    this._clearMessage();
    if (options.isPersistent) {
      this.hideNotification();
      this.persistentMessage = options;
    }
    this._showMessage(options);
  },
  
  _showMessage: function(options) {
    var message = this.l10n.get(options.message) || options.message;
    var iconElement = options.icon ?
                      '<div class="imgBox '+options.icon+'" ></div>' : '';
    var self = this;
    this.els.notification.innerHTML = iconElement+message;
    this.show();
    if (!options.isPersistent) {
      this.timeout = window.setTimeout(function() {
        self._clearMessage();
      }, 3000);
    }
  },

  _clearMessage: function() {
    if (this.timeout) {
      window.clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.els.notification.textContent = '';
    this.hide();
    if (this.persistentMessage) {
      this._showMessage(this.persistentMessage);
    }
  },

  hideNotification: function() {
    if (this.persistentMessage) {
      this.persistentMessage = null;
      this._clearMessage();
    }
  }

});

});