(function(define){define(function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Dependencies
 */

var component = require('gaia-component');

/**
 * Locals
 */

var DEFAULT_LENGTH = 4;

/**
 * Exports
 */

module.exports = component.register('gaia-text-input-pin', {
  created: function() {
    this.setupShadowRoot();

    this.els = {
      inner: this.shadowRoot.querySelector('.inner'),
      fields: this.shadowRoot.querySelector('.fields'),
      input: this.shadowRoot.querySelector('input')
    };

    this.disabled = this.hasAttribute('disabled');
    this.length = this.getAttribute('length') || DEFAULT_LENGTH;

    this.addEventListener('keyup', () => this.updateCells());
  },

  updateCells: function() {
    var l = this.els.input.value.length;
    this.els.cells.forEach((cell, i) => {
      cell.classList.toggle('populated', i < l);
      cell.classList.toggle('focused', i == l);
    });
  },

  onBackspace: function(e) {
    var input = e.target;
    var empty = !input.value;
    var previous = input.previousElementSibling;

    if (!empty && previous) {
      previous.clear();
      previous.focus();
    } else if (empty && previous) {
      previous.focus();
    }
  },

  setupFields: function() {
    this.els.fields.innerHTML = '';
    this.els.cells = [];

    for (var i = 0, l = this.length; i < l; i++) {
      var el = document.createElement('div');
      el.className = 'cell';
      this.els.fields.appendChild(el);
      this.els.cells.push(el);
    }
  },

  attributeChangedCallback: function(attr, from, to) {
    if (attrs[attr]) { this[attr] = to; }
  },

  clear: function(e) {
    this.value = '';
  },

  /**
   * Attributes
   */

  attrs: {
    length: {
      get: function() { return this._length; },
      set: function(value) {
        value = Number(value);
        this._length = value;
        this.els.input.setAttribute('maxlength', this.length);
        this.setupFields();
      }
    },

    value: {
      get: function() { return this.els.input.value; },
      set: function(value) { this.els.input.value = value; }
    },

    disabled: {
      get: function() { return this.els.input.disabled; },
      set: function(value) {
        value = !!(value === '' || value);
        this.els.input.disabled = value;
      }
    }
  },

  template: `
    <div class="inner">
      <content select="label"></content>
      <div class="container">
        <input />
        <div class="fields"></div>
      </div>
    </div>

    <style>

    /** Host
     ---------------------------------------------------------*/

    :host {
      display: block;
      height: 40px;
      margin-top: var(--base-m, 18px);
      margin-bottom: var(--base-m, 18px);
      font-size: 40px;
    }

    /** Inner
     ---------------------------------------------------------*/

    .inner {
      height: 100%;
    }

    /** Label
     ---------------------------------------------------------*/

    label {
      font-size: 14px;
      display: block;
      margin: 0 0 4px 16px;
    }

    /** Container
     ---------------------------------------------------------*/

    .container {
      position: relative;
      z-index: 0;
      height: 100%;
    }

    /** Input (hidden)
     ---------------------------------------------------------*/

    input {
      opacity: 0;
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      z-index: 1;
    }

    /** Fields
     ---------------------------------------------------------*/

    .fields {
      display: flex;
      position: relative;
      height: 100%;
      margin-left: -1rem;
    }

    /**
     * [disbled]
     */

    [disabled] + .fields {
      pointer-events: none;
    }

    /** Cell
     ---------------------------------------------------------*/

    .cell {
      position: relative;
      height: 100%;
      margin-left: 1rem;
      flex: 1;

      /* dynamic */

      --gi-border-color:
        var(--input-border-color,
        var(--border-color,
        var(--background-plus,
        #e7e7e7)));

      border-color:
        var(--gi-border-color);

      border:
        var(--input-border,
        var(--border,
        1px solid var(--gi-border-color)));

      background:
        var(--text-input-background,
        var(--input-background,
        var(--background-minus,
        #fff)));
    }

    /**
     * [disbled]
     */

    [disabled] + .fields .cell {
      background: none;
    }

    /** Dot
     ---------------------------------------------------------*/

    .cell::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 14px;
      height: 14px;
      margin: -7px;
      border-radius: 50%;
      opacity: 0;

      /* dynamic */

      background:
        var(--text-color);
    }

    /**
     * .populated
     */

    .cell.populated::after {
      opacity: 1;
    }

    .cell::before {
      content: '';
      position: absolute;
      bottom: 0;
      width: 100%;
      height: 3px;
      visibility: hidden;
      background: var(--highlight-color, #000);
    }

    /**
     * input:focus
     */

    input:focus + .fields .cell::before {
      visibility: visible;
    }

    </style>
  `
});

});})((function(n,w){return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:function(c){
var m={exports:{}},r=function(n){return w[n];};w[n]=c(r,m.exports,m)||m.exports;};})('gaia-text-input-pin',this));