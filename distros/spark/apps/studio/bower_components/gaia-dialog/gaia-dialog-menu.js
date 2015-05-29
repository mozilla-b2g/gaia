;(function(define){define(function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Dependencies
 */

var GaiaDialog = require('gaia-dialog');

/**
 * Detects presence of shadow-dom
 * CSS selectors.
 *
 * @return {Boolean}
 */
var hasShadowCSS = (function() {
  try { document.querySelector(':host'); return true; }
  catch (e) { return false; }
})();

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
:host {
  display: none;
}

:host[opened],
:host.animating {
  display: block;
  position: fixed;
  width: 100%;
  height: 100%;
}

::content > button {
  position: relative;
  display: block;
  width: 100%;
  height: 50px;
  line-height: 50px;
  margin: 0;
  border: 0;
  padding: 0rem 16px;
  font: inherit;
  font-style: italic;
  text-align: left;
  background: var(--color-beta);
  color: var(--highlight-color);
}

::content > button[data-icon]:before {
  width: 50px;
  font-size: 22px;
  margin-left: -16px;
  vertical-align: middle;
  text-align: center;
}

/** Button Divider Line
 ---------------------------------------------------------*/

::content > button:after {
  content: '';
  display: block;
  position: absolute;
  height: 1px;
  left: 6px;
  right: 6px;
  top: 49px;
  background: #E7E7E7;
}

::content > button:last-of-type:after {
  display: none;
}

</style>

<gaia-dialog>
  <div class="items"><content select="button"></content></div>
</gaia-dialog>`;

// If the browser doesn't support shadow-css
// selectors yet, we update the template
// to use the shim classes instead.
if (!hasShadowCSS) {
  proto.template = proto.template
    .replace('::content', 'gaia-dialog-menu.shadow-content', 'g')
    .replace(':host', 'gaia-dialog-menu.shadow-host', 'g');
}

// Register and expose the constructor
try {
  module.exports = document.registerElement('gaia-dialog-menu', { prototype: proto });
  module.exports.proto = proto;
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-menu',this));
