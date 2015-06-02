(function(define){define(['require','exports','module','gaia-component','gaia-icons'],function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Dependencies
 */

var component = require('gaia-component');
require('gaia-icons'); // Load gaia-icons

/**
 * Exports
 */

module.exports = component.register('gaia-text-input', {
  extends: HTMLInputElement,

  created: function() {
    this.setupShadowRoot();

    this.els = {
      inner: this.shadowRoot.querySelector('.inner'),
      input: this.shadowRoot.querySelector('input'),
      clear: this.shadowRoot.querySelector('.clear')
    };

    this.type = this.getAttribute('type');
    this.disabled = this.hasAttribute('disabled');
    this.clearable = this.hasAttribute('clearable');
    this.placeholder = this.getAttribute('placeholder');
    this.required = this.getAttribute('required');
    this.value = this.getAttribute('value');

    // Don't take focus from the input field
    this.els.clear.addEventListener('mousedown', (e) => e.preventDefault());
    this.els.clear.addEventListener('click', e => this.clear(e));
  },

  clear: function(e) {
    this.value = '';
  },

  focus: function() {
    this.els.input.focus();
  },

  /**
   * Attributes
   */

  attrs: {
    type: {
      get: function() { return this.els.input.getAttribute('type'); },
      set: function(value) {
        if (!value) { return; }
        this.els.inner.setAttribute('type', value);
        this.els.input.setAttribute('type', value);
      }
    },

    placeholder: {
      get: function() { return this.field.placeholder; },
      set: function(value) {
        if (!value && value !== '') { return; }
        this.els.input.placeholder = value;
      }
    },

    clearable: {
      get: function() { return this._clearable; },
      set: function(value) {
        var clearable = !!(value === '' || value);
        if (clearable === this.clearable) { return; }

        if (clearable) {
          this.els.inner.setAttribute('clearable', '');
          this.setAttribute('clearable', '');
        } else {
          this.els.inner.removeAttribute('clearable');
          this.removeAttribute('clearable');
        }

        this._clearable = clearable;
      }
    },

    value: {
      get: function() { return this.els.input.value; },
      set: function(value) { this.els.input.value = value; }
    },

    required: {
      get: function() { return this.els.input.required; },
      set: function(value) { this.els.input.required = value; }
    },

    maxlength: {
      get: function() { return this.els.input.getAttribute('maxlength'); },
      set: function(value) { this.els.input.setAttribute('maxlength', value); }
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
      <div class="fields">
        <input type="text"/>
        <button class="clear" tabindex="-1"></button>
        <div class="focus"></div>
      </div>
    </div>

    <style>

    :host {
      display: block;
      height: 40px;
      margin-top: var(--base-m, 18px);
      margin-bottom: var(--base-m, 18px);
    }

    /** Reset
     ---------------------------------------------------------*/

    input,
    button {
      box-sizing: border-box;
      border: 0;
      margin: 0;
      padding: 0;
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

    /**
     * [disbled]
     */

    [disabled] label {
      opacity: 0.3;
    }

    /** Fields
     ---------------------------------------------------------*/

    .fields {
      position: relative;
      width: 100%;
      height: 100%;

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
    }

    /**
     * [type='search']
     */

    [type='search'] .fields {
      border-radius: 30px;
      overflow: hidden;
    }

    /** Input Field
     ---------------------------------------------------------*/

    input {
      display: block;
      width: 100%;
      height: 100%;
      border: none;
      padding: 0 16px;
      margin: 0;
      font: inherit;
      resize: none;

      /* Dynamic */

      color:
        var(--text-color, #000);

      background:
        var(--text-input-background,
        var(--input-background,
        var(--background-minus,
        #fff)));
    }

    /**
     * [disabled]
     */

    input[disabled] {
      background: transparent;
    }

    /** Placeholder Text
     ---------------------------------------------------------*/

    ::-moz-placeholder {
      font-style: italic;

      color:
        var(--input-placeholder-color, #909ca7);
    }

    /** Clear Button
     ---------------------------------------------------------*/

    .clear {
      display: none;
      position: absolute;
      top: 11px;
      right: 10px;
      width: 18px;
      height: 18px;
      padding: 0;
      margin: 0;
      border-radius: 50%;
      opacity: 0;
      color: #fff;
      cursor: pointer;

      background:
        var(--input-clear-background, #999);
    }

    /**
     * [clearable]
     */

    [clearable] .clear {
      display: block;
    }

    /**
     * input:focus
     */

    input:focus ~ .clear {
      opacity: 1;
    }

    /** Clear Icon
     ---------------------------------------------------------*/

    .clear:before {
      font: normal 500 19px/16.5px 'gaia-icons';
      content: 'close';
      display: block;
      text-rendering: optimizeLegibility;
    }

    /** Focus Bar
     ---------------------------------------------------------*/

    .focus {
      position: absolute;
      bottom: 0px;
      width: 100%;
      height: 3px;
      transition: all 200ms;
      transform: scaleX(0);
      visibility: hidden;
      background: var(--highlight-color, #000);
    }

    /**
     * input:focus
     */

    :focus ~ .focus {
      transform: scaleX(1);
      transition-delay: 200ms;
      visibility: visible;
    }
    </style>
  `
});

});})((function(n,w){return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:function(c){
var m={exports:{}},r=function(n){return w[n];};w[n]=c(r,m.exports,m)||m.exports;};})('gaia-text-input',this));