;(function(define){define(['require','exports','module','gaia-dialog','gaia-icons'],function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Dependencies
 */

var GaiaDialog = require('gaia-dialog');

// Load icon-font
require('gaia-icons');

/**
 * Extend from `GaiaDialog` prototype
 *
 * @type {Object}
 */
var proto = GaiaDialog.extend();

/**
 * Runs when an instance of `GaiaTabs`
 * is first created.
 *
 * The initial value of the `select` attribute
 * is used to select a tab.
 *
 * @private
 */
proto.createdCallback = function() {
  this.onCreated();

  this.els.submit = this.shadowRoot.querySelector('.submit');
  this.els.cancel = this.shadowRoot.querySelector('.cancel');
  this.els.list = this.shadowRoot.querySelector('ul');

  this.multiple = this.hasAttribute('multiple');

  on(this.els.list, 'click', this.onListClick, this);
  on(this.els.submit, 'click', this.close, this);
  on(this.els.cancel, 'click', this.close, this);
};

proto.onListClick = function(e) {
  var el = getLi(e.target);
  var selected = el.getAttribute('aria-selected') === 'true';

  if (this.multiple) { this.onChangeMultiple(el, selected); }
  else { this.onChange(el, selected); }
};

proto.onChange = function(el, selected) {
  this.clearSelected();
  if (!selected) { el.setAttribute('aria-selected', !selected); }
  this.fireChange();
  this.close();
};

proto.onChangeMultiple = function(el, selected) {
  el.setAttribute('aria-selected', !selected);
  this.fireChange();
};

proto.clearSelected = function() {
  [].forEach.call(this.selectedOptions, function(option) {
    option.removeAttribute('aria-selected');
  });
};

proto.fireChange = function() {
  var e = new CustomEvent('change', { detail: { value: this.valueString }});
  this.dispatchEvent(e);
};

proto.attrs = {
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
    get: function() { return this.querySelectorAll('li[aria-selected="true"]'); }
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
};

Object.defineProperties(proto, proto.attrs);

proto.template = `
<style>
.shadow-host {
  display: none;
}

.shadow-host[opened],
.shadow-host.animating {
  display: block;
  position: fixed;
  width: 100%;
  height: 100%;
}

/** Title (duplicate from gaia-dialog)
 ---------------------------------------------------------*/

.shadow-content h1 {
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

.shadow-content li {
  position: relative;
  display: block;
  padding: 16px;
  text-align: left;
  -moz-user-select: none;
  cursor: pointer;
}

.shadow-content li[aria-selected='true'] {
  color: #00CAF2;
  font-weight: normal;
}

.shadow-content li:after {
  content: '';
  display: block;
  position: absolute;
  height: 1px;
  left: 16px;
  right: 16px;
  bottom: 1px;
  background: #E7E7E7;
}

.shadow-content li:last-of-type:after {
  display: none
}

/** Buttons
 ---------------------------------------------------------*/

gaia-dialog:not([multiple]) .submit {
  display: none !important;
}

gaia-dialog:not([multiple]) .cancel {
  width: 100% !important;
}

gaia-dialog:not([multiple]) .cancel:after {
  display: none% !important;
}

/** Tick Icon
 ---------------------------------------------------------*/

.shadow-content li[aria-selected='true']:before {
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

</style>

<gaia-dialog>
  <content select="h1"></content>
  <ul><content select="li"></content></ul>
  <fieldset>
    <button class="cancel">Cancel</button>
    <button class="submit primary">Select</button>
  </fieldset>
</gaia-dialog>`;


function on(el, name, fn, ctx) {
  if (ctx) { fn = fn.bind(ctx); }
  el.addEventListener(name, fn);
}

function getLi(el) {
  return el && (el.tagName === 'LI' ? el : getLi(el.parentNode));
}


// Register and expose the constructor
try {
  module.exports = document.registerElement('gaia-dialog-select', { prototype: proto });
  module.exports.proto = proto;
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-select',this));
