(function(define){'use strict';define(function(require,exports,module){
/*globals define*//*jshint node:true*/

/**
 * Dependencies
 */

var loadGaiaIcons = require('gaia-icons');
var fontFit = require('./lib/font-fit');

/**
 * Locals
 */

var baseComponents = window.COMPONENTS_BASE_URL || 'bower_components/';
var base = window.GAIA_HEADER_BASE_URL || baseComponents + 'gaia-header/';

/**
 * Element prototype, extends from HTMLElement
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);

/**
 * Supported action types
 *
 * @type {Object}
 */
var actionTypes = {
  menu: true,
  back: true,
  close: true,
};

/**
 * Called when the element is first created.
 *
 * Here we create the shadow-root and
 * inject our template into it.
 *
 * @private
 */
proto.createdCallback = function() {
  var shadow = this.createShadowRoot();
  var tmpl = template.content.cloneNode(true);

  // Get els
  this.els = {
    actionButton: tmpl.querySelector('.action-button'),
    headings: this.querySelectorAll('h1,h2,h3,h4'),
    inner: tmpl.querySelector('.inner')
  };

  this.els.actionButton.addEventListener('click',
    proto.onActionButtonClick.bind(this));

  this.configureActionButton();
  this.setupInteractionListeners();
  shadow.appendChild(tmpl);
  this.styleHack();

  // Font fit must be run only once the element is styled
  this.addEventListener('styled', this.runFontFit.bind(this));
};

/**
 * Load in the the component's styles.
 *
 * We're working around a few platform bugs
 * here related to @import in the shadow-dom
 * stylesheet. When HTML-Imports are ready
 * we won't have to use @import anymore.
 *
 * The `-content` class is added to the element
 * as a simple 'polyfill' for `::content` selector.
 * We can use `.-content` in our CSS to indicate
 * we're styling 'distributed' nodes. This will
 * make the transition to `::content` a lot simpler.
 *
 * @private
 */
proto.styleHack = function() {
  var style = document.createElement('style');
  var self = this;

  this.style.visibility = 'hidden';
  style.innerHTML = '@import url(' + base + 'style.css);';
  style.setAttribute('scoped', '');
  this.classList.add('-content');
  this.appendChild(style);

  // There are platform issues around using
  // @import inside shadow root. Ensuring the
  // stylesheet has loaded before putting it in
  // the shadow root seems to work around this.
  style.addEventListener('load', function() {
    self.shadowRoot.appendChild(style.cloneNode(true));
    self.style.visibility = '';
    self.styled = true;
    self.dispatchEvent(new CustomEvent('styled'));
  });
};

proto.runFontFit = function() {
  for (var i = 0; i < this.els.headings.length; i++) {
    fontFit.reformatHeading(this.els.headings[i]);
    fontFit.observeHeadingChanges(this.els.headings[i]);
  }
};

/**
 * Called when one of the attributes
 * on the element changes.
 *
 * @private
 */
proto.attributeChangedCallback = function(attr, oldVal, newVal) {
  if (attr === 'action') {
    this.configureActionButton();
    fontFit.reformatHeading(this._heading);
  }
};

/**
 * Triggers the 'action' button
 * (used in testing).
 *
 * @public
 */
proto.triggerAction = function() {
  if (this.isSupportedAction(this.getAttribute('action'))) {
    this.els.actionButton.click();
  }
};

/**
 * Configure the action button based
 * on the value of the `data-action`
 * attribute.
 *
 * @private
 */
proto.configureActionButton = function() {
  var old = this.els.actionButton.getAttribute('icon');
  var type = this.getAttribute('action');
  var supported = this.isSupportedAction(type);
  this.els.actionButton.classList.remove('icon-' + old);
  this.els.actionButton.setAttribute('icon', type);
  this.els.inner.classList.toggle('supported-action', supported);
  if (supported) { this.els.actionButton.classList.add('icon-' + type); }
};

/**
 * Validate action against supported list.
 *
 * @private
 */
proto.isSupportedAction = function(action) {
  return action && actionTypes[action];
};

/**
 * Handle clicks on the action button.
 *
 * Fired async to allow the 'click' event
 * to finish its event path before
 * dispatching the 'action' event.
 *
 * @param  {Event} e
 * @private
 */
proto.onActionButtonClick = function(e) {
  var config = { detail: { type: this.getAttribute('action') } };
  var actionEvent = new CustomEvent('action', config);
  setTimeout(this.dispatchEvent.bind(this, actionEvent));
};

/**
 * Adds helper classes to allow us to style
 * specifically when a touch interaction is
 * taking place.
 *
 * We use this specifically to apply a
 * transition-delay when the user releases
 * their finger from a button so that they
 * can momentarily see the :active state,
 * reinforcing the UI has responded to
 * their touch.
 *
 * We bind to mouse events to facilitate
 * desktop usage.
 *
 * @private
 */
proto.setupInteractionListeners = function() {
  stickyActive(this.els.inner);
};

// HACK: Create a <template> in memory at runtime.
// When the custom-element is created we clone
// this template and inject into the shadow-root.
// Prior to this we would have had to copy/paste
// the template into the <head> of every app that
// wanted to use <gaia-header>, this would make
// markup changes complicated, and could lead to
// things getting out of sync. This is a short-term
// hack until we can import entire custom-elements
// using HTML Imports (bug 877072).
var template = document.createElement('template');
template.innerHTML = [
  '<div class="inner">',
    '<button class="action-button">',
      '<content select=".l10n-action"></content>',
    '</button>',
    '<content select="h1,h2,h3,h4,a,button"></content>',
  '</div>'
].join('');

/**
 * Adds a '.active' helper class to the given
 * element that sticks around for the given
 * lag period.
 *
 * Usually the native :active hook is far
 * too quick for our UX needs.
 *
 * This may be needed in other components, so I've
 * made sure it's decoupled from gaia-header.
 *
 * We support mouse events so that our visual
 * demos still work correcly on desktop.
 *
 * Options:
 *
 *   - `on` {Function} active callback
 *   - `off` {Function} inactive callback
 *   - `ms` {Number} number of ms lag
 *
 * @param {Element} el
 * @param {Object} options
 * @private
 */
var stickyActive = (function() {
  var noop = function() {};
  var pointer = [
    { down: 'touchstart', up: 'touchend' },
    { down: 'mousedown', up: 'mouseup' }
  ]['ontouchstart' in window ? 0 : 1];

  function exports(el, options) {
    options = options || {};
    var on = options.on || noop;
    var off = options.off || noop;
    var lag = options.ms || 300;
    var timeout;

    el.addEventListener(pointer.down, function(e) {
      var target = e.target;
      clearTimeout(timeout);
      target.classList.add(exports.class);
      on();

      el.addEventListener(pointer.up, function fn(e) {
        el.removeEventListener(pointer.up, fn);
        timeout = setTimeout(function() {
          target.classList.remove(exports.class);
          off();
        }, lag);
      });
    });
  }

  exports.class = 'active';
  return exports;
})();

// Header depends on gaia-icons
loadGaiaIcons(baseComponents);

// Register and return the constructor
// and expose `protoype` (bug 1048339)
module.exports = document.registerElement('gaia-header', { prototype: proto });
module.exports._prototype = proto;

});})((function(n,w){'use strict';return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}},r=function(n){return w[n];};
w[n]=c(r,m.exports,m)||m.exports;};})('gaia-header',this));
