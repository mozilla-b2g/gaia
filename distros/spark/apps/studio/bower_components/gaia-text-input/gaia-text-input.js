(function(define){define(function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Locals
 */

var baseComponents = window.COMPONENTS_BASE_URL || 'bower_components/';
var base = window.GAIA_TEXT_INPUT_BASE_URL || baseComponents + 'gaia-text-input/';

// Load gaia-icons
//require('gaia-icons')(baseComponents);

/**
 * Extend from the `HTMLElement` prototype
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);

proto.createdCallback = function() {
  var shadow = this.createShadowRoot();
  var tmpl = template.content.cloneNode(true);

  this.els = {
    inner: tmpl.querySelector('.inner'),
    input: tmpl.querySelector('.input'),
    clear: tmpl.querySelector('.clear')
  };

  this.placeholder = this.getAttribute('placeholder');
  this.required = this.getAttribute('required');
  this.value = this.getAttribute('value');
  this.type = this.getAttribute('type');

  // Don't take focus from the input field
  this.els.clear.addEventListener('mousedown', function(e) { e.preventDefault(); });
  this.els.clear.addEventListener('click', this.clear.bind(this));

  shadow.appendChild(tmpl);
  this.styleHack();
};

proto.styleHack = function() {
  var style = this.shadowRoot.querySelector('style');
  style.setAttribute('scoped', '');
  this.appendChild(style.cloneNode(true));
};


Object.defineProperties(proto, {
  type: {
    get: function() { return this.els.input.type; },
    set: function(value) {
      if (!value) { return; }
      this.els.inner.setAttribute('type', value);
      this.els.input.type = value;
    }
  },
  placeholder: {
    get: function() { return this.els.input.placeholder; },
    set: function(value) {
      if (!value) { return; }
      this.els.input.placeholder = value;
    }
  },
  value: {
    get: function() { return this.els.input.value; },
    set: function(value) { this.els.input.value = value; }
  },
  required: {
    get: function() { return this.els.input.required; },
    set: function(value) { this.els.input.required = value; }
  }
});

proto.clear = function(e) {
  this.els.input.value = '';
};

// HACK: Create a <template> in memory at runtime.
// When the custom-element is created we clone
// this template and inject into the shadow-root.
// Prior to this we would have had to copy/paste
// the template into the <head> of every app that
// wanted to use <gaia-textinput>, this would make
// markup changes complicated, and could lead to
// things getting out of sync. This is a short-term
// hack until we can import entire custom-elements
// using HTML Imports (bug 877072).
var template = document.createElement('template');

template.innerHTML = `
<style>

/** Reset
 ---------------------------------------------------------*/

input, button {
  box-sizing: border-box;
  border: 0;
  margin: 0;
  padding: 0;
}

gaia-text-input {
  display: block;
}

:host() {
  display: block;
}

/** Label
 ---------------------------------------------------------*/

label {
  font-size: 14px;
  display: block;
  margin: 0 0 4px 16px;
}

/** Inner
 ---------------------------------------------------------*/

.input-container {
  --gi-border-color:
    var(--input-border-color,
    var(--border-color,
    var(--background-plus,
    #e7e7e7)));

  position: relative;
  border-color: --gi-border-color;
  border:
    var(--input-border,
    var(--border,
    1px solid var(--gi-border-color)));
}

/**
 * [type="search"]
 */

[type='search'] .input-container {
  border-radius: 30px;
  overflow: hidden;
}

/** Input Field
 ---------------------------------------------------------*/

.input {
  display: block;
  width: 100%;
  height: 40px;
  font-size: inherit;
  width: 100%;
  border: none;
  padding: 0 16px;
  margin: 0;
  font: inherit;
  color: var(--input-color, #000);
  background:
    var(--input-background,
    var(--background-minus,
    #fff));
}

/** Placeholder Text
 ---------------------------------------------------------*/

.input::-moz-placeholder {
  font-style: italic;
  color: var(--input-placeholder-color, #909ca7);
}

/** Clear Button
 ---------------------------------------------------------*/

.clear {
  position: absolute;
  top: 12px;
  right: 10px;
  background: var(--input-clear-background, #999);
  width: 17px;
  height: 17px;
  padding: 0;
  margin: 0;
  border-radius: 50%;
  opacity: 0;
  color: #fff;
}

/**
 * input:focus
 */

.input:focus ~ .clear {
  opacity: 1;
}

/** Clear Icon
 ---------------------------------------------------------*/

.clear:before {
  font-family: 'gaia-icons';
  content: 'close';
  display: block;
  font-style: normal;
  font-weight: 500;
  text-rendering: optimizeLegibility;
  font-size: 19px;
  line-height: 1;
  margin-top: -2px;
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

.input:focus ~ .focus {
  transform: scaleX(1);
  transition-delay: var(--button-transition-delay, 200ms);
  visibility: visible;
}

/* search */
// .input-search-container {
//   border-radius: 30px;
//   overflow: hidden;
// }

// .input-search {
//   border-radius: 20px;
// }

// .input-passcode {
//   width: 40px;
// }

</style>

<div class="inner">
  <content select="label"></content>
  <div class="input-container">
    <input class="input" type="text"/>
    <button class="clear"></button>
    <div class="focus"></div>
  </div>
</div>`;

// Register and return the constructor
module.exports = document.registerElement('gaia-text-input', { prototype: proto });

});})((function(n,w){return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:function(c){
var m={exports:{}},r=function(n){return w[n];};w[n]=c(r,m.exports,m)||m.exports;};})('gaia-text-input',this));
