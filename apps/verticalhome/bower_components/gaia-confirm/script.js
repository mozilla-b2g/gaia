(function(define){define(function(require,exports,module){
'use strict';

/**
 * The gaia-confirm component displays
 * a dialog in which the user has a choice
 * to confirm or cancel the action.
 *
 * It may be displayed along with a title,
 * description, and image. Buttons may
 * also be configured.
 */

/**
 * Dependencies
 */

var utils = require('gaia-component-utils');

// Extend from the HTMLElement prototype
var proto = Object.create(HTMLElement.prototype);

// Allow baseurl to be overridden (used for demo page)
var baseUrl = window.GaiaConfirmBaseUrl || '/bower_components/gaia-confirm/';

var stylesheets = [{ url: baseUrl + 'style.css' }];

proto.createdCallback = function() {
  var shadow = this.createShadowRoot();
  this._template = template.content.cloneNode(true);
  shadow.appendChild(this._template);
  utils.style.call(this, stylesheets);
};

var template = document.createElement('template');
template.innerHTML = '<form role="dialog" class="confirm">' +
    '<section>' +
      '<content select="h1"></content>' +
      '<content select="p"></content>' +
    '</section>' +
    '<content select="gaia-buttons"></content>' +
  '</form>';

// Register and return the constructor
module.exports = document.registerElement('gaia-confirm', { prototype: proto });

});})((function(n,w){return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:function(c){
var m={exports:{}},r=function(n){return w[n];};w[n]=c(r,m.exports,m)||m.exports;};})('gaia-confirm',this));