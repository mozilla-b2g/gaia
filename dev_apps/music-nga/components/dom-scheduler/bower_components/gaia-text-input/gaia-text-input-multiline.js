(function(define){define(function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Dependencies
 */

var component = require('gaia-component');

/**
 * Exports
 */

module.exports = component.register('gaia-text-input-multiline', {
  created: function() {
    this.setupShadowRoot();

    this.els = {
      inner: this.shadowRoot.querySelector('.inner'),
      field: this.shadowRoot.querySelector('textarea')
    };

    this.type = this.getAttribute('type');
    this.disabled = this.hasAttribute('disabled');
    this.placeholder = this.getAttribute('placeholder');
    this.required = this.getAttribute('required');
    this.value = this.getAttribute('value');
  },

  clear: function(e) {
    this.value = '';
  },

  attrs: {
    placeholder: {
      get: function() { return this.els.field.placeholder; },
      set: function(value) { this.els.field.placeholder = value || ''; }
    },

    value: {
      get: function() { return this.els.field.value; },
      set: function(value) { this.els.field.value = value; }
    },

    required: {
      get: function() { return this.els.field.required; },
      set: function(value) { this.els.field.required = value; }
    },

    disabled: {
      get: function() { return this.els.field.disabled; },
      set: function(value) {
        value = !!(value === '' || value);
        this.els.field.disabled = value;
      }
    }
  },

  template: `<div class="inner">
      <content select="label"></content>
      <div class="fields">
        <textarea></textarea>
        <div class="focus focus-1"></div>
        <div class="focus focus-2"></div>
      </div>
    </div>
    <style>

    /** Reset
     ---------------------------------------------------------*/

    textarea {
      box-sizing: border-box;
      border: 0;
      margin: 0;
      padding: 0;
    }

    /** Host
     ---------------------------------------------------------*/

    :host {
      display: block;
      margin-top: var(--base-m, 18px);
      margin-bottom: var(--base-m, 18px);
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
      box-sizing: border-box;
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

    /** Textarea
     ---------------------------------------------------------*/

    textarea {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 86px;
      padding: 10px 16px;
      font-size: inherit;
      border: none;
      margin: 0;
      font: inherit;
      resize: none;

      /* dynamic */

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

    textarea[disabled] {
      background: transparent;
    }

    /** Placeholder Text
     ---------------------------------------------------------*/

    ::-moz-placeholder {
      font-style: italic;

      color:
        var(--input-placeholder-color, #909ca7);
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

    .focus-2 {
      top: 0;
      bottom: auto;
    }

    </style>`
});

});})((function(n,w){return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:function(c){
var m={exports:{}},r=function(n){return w[n];};w[n]=c(r,m.exports,m)||m.exports;};})('gaia-text-input-multiline',this));