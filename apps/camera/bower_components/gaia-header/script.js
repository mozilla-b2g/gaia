(function(define){'use strict';define(function(require,exports,module){
/*globals define*//*jshint node:true*/

/**
 * Dependencies
 */

var fontFit = require('./lib/font-fit');

/**
 * Locals
 */

var baseComponents = window.COMPONENTS_BASE_URL || 'bower_components/';
var base = window.GAIA_HEADER_BASE_URL || baseComponents + 'gaia-header/';

// Extend from the HTMLElement prototype
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

  // Action button
  this.configureActionButton();
  this.els.actionButton.addEventListener('click',
    proto.onActionButtonClick.bind(this));

  shadow.appendChild(tmpl);
  this.styleHack();
  setTimeout(this.runFontFit.bind(this), 50);
};

/**
 * Load in the the component's styles.
 *
 * We're working around a few platform bugs
 * here related to @import in the shadow-dom
 * stylesheet. When HTML-Imports are ready
 * we won't have to use @import anymore.
 *
 * @private
 */
proto.styleHack = function() {
  var style = document.createElement('style');
  var self = this;

  this.style.visibility = 'hidden';
  style.innerHTML = '@import url(' + base + 'style.css);';
  style.setAttribute('scoped', '');
  this.classList.add('content');
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
 * When called, trigger the action button.
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

  this.els.inner.classList.toggle('supported-action', supported);
  if (!supported) { return; }

  this.els.actionButton.style.display = 'block';
  this.els.actionButton.classList.remove('icon-' + old);
  this.els.actionButton.classList.add('icon-' + type);
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
    '<button class="action-button"></button>',
    '<content></content>',
  '</div>'
].join('');

// Load the icon-font into the document <head>
(function loadFont() {
  var href = baseComponents + 'gaia-icons/style.css';
  var existing = document.querySelector('link[href="' + href + '"]');
  if (existing) { return; }
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;
  document.head.appendChild(link);
})();

// Register and return the constructor
module.exports = document.registerElement('gaia-header', { prototype: proto });

});})((function(n,w){'use strict';return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}},r=function(n){return w[n];};
w[n]=c(r,m.exports,m)||m.exports;};})('gaia-header',this));
