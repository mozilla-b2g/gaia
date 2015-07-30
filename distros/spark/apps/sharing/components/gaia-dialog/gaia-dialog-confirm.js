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
module.exports = component.register('gaia-dialog-confirm', {
  created: function() {
    this.setupShadowRoot();

    this.els = {
      dialog: this.shadowRoot.querySelector('gaia-dialog'),
      submit: this.shadowRoot.querySelector('.submit'),
      cancel: this.shadowRoot.querySelector('.cancel')
    };

    this.els.cancel.addEventListener('click', this.close.bind(this));
    this.els.submit.addEventListener('click', this.close.bind(this));
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
      <section>
        <p><content></content></p>
      </section>
      <fieldset>
        <button class="cancel">Cancel</button>
        <button class="submit danger">Confirm</button>
      </fieldset>
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

    </style>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-confirm',this));
