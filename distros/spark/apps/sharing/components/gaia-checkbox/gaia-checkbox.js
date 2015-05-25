(function(define){define(function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Dependencies
 */

var component = require('gaia-component');

// Load icon font
require('gaia-icons');

/**
 * Exports
 */

module.exports = component.register('gaia-checkbox', {
  created: function() {
    this.setupShadowRoot();

    this.els = { inner: this.shadowRoot.querySelector('.inner') };
    this.addEventListener('click', this.onClick.bind(this));

    // Setup initial attributes
    this.checked = this.getAttribute('checked');
    this.danger = this.getAttribute('danger');
    this.name = this.getAttribute('name');

    // Make tabable
    this.tabIndex = 0;
  },

  onClick: function(e) {
    e.stopPropagation();
    this.checked = !this.checked;
  },

  toggle: function(value) {
    value = arguments.length ? value : !this.checked;
    if (value || value === '') { this.check(); }
    else { this.uncheck(); }
  },

  check: function() {
    if (this.checked) { return; }
    this.els.inner.setAttribute('checked', '');
    this.setAttribute('checked', '');
    this._checked = true;
  },

  uncheck: function() {
    if (!this.checked) { return; }
    this.els.inner.removeAttribute('checked');
    this.removeAttribute('checked');
    this._checked = false;
  },

  attrs: {
    checked: {
      get: function() { return !!this._checked; },
      set: function() { this.toggle(); }
    },

    danger: {
      get: function() { return this._danger; },
      set: function(value) {
        if (value || value === '') { this.els.inner.setAttribute('danger', value); }
        else { this.els.inner.removeAttribute('danger'); }
        this._danger = value;
      }
    },

    name: {
      get: function() { return this._name; },
      set: function(value) {
        if (value === null) { this.els.inner.removeAttribute('name'); }
        else { this.els.inner.setAttribute('name', value); }
        this._name = value;
      }
    }
  },

  template: `<div class="inner">
      <div class="background"></div>
      <div class="tick"></div>
    </div>
    <style>

    /** Host
     ---------------------------------------------------------*/

    :host {
      position: relative;
      display: inline-block;
      cursor: pointer;
      outline: 0;
    }

    /** Inner
     ---------------------------------------------------------*/

    .inner {
      display: block;
      box-sizing: border-box;
      position: relative;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid #a6a6a6;
      z-index: 0;

      --gaia-checkbox-background:
        var(--checkbox-background,
        var(--input-background,
        var(--button-background,
        var(--background-plus))));

      background:
        var(--gaia-checkbox-background);

      border-color:
        var(--checkbox-border-color,
        var(--border-color,
        var(--background-minus)));
    }

    /**
     * Increase hit area
     */

    .inner:before {
      content: '';
      position: absolute;
      top: -10px; right: -10px;
      bottom: -10px; left: -10px;
    }

    /** Background
     ---------------------------------------------------------*/

    .background {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      top: 0px;
      left: 0px;
      position: absolute;
      z-index: -1;
      opacity: 0;
      background: var(--highlight-color, #000);
    }

    /**
     * .active
     */

    .inner[checked] .background {
      animation-name: gaia-checkbox-animation;
      animation-duration: 350ms;
      animation-fill-mode: forwards;
    }

    /** Tick
     ---------------------------------------------------------*/

    .tick {
      text-align: center;
      line-height: 26px;
      margin-left: -1px;
      opacity: 0;

      transition-property: opacity;
      transition-duration: 100ms;

      color: var(--highlight-color, #000);
    }

    /**
     * [checked]
     */

    [checked] .tick {
      opacity: 1;
      transition-delay: 140ms;
    }

    /** Icon
     ---------------------------------------------------------*/

    .tick:before {
      font-family: 'gaia-icons';
      content: 'tick';
      font-style: normal;
      font-weight: 500;
      text-rendering: optimizeLegibility;
      font-size: 16px;
      line-height: 1;
    }

    </style>`,

    globalCss: `@keyframes gaia-checkbox-animation {
      0% {
        transform: scale(0);
        opacity: 1;
      }
      65% {
        transform: scale(1);
        opacity: 1;
      }
      100% {
        opacity: 0;
        transform: scale(1);
      }
    }`
});

// Bind a 'click' delegate to the
// window to listen for all clicks
// and toggle checkboxes when required.
addEventListener('click', function(e) {
  var label = getLabel(e.target);
  var checkbox = getLinkedCheckbox(label);
  if (checkbox) { checkbox.toggle(); }
}, true);

/**
 * Find a checkbox when given a <label>.
 *
 * @param  {Element} label
 * @return {GaiaCheckbox|null}
 */
function getLinkedCheckbox(label) {
  if (!label) { return; }
  var id = label.getAttribute('for');
  var el = id && document.getElementById(id);
  return el && el.tagName === 'GAIA-CHECKBOX' ? el : null;// || label.querySelector('gaia-checkbox');
}

/**
 * Walk up the DOM tree from a given
 * element until a <label> is found.
 *
 * @param  {Element} el
 * @return {HTMLLabelElement|undefined}
 */
function getLabel(el) {
  return el && (el.tagName == 'LABEL' ? el : getLabel(el.parentNode));
}

// Makes checkboxs togglable via keboard
addEventListener('keypress', function(e) {
  if (e.which !== 32) { return; }
  var el = document.activeElement;
  var isCheckbox = el.tagName === 'GAIA-CHECKBOX';
  if (isCheckbox) { el.click(); }
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-checkbox',this));