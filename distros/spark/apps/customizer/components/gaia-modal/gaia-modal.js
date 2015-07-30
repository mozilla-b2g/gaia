;(function(define){'use strict';define(function(require,exports,module){

/**
 * Dependencies
 */

var component = require('gaia-component');

/**
 * Register the element.
 *
 * @return {Element} constructor
 */
module.exports = component.register('gaia-modal', {

  /**
   * Called when the element is first created.
   *
   * Here we create the shadow-root and
   * inject our template into it.
   *
   * @private
   */
  created: function() {
    this.setupShadowRoot();

    // Properties
    this.active = this.getAttribute('active');
  },

  /**
   * Known attribute property
   * descriptors.
   *
   * These setters get called when matching
   * attributes change on the element.
   *
   * @type {Object}
   */
  attrs: {
    active: {
      get: function() { return this._active || false; },
      set: function(value) {
        value = !!(value || value === '');

        if (value === this.active) { return; }
        this._active = value;

        if (value) { this.setAttr('active', ''); }
        else { this.removeAttr('active'); }
      }
    }
  },

  open: function() {
    this.active = true;
  },

  close: function() {
    this.active = false;
  },

  template: `<div class="inner">
    <content></content>
  </div>

  <style>
  :host {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    transition: all 0.2s;
    transform: translate(0, 100%);
    opacity: 0;
    pointer-events: none;
  }

  :host[active] {
    transform: translate(0, 0);
    opacity: 1;
    pointer-events: auto;
  }

  .inner {
    background: var(--background, #fff);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  </style>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-modal',this));
