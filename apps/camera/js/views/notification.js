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
    this.persistentMessage = false;
    this.el.innerHTML = this.render();
    this.l10n = navigator.mozL10n;
    this.timeout = null;
    this.els.transientElm = find('.js-transient', this.el);
    this.els.persistentElm = find('.js-persistent', this.el);
    
  },

  render: function() {
    return '<div class="js-transient "></div>'+
           '<div class="js-persistent"></div>';
  },

  showNotification: function(options) {
    this.checkMessageState(options);
    if (options.isPersistent) {
      this.showPersistentMessage(options);
      this.persistentMessage = options.isPersistent;
    } else {
      this.showTransientMessage(options);
    }
  },

  showPersistentMessage: function(options) {
    var message = this.l10n.get(options.message) ?
                  this.l10n.get(options.message) : options.message;
    var iconElement = options.icon ?
                      '<div class="imgBox '+options.icon+'" ></div>' : '';

    this.els.persistentElm.innerHTML = iconElement+message;
    this.els.persistentElm.classList.add('normal');
    this.els.persistentElm.classList.remove('hidden');
  },
  
  showTransientMessage: function(options) {
    var message = this.l10n.get(options.message) ?
                  this.l10n.get(options.message) : options.message;
    var iconElement = options.icon ?
                      '<div class="imgBox '+options.icon+'" ></div>' : '';
    var self = this;
    this.els.transientElm.innerHTML = iconElement+message;
    this.els.transientElm.classList.add('normal');
    this.timeout = window.setTimeout(function() {
      self.clearTransientMessage();
      if (self.persistentMessage) {
        self.els.persistentElm.classList.remove('hidden');
      }
    }, 3000);
  },

  clearTransientMessage: function() {
    if (this.timeout) {
      window.clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.els.transientElm.innerHTML = '';
  },

  hidePersistentMessage: function() {
    this.els.persistentElm.classList.add('hidden');
  },

  clearPersistentMessage: function() {
    this.els.persistentElm.innerHTML = '';
    this.hidePersistentMessage();
  },

  checkMessageState: function(options) {
    this.clearTransientMessage();
    if (options.isPersistent) {
      this.clearPersistentMessage();
    } else if (this.persistentMessage) {
      this.hidePersistentMessage();
    }
  },
  
});

});