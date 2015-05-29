/* globals define */
(function(define){'use strict';define(['require','exports','module','gaia-component','drag'],function(require,exports,module){

/**
 * Dependencies
 */

var component = require('gaia-component');
var Drag = require('drag');

/**
 * Simple logger
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console) : function() {};

/**
 * Exports
 */

module.exports = component.register('gaia-switch', {
  extends: HTMLInputElement.prototype,

  rtl: true,

  created: function() {
    this.setupShadowRoot();

    this.els = {
      inner: this.shadowRoot.querySelector('.inner'),
      track: this.shadowRoot.querySelector('.track'),
      handle: this.shadowRoot.querySelector('.handle')
    };

    // Bind context
    this.updateDir = this.updateDir.bind(this);
    this.toggle = this.toggle.bind(this);

    // Events
    on(this, 'click', e => this.onClick(e));

    // Configure
    this.setupDrag();
    this.disabled = this.getAttribute('disabled');
    this.checked = this.getAttribute('checked');

    // process everything that doesn't affect user interaction
    // after the component is created
    setTimeout(() => {
      // enable transitions after creation
      this.activateTransitions();
      this.makeAccessible();
    });
  },

  /**
   * Accessibility enhancements.
   * Read gaia-switch as switch.
   * make it tabable
   * read its checked and disabled state
   */
  makeAccessible: function() {
    this.setAttribute('role', 'switch');

    // Make tabable
    this.tabIndex = 0;

    this.setAttr('aria-checked', this.checked);
    if (this.disabled) {
      this.setAttr('aria-disabled', true);
    }
  },

  attached: function() {
    debug('attached');
    on(document, 'dirchanged', this.updateDir);
  },

  detached: function() {
    debug('detached');
    off(document, 'dirchanged', this.updateDir);
  },

  setupDrag: function() {
    debug('setup drag');

    this.drag = new Drag({
      container: {
        el: this.els.track,
        width: 50,
        height: 32
      },

      handle: {
        el: this.els.handle,
        width: 32,
        height: 32,
        x: 0,
        y: 0
      },
    });

    this.drag.on('ended', () => this.drag.snap());
    this.drag.on('snapped', (e) => this.onSnapped(e));
  },

  activateTransitions: function() {
    debug('activate transitions');
    this.els.inner.classList.add('transitions-on');
  },

  onClick: function(e) {
    debug('click', e);
    e.stopPropagation();
    if (this.drag.dragging) { return; }
    if (this.disabled) { return; }
    this.toggle();
  },

  updateDir: function() {
    debug('update dir', dir());
    this.updatePosition();
  },

  onSnapped: function(e) {
    debug('snapped', e, convert.toChecked(e.detail.x));
    this.checked = convert.toChecked(e.detail.x);
  },

  toggle: function(value) {
    debug('toggle', value);
    this.checked = !this.checked;
  },

  updatePosition: function() {
    var edge = convert.toEdge(this.checked);
    this.drag.transition(edge, 0);
    debug('updated position', edge);
  },

  attrs: {
    checked: {
      get: function() { return this._checked; },
      set: function(value) {
        debug('set checked', value);
        value = !!(value || value === '');

        if (this._checked === value) { return; }

        var changed = this._checked !== undefined;
        this._checked = value;

        this.els.handle.style.transform = '';
        this.els.handle.style.transition = '';

        if (value) {
          this.setAttr('checked', '');
          this.setAttr('aria-checked', true);
        } else {
          this.removeAttr('checked');
          this.setAttr('aria-checked', false);
        }

        this.updatePosition();

        if (changed) { this.dispatchEvent(new CustomEvent('change')); }
      }
    },

    disabled: {
      get: function() { return this._disabled; },
      set: function(value) {
        value = !!(value || value === '');
        if (this._disabled === value) { return; }
        debug('set disabled', value);
        this._disabled = value;
        if (value) {
          this.setAttr('disabled', '');
          this.setAttr('aria-disabled', true);
        } else {
          this.removeAttr('disabled');
          this.removeAttr('aria-disabled');
        }
      }
    }
  },

  template: `
    <div class="inner">
      <div class="track">
        <div class="handle">
          <div class="handle-head"></div>
        </div>
      </div>
    </div>
    <style>

    :host {
      display: inline-block;
      position: relative;
      border-radius: 18px;
      outline: 0;
    }

    :host([disabled]) {
      pointer-events: none;
      opacity: 0.5;
    }

    /** Inner
     ---------------------------------------------------------*/

    .inner {
      display: block;
      width: 50px;
      height: 32px;
      direction: ltr;
    }

    /** Track
     ---------------------------------------------------------*/

    .track {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 18px;

      /* Themeable */

      background:
        var(--switch-background,
        var(--background-minus,
        var(--background-plus,
        rgba(0,0,0,0.2))));
    }

    /** Track Background
     ---------------------------------------------------------*/

    .track:after {
      content: " ";
      display: block;
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      border-radius: 25px;
      transform: scale(0);
      transition-property: transform;
      transition-duration: 200ms;
      transition-delay: 300ms;

      /* Theamable */

      background-color:
        var(--highlight-color, #000)
    }

    /**
     * [checked]
     */

    [checked] .track:after {
      transform: scale(1);
    }

    /** Handle
     ---------------------------------------------------------*/

    .handle {
      position: relative;
      z-index: 1;
      width: 32px;
      height: 32px;
    }

    /**
     * transitions-on
     */

    .inner:not(.transitions-on) .handle {
      transition: none !important;
    }

    /** Handle Head
     ---------------------------------------------------------*/

    .handle-head {
      display: flex;
      box-sizing: border-box;
      width: 36px;
      height: 36px;
      position: relative;
      top: -2px;
      left: -2px;
      border-radius: 50%;
      border: 1px solid;
      cursor: pointer;
      align-items: center;
      justify-content: center;

      /* Themable */

      background:
        var(--switch-head-background,
        var(--input-background,
        var(--button-background,
        var(--background-plus,
        #fff))));

      border-color:
        var(--switch-head-border-color,
        var(--switch-background,
        var(--border-color,
        var(--background-minus,
        rgba(0,0,0,0.2)))));
    }

    /** Handle Head Circle
     ---------------------------------------------------------*/

    .handle-head:after {
      content: "";
      display: block;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      transform: scale(0);
      transition-property: transform;
      transition-duration: 300ms;
      transition-delay: 600ms;

      /* Themeable */

      background:
        var(--highlight-color, #000)
    }

    /**
     * [checked]
     */

    [checked] .handle-head:after {
      transform: scale(1);
    }

  </style>`
});

// Toggle switches when the component is
// focused and the spacebar is pressed.
addEventListener('keypress', function(e) {
  var isSpaceKey = e.which === 32;
  var el = document.activeElement;
  var isGaiaSwitch = el.tagName === 'GAIA-SWITCH';
  if (isSpaceKey && isGaiaSwitch) { el.click(); }
});

/**
 * TODO: Replace this <label> stuff
 * with smarter <gaia-label>
 */

// Bind a 'click' delegate to the
// window to listen for all clicks
// and toggle checkboxes when required.
addEventListener('click', function(e) {
  var label = getLabel(e.target);
  var gaiaSwitch = getLinkedSwitch(label);
  if (gaiaSwitch) { gaiaSwitch.toggle(); }
}, true);

/**
 * Find a gaiaSwitch when given a <label>.
 *
 * @param  {Element} label
 * @return {GaiaCheckbox|null}
 */
function getLinkedSwitch(label) {
  if (!label) { return; }
  var id = label.getAttribute('for');
  var el = id && document.getElementById(id);
  return el && el.tagName === 'GAIA-SWITCH' ? el : null;
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

/**
 * Utils
 */

/**
 * Get the document direction.
 *
 * @return {String} ('ltr'|'rtl')
 */
function dir() {
  return document.dir || 'ltr';
}

/**
 * Handles convertion of edges values
 * to checked Booleans and checked
 * Booleans to edge values.
 *
 * This is because in LTR mode when the
 * handle is against the left edge the
 * switch is checked, in RTL mode it's
 * the opposite.
 *
 * @type {Object}
 */
var convert = {
  ltr: {
    edges: { '0': false, '1': true },
    checked: { 'true': '1', 'false': '0' }
  },

  rtl: {
    edges: { '0': true, '1': false },
    checked: { 'true': '0', 'false': '1' }
  },

  toChecked: function(edge) {
    return this[dir()].edges[edge];
  },

  toEdge: function(checked) {
    return this[dir()].checked[checked];
  }
};

function on(el, name, fn) { el.addEventListener(name, fn); }
function off(el, name, fn) { el.removeEventListener(name, fn); }

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-switch',this));
