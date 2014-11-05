;(function(define){'use strict';define(function(require,exports,module){
/*jshint esnext:true*/

/**
 * Dependencies
 */

var fontFit = require('./lib/font-fit');
var pressed = require('pressed');

// Load 'gaia-icons' font-family
require('gaia-icons');

/**
 * Detects presence of shadow-dom
 * CSS selectors.
 *
 * @return {Boolean}
 */
var hasShadowCSS = (function() {
  try { document.querySelector(':host'); return true; }
  catch (e) { return false; }
})();

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
  close: true
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
  this.createShadowRoot().innerHTML = template;

  // Get els
  this.els = {
    actionButton: this.shadowRoot.querySelector('.action-button'),
    headings: this.querySelectorAll('h1,h2,h3,h4'),
    inner: this.shadowRoot.querySelector('.inner')
  };

  this.onActionButtonClick = this.onActionButtonClick.bind(this);
  this.els.actionButton.addEventListener('click', this.onActionButtonClick);
  this.setupInteractionListeners();
  this.configureActionButton();
  this.shadowStyleHack();
  this.runFontFit();
  this.setupRtl();
};

/**
 * Called when the element is
 * attached to the DOM.
 *
 * @private
 */
proto.attachedCallback = function() {
  this.restyleShadowDom();
  this.rerunFontFit();
  this.setupRtl();
};

/**
 * Called when the element is detached
 * (removed) from the DOM.
 *
 * @private
 */
proto.detachedCallback = function() {
  this.teardownRtl();
};

/**
 * Sets up mutation observes to listen for
 * 'dir' attribute changes on <html> and
 * runs the initial configuration.
 *
 * Although the `dir` attribute should
 * be able to be placed on any ancestor
 * node, we are currently only supporting
 * <html>. This is to keep the logic
 * simple and compatible with mozL10n.js.
 *
 * We could walk up the DOM and attach
 * a mutation observer to the nearest
 * ancestor with a `dir` attribute,
 * but then things start to get messy
 * and complex for little gain.
 *
 * We re-run font-fit to make sure
 * the heading is re-positioned after
 * the buttons switch around. We could
 * potentially let the font-fit observer
 * catch the `textContent` change that
 * *may* happen after a language change,
 * but that's only if the heading has
 * been localized.
 *
 * Once `:host-context()` selector lands
 * (bug 1082060) we may be able to reconsider
 * this implementation. But even then, we would
 * need a way to re-run font-fit.
 *
 * @private
 */
proto.setupRtl = function() {
  if (this.observerRtl) { return; }

  var self = this;
  this.observerRtl = new MutationObserver(onAttributeChanged);
  this.observerRtl.observe(document.documentElement, { attributes: true });
  this.configureRtl();

  function onAttributeChanged(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.attributeName !== 'dir') { return; }
      this.configureRtl();
      this.rerunFontFit();
    }, self);
  }
};

/**
 * Stop the mutation observer.
 *
 * @private
 */
proto.teardownRtl = function() {
  if (!this.observerRtl) { return; }
  this.observerRtl.disconnect();
  this.observerRtl = null;
};

/**
 * Syncs the inner's 'dir' attribute
 * with the one on <html> .
 *
 * @private
 */
proto.configureRtl = function() {
  var value = document.documentElement.getAttribute('dir') || 'ltr';
  if (value) this.els.inner.setAttribute('dir', value);
};

/**
 * The Gecko platform doesn't yet have
 * `::content` or `:host`, selectors,
 * without these we are unable to style
 * user-content in the light-dom from
 * within our shadow-dom style-sheet.
 *
 * To workaround this, we clone the <style>
 * node into the root of the component,
 * so our selectors are able to target
 * light-dom content.
 *
 * @private
 */
proto.shadowStyleHack = function() {
  if (hasShadowCSS) { return; }
  var style = this.shadowRoot.querySelector('style').cloneNode(true);
  this.classList.add('-content', '-host');
  style.setAttribute('scoped', '');
  this.appendChild(style);
};

/**
 * Workaround for bug 1056783.
 *
 * Fixes shadow-dom stylesheets not applying
 * when shadow host node is detached on
 * shadow-root creation.
 *
 * @private
 */
proto.restyleShadowDom = function() {
  var style = this.shadowRoot.querySelector('style');
  this.shadowRoot.removeChild(style);
  this.shadowRoot.appendChild(style);
};

/**
 * Runs the logic to size and position
 * header text inside the available space.
 *
 * @private
 */
proto.runFontFit = function() {
  for (var i = 0; i < this.els.headings.length; i++) {
    fontFit.reformatHeading(this.els.headings[i]);
    fontFit.observeHeadingChanges(this.els.headings[i]);
  }
};

/**
 * Rerun font-fit logic.
 *
 * TODO: We really need an official API for this.
 *
 * @private
 */
proto.rerunFontFit = function() {
  for (var i = 0; i < this.els.headings.length; i++) {
    this.els.headings[i].textContent = this.els.headings[i].textContent;
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
  pressed(this.els.inner, { instant: true });
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

var template = `
<style>

:host {
  display: block;

  --gaia-header-button-color:
    var(--header-button-color,
    var(--header-color,
    var(--link-color,
    inherit)));
}

/**
 * [hidden]
 */

gaia-header[hidden] {
  display: none;
}

/** Reset
 ---------------------------------------------------------*/

::-moz-focus-inner { border: 0; }

/** Inner
 ---------------------------------------------------------*/

.inner {
  display: flex;
  min-height: 50px;

  background:
    var(--header-background,
    var(--background,
    #fff));
}

/** Action Button
 ---------------------------------------------------------*/

/**
 * 1. Hidden by default
 */

.action-button {
  display: none; /* 1 */
  position: relative;
  align-items: center;
  width: 50px;
  font-size: 30px;
  border: none;

  color:
    var(--header-action-button-color,
    var(--header-icon-color,
    var(--gaia-header-button-color)));
}

/**
 * .action-supported
 *
 * 1. For icon vertical-alignment
 */

.supported-action .action-button {
  display: flex; /* 1 */
}

/** Action Button Icon
 ---------------------------------------------------------*/

/**
 * 1. To enable vertical alignment.
 */

.action-button:before {
  display: block;
}

/** Action Button Text
 ---------------------------------------------------------*/

/**
 * To provide custom localized content for
 * the action-button, we allow the user
 * to provide an element with the class
 * .l10n-action. This node is then
 * pulled inside the real action-button.
 *
 * Example:
 *
 *   <gaia-header action="back">
 *     <span class="l10n-action" aria-label="Back">Localized text</span>
 *     <h1>title</h1>
 *   </gaia-header>
 */

::content .l10n-action {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  font-size: 0;
}

/** Title
 ---------------------------------------------------------*/

/**
 * 1. Vertically center text. We can't use flexbox
 *    here as it breaks text-overflow ellipsis
 *    without an inner div.
 */

::content h1 {
  flex: 1;
  margin: 0;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  text-align: center;
  line-height: 50px; /* 1 */
  font-weight: 300;
  font-style: italic;
  font-size: 24px;

  color:
    var(--header-title-color,
    var(--header-color,
    var(--title-color,
    var(--text-color,
    inherit))));
}

/**
 * .flush-left
 *
 * When the fitted text is flush with the
 * edge of the left edge of the container
 * we pad it in a bit.
 */

::content h1.flush-left {
  padding-left: 10px;
}

/**
 * .flush-right
 *
 * When the fitted text is flush with the
 * edge of the right edge of the container
 * we pad it in a bit.
 */

::content h1.flush-right {
  padding-right: 10px; /* 1 */
}

/** Buttons
 ---------------------------------------------------------*/

a,
button,
::content a,
::content button {
  box-sizing: border-box;
  display: flex;
  border: none;
  width: auto;
  height: auto;
  margin: 0;
  padding: 0 10px;
  font-size: 14px;
  line-height: 1;
  min-width: 50px;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  text-align: center;
  background: none;
  border-radius: 0;
  font-style: italic;

  color:
    var(--gaia-header-button-color);
}

/**
 * .pressed
 *
 * The pressed.js library adds a 'pressed'
 * class which we use instead of :active,
 * to give us more control over
 * interaction styling.
 */

a.pressed,
button.pressed,
::content a.pressed,
::content button.pressed {
  opacity: 0.2;
}

/**
 * .released
 *
 * The pressed.js library adds a 'released'
 * class for a few ms after the finger
 * leaves the button. This allows us
 * to style touchend interactions.
 */

a.released,
button.released,
::content a.released,
::content button.released {
  transition: opacity 200ms;
}

/**
 * [hidden]
 */

::content a[hidden],
::content button[hidden] {
  display: none;
}

/**
 * [disabled]
 */

::content a[disabled],
::content button[disabled] {
  pointer-events: none;
  opacity: 0.3;
}

/** Icon Buttons
 ---------------------------------------------------------*/

/**
 * Icons are a different color to text
 */

::content .icon,
::content [data-icon] {
  color:
    var(--header-icon-color,
    var(--gaia-header-button-color));
}

/** Icons
 ---------------------------------------------------------*/

[class^="icon-"]:before,
[class*="icon-"]:before {
  font-family: 'gaia-icons';
  font-style: normal;
  text-rendering: optimizeLegibility;
  font-weight: 500;
}

.icon-menu:before { content: 'menu'; }
.icon-close:before { content: 'close'; }

/** Back Icon
 ---------------------------------------------------------*/

.icon-back:before {
  content: 'back';
}

/**
 * [dir='rtl']
 *
 * Switch to use the 'forward' icon
 * when in right-to-left direction.
 */

[dir='rtl'] .icon-back:before {
  content: 'forward';
}

</style>

<div class="inner">
  <button class="action-button">
    <content select=".l10n-action"></content>
  </button>
  <content select="h1,h2,h3,h4,a,button"></content>
</div>`;

// If the browser doesn't support shadow-css
// selectors yet, we update the template
// to use the shim classes instead.
if (!hasShadowCSS) {
  template = template
    .replace('::content', '.-content', 'g')
    .replace(':host', '.-host', 'g');
}

// Register and return the constructor
// and expose `protoype` (bug 1048339)
module.exports = document.registerElement('gaia-header', { prototype: proto });
module.exports._prototype = proto;

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));
