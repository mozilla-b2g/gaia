/* global define */
;(function(define){'use strict';define(function(require,exports,module){

/**
 * Dependencies
 */

require('gaia-dialog');
var component = require('gaia-component');

/**
 * Exports
 */
module.exports = component.register('gaia-dialog-menu', {
  created: function() {
    this.setupShadowRoot();

    this.els = {
      dialog: this.shadowRoot.querySelector('gaia-dialog'),
      submit: this.shadowRoot.querySelector('.submit'),
      cancel: this.shadowRoot.querySelector('.cancel')
    };

    this.els.dialog.addEventListener('opened', () => {
      this.setAttribute('opened', '');
    });

    this.els.dialog.addEventListener('closed', () => {
      this.removeAttribute('opened');
    });
  },

  open: function(e) {
    this.els.dialog.open(e);
  },

  close: function() {
    this.els.dialog.close();
  },

  template: `
    <gaia-dialog>
      <div class="items"><content select="button"></content></div>
    </gaia-dialog>

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
      text-align: -moz-start;
      background: var(--color-beta);
      color: var(--highlight-color);
    }

    ::content > button[data-icon]:before {
      width: 50px;
      font-size: 22px;
      -moz-margin-start: -16px;
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

    </style>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-menu',this));
