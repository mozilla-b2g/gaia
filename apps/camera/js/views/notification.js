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
    this.clearMessage();
    if (options.isPersistent) {
      this.clearPersistent();
      this.persistentMessage = options;
    }
    this.showMessage(options);
  },
  
  showMessage: function(options) {
    var message = this.l10n.get(options.message) || options.message;
    var iconElement = options.icon ?
                      '<div class="imgBox '+options.icon+'" ></div>' : '';
    var self = this;
    this.els.notification.innerHTML = iconElement+message;
    this.show();
    if (!options.isPersistent) {
      this.timeout = window.setTimeout(function() {
        self.clearMessage();
        if (self.persistentMessage) {
          self.showMessage(self.persistentMessage);
        }
      }, 3000);
    }
  },

  clearMessage: function() {
    if (this.timeout) {
      window.clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.els.notification.innerHTML = '';
    this.hide();
  },

  clearPersistent: function() {
    if (this.persistentMessage) {
      this.clearMessage();
      this.persistentMessage = null;
    }
  }

});

});