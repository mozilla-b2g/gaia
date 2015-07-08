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
module.exports = component.register('gaia-dialog-alert', {
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
      <section>
        <p><content></content></p>
      </section>
      <div>
        <button class="submit primary" on-click="close">Ok</button>
      </div>
    </gaia-dialog>

    <style>

    :host {
      display: none;
      position: fixed;
      width: 100%;
      height: 100%;
    }

    </style>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-alert',this));
