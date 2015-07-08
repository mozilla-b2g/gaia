/* global define */
;(function(define){'use strict';define(['require','exports','module','gaia-dialog','gaia-component'],function(require,exports,module){

/**
 * Dependencies
 */

var GaiaDialogProto = require('gaia-dialog').prototype;
var component = require('gaia-component');

/**
 * Exports
 */
module.exports = component.register('gaia-dialog-menu', {
  created: function() {
    this.setupShadowRoot();
    this.els = {
      dialog: this.shadowRoot.querySelector('gaia-dialog')
    };
  },

  open: function(e) {
    return GaiaDialogProto.show.call(this)
      .then(() => this.els.dialog.open(e));
  },

  close: function() {
    return GaiaDialogProto.show.call(this)
      .then(() => this.els.dialog.close());
  },

  template: `
    <gaia-dialog>
      <div class="items"><content select="button"></content></div>
    </gaia-dialog>

    <style>

    :host {
      display: none;
      position: fixed;
      width: 100%;
      height: 100%;
    }

    ::content > button {
      position: relative;
      display: block;
      width: 100%;
      height: 50px;
      line-height: 51px;
      margin: 0;
      border: 0;
      padding: 0rem 16px;
      font: inherit;
      font-style: italic;
      text-align: start;
      background: var(--color-beta);
      color: var(--highlight-color);
    }

    ::content > button[data-icon]:before {
      width: 50px;
      font-size: 22px;
      vertical-align: middle;
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

    </style>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-menu',this));
