/* global define */
;(function(define){'use strict';define(function(require,exports,module){

/**
 * Dependencies
 */

require('gaia-text-input');
require('gaia-dialog');
var component = require('gaia-component');

/**
 * Exports
 */
module.exports = component.register('gaia-dialog-prompt', {
  created: function() {
    this.setupShadowRoot();

    this.els = {
      dialog: this.shadowRoot.querySelector('gaia-dialog'),
      input: this.shadowRoot.querySelector('gaia-text-input'),
      submit: this.shadowRoot.querySelector('.submit'),
      cancel: this.shadowRoot.querySelector('.cancel')
    };

    this.els.dialog.addEventListener('opened', () => {
      this.setAttribute('opened', '');
    });

    this.els.dialog.addEventListener('closed', () => {
      this.removeAttribute('opened');
    });

    this.els.input.placeholder = this.firstChild.textContent;
    this.els.cancel.addEventListener('click', this.close.bind(this));
    this.els.submit.addEventListener('click', this.close.bind(this));
  },

  open: function(e) {
    this.els.dialog.open(e);
  },

  close: function() {
    this.els.dialog.close();
  },

  template: `
    <gaia-dialog>
      <div><gaia-text-input></gaia-text-input></div>
      <fieldset>
        <button class="cancel">Cancel</button>
        <button class="submit primary">Ok</button>
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

    gaia-text-input {
      margin: 16px !important;
    }

    </style>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-prompt',this));
