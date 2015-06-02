;(function(define){define(['require','exports','module','gaia-dialog'],function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Dependencies
 */

var GaiaDialog = require('gaia-dialog');

/**
 * Extend from the `HTMLElement` prototype
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
  this.els.submit = this.shadowRoot.querySelector('.submit');
  this.els.cancel = this.shadowRoot.querySelector('.cancel');
};

proto.template = `
<style>
.shadow-host {
  display: none;
}

.shadow-host[opened],
.shadow-host.animating {
  display: block;
  position: fixed;
  width: 100%;
  height: 100%;
}

/** Button
 ---------------------------------------------------------*/

.shadow-content section {
  padding: 33px 16px;
}

.shadow-content button {
  position: relative;
  display: block;
  width: 100%;
  height: 50px;
  margin: 0;
  border: 0;
  padding: 0rem 25px;
  font: inherit;
  background: var(--color-beta);
  color: var(--color-epsilon);
  transition: all 200ms;
  transition-delay: 300ms;
}

.shadow-content button:after {
  content: '';
  display: block;
  position: absolute;
  height: 1px;
  left: 6px;
  right: 6px;
  top: 49px;
  background: #E7E7E7;
}

.shadow-content button:last-child:after {
  display: none;
}

.shadow-content button:active {
  background-color: var(--highlight-color);
  color: #fff;
  transition: none;
}

.shadow-content button:active:after {
  background: var(--highlight-color);
  transition: none;
}
</style>

<gaia-dialog>
  <section>
    <content select="h1"></content>
  </section>
  <content select="button"></content>
  <button class="cancel">Cancel</button>
</gaia-dialog>`;

// Register and expose the constructor
try {
  module.exports = document.registerElement('gaia-dialog-action', { prototype: proto });
  module.exports.proto = proto;
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-action',this));
