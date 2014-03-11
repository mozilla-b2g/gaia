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

  initialize: function(options) {
    var l10n = navigator.mozL10n;
    this.message = l10n.get(options.message) ?
                   l10n.get(options.message) : options.message;
    this.title = options.title ? 
                 l10n.get(options.title) : null;
    this.fullScreen = options.isFulleScreen;
    this.icon = options.icon ? options.icon : null;
    this.el.innerHTML = this.render();
    this.els.notification = find('.js-notification', this.el);
    this.setMessage(this.fullScreen);
  },

  render: function() {
    return '<div class="js-notification "> </div>';
  },

  showNotification: function() {
    var iconElement = this.icon ?
                      '<div class="imgBox '+this.icon+'" ></div>' : '';
    this.els.notification.innerHTML = iconElement+this.message;
    this.els.notification.classList.add('normal');
   },
  
  showFullScreenMessage: function() {
    var messages = '<div class = "messageTitle" >'+this.title+'</div>'+
                   '<div class = "message" >'+this.message+ ' </div>'; 
    this.els.notification.innerHTML = messages;
    this.els.notification.classList.add('fullScreen');
  },
  
  setMessage: function(type) {
    if (type) {
      this.showFullScreenMessage();
    } else {
      this.showNotification();
    }
  },

});

});