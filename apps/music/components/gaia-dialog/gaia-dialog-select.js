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
module.exports = component.register('gaia-dialog-select', {
  created: function() {
    this.setupShadowRoot();

    this.els = {
      dialog: this.shadowRoot.querySelector('gaia-dialog'),
      submit: this.shadowRoot.querySelector('.submit'),
      cancel: this.shadowRoot.querySelector('.cancel'),
      list: this.shadowRoot.querySelector('ul')
    };

    this.multiple = this.hasAttribute('multiple');
    this.els.list.addEventListener('click', this.onListClick.bind(this));
    this.els.submit.addEventListener('click', this.close.bind(this));
    this.els.cancel.addEventListener('click', this.close.bind(this));
  },

  open: function(e) {
    return GaiaDialogProto.show.call(this)
      .then(() => this.els.dialog.open(e));
  },

  close: function() {
    return GaiaDialogProto.show.call(this)
      .then(() => this.els.dialog.close());
  },

  onListClick: function(e) {
    var el = e.target.closest('li');
    var selected = el.getAttribute('aria-selected') === 'true';

    if (this.multiple) { this.onChangeMultiple(el, selected); }
    else { this.onChange(el, selected); }
  },

  onChange: function(el, selected) {
    this.clearSelected();
    if (!selected) { el.setAttribute('aria-selected', !selected); }
    this.fireChange();
    this.close();
  },

  onChangeMultiple: function(el, selected) {
    el.setAttribute('aria-selected', !selected);
    this.fireChange();
  },

  clearSelected: function() {
    [].forEach.call(this.selectedOptions, function(option) {
      option.removeAttribute('aria-selected');
    });
  },

  fireChange: function() {
    var e = new CustomEvent('change', { detail: { value: this.valueString }});
    this.dispatchEvent(e);
  },

  attrs: {
    multiple: {
      get: function() { return !!this._multiple; },
      set: function(value) {
        value = value === '' ? true : value;
        if (value === this._multiple) { return; }
        if (!value) {
          this._multiple = false;
          this.removeAttribute('multiple');
        } else {
          this._multiple = true;
          this.setAttribute('multiple', '');
        }
      }
    },

    options: {
      get: function() { return this.querySelectorAll('li'); }
    },

    selectedOptions: {
      get: function() {
        return this.querySelectorAll('li[aria-selected="true"]');
      }
    },

    selected: {
      get: function() { return this.selectedOptions[0]; }
    },

    value: {
      get: function() {
        var selected = this.selectedOptions[0];
        return selected && selected.getAttribute('value');
      }
    },

    valueString: {
      get: function() {
        var selected = this.selected;
        return selected && selected.textContent;
      }
    },

    length: {
      get: function() { return this.options.length; }
    }
  },

  template: `
    <gaia-dialog>
      <content select="h1"></content>
      <ul><content select="li"></content></ul>
      <fieldset>
        <button class="cancel">Cancel</button>
        <button class="submit primary">Select</button>
      </fieldset>
    </gaia-dialog>

    <style>

    :host {
      display: none;
      position: fixed;
      width: 100%;
      height: 100%;
    }

    /** Title (duplicate from gaia-dialog)
     ---------------------------------------------------------*/

    ::content h1 {
      padding: 16px;
      font-size: 23px;
      line-height: 26px;
      font-weight: 200;
      font-style: italic;
      color: #858585;
    }

    /** List
     ---------------------------------------------------------*/

    ul {
      display: block;
      padding: 0;
      margin: 0;
    }

    /** Options
     ---------------------------------------------------------*/

    ::content li {
      position: relative;
      display: block;
      padding: 16px;
      text-align: start;
      -moz-user-select: none;
      cursor: pointer;
    }

    ::content li[aria-selected='true'] {
      color: #00CAF2;
      font-weight: normal;
    }

    ::content li:after {
      content: '';
      display: block;
      position: absolute;
      height: 1px;
      left: 16px;
      right: 16px;
      bottom: 1px;
      background: #E7E7E7;
    }

    ::content li:last-of-type:after {
      display: none
    }

    /** Buttons
     ---------------------------------------------------------*/

    ::host:not([multiple]) .submit {
      display: none !important;
    }

    ::host:not([multiple]) .cancel {
      width: 100% !important;
    }

    ::host:not([multiple]) .cancel:after {
      display: none% !important;
    }

    /** Tick Icon
     ---------------------------------------------------------*/

    ::content li[aria-selected='true']:before {
      content: 'tick';
      position: absolute;
      top: 50%; right: 20px;
      display: block;
      margin-top: -12px;
      font-family: 'gaia-icons';
      font-style: normal;
      font-size: 14px;
      font-weight: 500;
      text-rendering: optimizeLegibility;
    }

    </style>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-select',this));
