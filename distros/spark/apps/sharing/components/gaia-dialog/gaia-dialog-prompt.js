;(function(define){define(['require','exports','module','gaia-text-input','gaia-dialog'],function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Dependencies
 */

var GetTextInput = require('gaia-text-input');
var GaiaDialog = require('gaia-dialog');

/**
 * Extend from `GaiaDialog` prototype
 *
 * @type {Object}
 */
var proto = GaiaDialog.extend();

/**
 * Runs when an instance of `GaiaTabs`
 * is first created.
 *
 * The initial value of the `select` attribute
 * is used to select a tab.
 *
 * @private
 */
proto.createdCallback = function() {
  this.onCreated();

  this.els.input = this.shadowRoot.querySelector('gaia-text-input');
  this.els.submit = this.shadowRoot.querySelector('.submit');
  this.els.cancel = this.shadowRoot.querySelector('.cancel');

  this.els.input.placeholder = this.firstChild.textContent;
  this.els.cancel.addEventListener('click', this.close.bind(this));
  this.els.submit.addEventListener('click', this.close.bind(this));
};

proto.template = `
<style>
gaia-dialog-prompt {
  display: none;
}

gaia-dialog-prompt[opened],
gaia-dialog-prompt.animating {
  display: block;
  position: fixed;
  width: 100%;
  height: 100%;
}

gaia-text-input {
  margin: 16px !important;
}
</style>

<gaia-dialog>
  <div><gaia-text-input></gaia-text-input></div>
  <fieldset>
    <button class="cancel">Cancel</button>
    <button class="submit primary">Ok</button>
  </fieldset>
</gaia-dialog>`;

// Register and expose the constructor
try {
  module.exports = document.registerElement('gaia-dialog-prompt', { prototype: proto });
  module.exports.proto = proto;
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-prompt',this));
