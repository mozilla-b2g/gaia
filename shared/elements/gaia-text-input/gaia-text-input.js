(define=>{define((require,exports,module)=>{
'use strict';

/**
 * Dependencies
 */

var component = require('gaia-component');
require('gaia-icons'); // Load gaia-icons

/**
 * Mini logger
 *
 * @type {Function}
 */
var debug = 0 ? (...args) => console.log('[GaiaTextInput]', ...args) : () => {};

/**
 * Exports
 */

module.exports = component.register('gaia-text-input', {
  created() {
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
    this.els.clear.addEventListener('mousedown', e => e.preventDefault());

    this.els.clear.addEventListener('click', e => this.clear(e));
    this.els.input.addEventListener('input', e => this.onInput(e));
    this.els.input.addEventListener('focus', e => this.onFocus(e));
    this.els.input.addEventListener('blur', e => this.onBlur(e));
  },

  /**
   * Clear the field.
   *
   * @public
   */
  clear() {
    debug('clear');
    this.value = '';
    this.emit('clear');
  },

  /**
   * Focus the field.
   *
   * @public
   */
  focus() {
    debug('focus');
    this.els.input.focus();
  },

  /**
   * Unfocus the field.
   *
   * @public
   */
  blur() {
    debug('blur');
    this.els.input.blur();
  },

  /**
   * Runs when the field is focused.
   *
   * @private
   */
  onFocus() {
    debug('on focus');
    this.els.inner.classList.add('focused');
    this.emit('focus');
  },

  /**
   * Runs when the field is unfocused.
   *
   * @private
   */
  onBlur() {
    debug('on blur');
    this.els.inner.classList.remove('focused');
    this.emit('blur');
  },

  /**
   * Runs when the value of the
   * input is manually changed.
   *
   * @private
   */
  onInput() {
    debug('on input');
    this.onValueChanged();
  },

  /**
   * Runs when the values changes
   * programatically or via keystrokes.
   *
   * @private
   */
  onValueChanged() {
    debug('value changed');
    var hasValue = !!this.value.length;
    this.els.inner.classList.toggle('has-value', hasValue);
    this.emit('input');
  },

  /**
   * Emit a DOM event on the component.
   *
   * @param  {String} name
   * @param  {*} detail
   * @private
   */
  emit(name, detail) {
    var e = new CustomEvent(name, { detail: detail });
    this.dispatchEvent(e);
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

        if (clearable) this.setAttr('clearable', '');
        else this.removeAttr('clearable');

        this._clearable = clearable;
      }
    },

    value: {
      get: function() { return this.els.input.value; },
      set: function(value) {
        debug('set value', value);
        this.els.input.value = value;
        this.onValueChanged();
      }
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
        font-size: 17px;
        overflow: hidden;

        --this-background:
          var(--text-input-background,
          var(--input-background,
          var(--background-minus,
          #fff)));

        --this-border-color:
          var(--input-border-color,
          var(--border-color,
          var(--background-plus,
          #e7e7e7)));
      }

      .inner {
        height: 100%;
      }

      label {
        font-size: 14px;
        display: block;
        margin: 0 0 4px 16px;
      }

      [disabled] label {
        opacity: 0.3;
      }

      .fields {
        position: relative;
        width: 100%;
        height: 100%;
        box-sizing: border-box;

        border-color:
          var(--this-border-color);

        border:
          var(--input-border,
          var(--border,
          1px solid var(--this-border-color)));
      }

      [type='search'] .fields {
        border-radius: 30px;
        overflow: hidden;
      }

      input {
        display: block;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        padding: 0 16px;
        margin: 0;
        border: 0;

        font: inherit;
        resize: none;

        /* Dynamic */

        color: var(--text-color, #000);
        background: var(--this-background);
      }

      input[disabled] {
        background: var(--background);
      }

      ::-moz-placeholder {
        font-style: italic;

        color:
          var(--input-placeholder-color, #909ca7);
      }

      .clear {
        position: absolute;
        offset-inline-end: 0;
        top: 0;

        display: none;
        width: 18px;
        height: 18px;
        padding: 0;
        margin: 0;
        border: solid 10px transparent;
        box-sizing: content-box;

        border-radius: 50%;
        color: var(--background);
        cursor: pointer;
        background: var(--input-clear-background, #999);
        background-clip: padding-box;
        opacity: 0;
        pointer-events: none;
      }

      [clearable] .clear {
        display: block;
      }

      [clearable].has-value.focused .clear {
        pointer-events: all;
        transition: opacity 200ms;
        opacity: 1;
      }

      .clear:before {
        content: 'close';
        display: block;

        font: normal 500 19px/17px 'gaia-icons';
        text-rendering: optimizeLegibility;
      }

      .focus {
        position: absolute;
        left: 0;
        bottom: 0px;

        width: 100%;
        height: 3px;

        transition: transform 200ms;
        transform: scaleX(0);
        visibility: hidden;
        background: var(--highlight-color, #000);
      }

      [type='search'] .focus {
        border-radius: 0 0 60px 60px;
        left: 10px;
        width: calc(100% - 20px);
      }

      /**
       * .focused
       */

      .focused .focus {
        transform: scaleX(1);
        transition-delay: 200ms;
        visibility: visible;
      }
    </style>`
});

})})(((n,w)=>{return(typeof define)[0]=='f'&&define.amd?define:(typeof module)[0]=='o'?c =>{c(require,exports,module)}:c=>{var m={exports:{}},r=n=>w[n];w[n]=c(r,m.exports,m)||m.exports;};})('gaia-text-input',this));/*jshint ignore:line*/