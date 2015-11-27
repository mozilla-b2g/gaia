/* global define */
;(function(define){'use strict';define(function(require,exports,module){
/**
 * Dependencies
 */

var GaiaDialogProto = require('gaia-dialog').prototype;
var component = require('gaia-component');

/**
 * Exports
 */
module.exports = component.register('gaia-dialog-action', {
  created: function() {
    this.setupShadowRoot();

    this.els = {
      dialog: this.shadowRoot.querySelector('gaia-dialog'),
      submit: this.shadowRoot.querySelector('.submit'),
      cancel: this.shadowRoot.querySelector('.cancel')
    };

    this.els.dialog.addEventListener('closed',
      GaiaDialogProto.hide.bind(this));
  },

  open: function(e) {
    return GaiaDialogProto.show.call(this)
      .then(() => this.els.dialog.open(e));
  },

  close: function() {
    // First close (hide) inner dialog and then the container.
    return this.els.dialog.close()
      .then(GaiaDialogProto.hide.bind(this));
  },

  template: `
    <gaia-dialog>
      <section>
        <content select="h1"></content>
      </section>
      <content select="button"></content>
      <button on-click="close" class="cancel">Cancel</button>
    </gaia-dialog>

    <style>

    :host {
      position: fixed;
      width: 100%;
      height: 100%;
      z-index: 999;

      display: none;
    }

    gaia-dialog section {
      max-width: 320px;
    }

    /** Button
     ---------------------------------------------------------*/

    ::content section {
      padding: 33px 16px;
    }

    ::content button {
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

    ::content button:after {
      content: '';
      display: block;
      position: absolute;
      height: 1px;
      left: 6px;
      right: 6px;
      top: 49px;
      background: #E7E7E7;
    }

    ::content button:last-child:after {
      display: none;
    }

    ::content button:active {
      background-color: var(--highlight-color);
      color: #fff;
      transition: none;
    }

    ::content button:active:after {
      background: var(--highlight-color);
      transition: none;
    }

    </style>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-action',this));
