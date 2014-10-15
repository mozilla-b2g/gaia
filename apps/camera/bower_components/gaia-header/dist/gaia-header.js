!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.GaiaHeader=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function(define){define(function(require,exports,module){
/*jshint laxbreak:true*/

/**
 * Exports
 */

var base = window.GAIA_ICONS_BASE_URL
  || window.COMPONENTS_BASE_URL
  || 'bower_components/';

// Load it if it's not already loaded
if (!isLoaded()) { load(base + 'gaia-icons/gaia-icons.css'); }

function load(href) {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;
  document.head.appendChild(link);
  exports.loaded = true;
}

function isLoaded() {
  return exports.loaded ||
    document.querySelector('link[href*=gaia-icons]') ||
    document.documentElement.classList.contains('gaia-icons-loaded');
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-icons',this));

},{}],2:[function(require,module,exports){
;(function(define){define(function(require,exports,module){

/**
 * Pointer event abstraction to make
 * it work for touch and mouse.
 *
 * @type {Object}
 */
var pointer = [
  { down: 'touchstart', up: 'touchend' },
  { down: 'mousedown', up: 'mouseup' }
]['ontouchstart' in window ? 0 : 1];

exports = module.exports = function(el, options) {
  var released = (options && options.released) || 200;
  var min = (options && options.min) || 300;
  var timeouts = {};
  var removeReleased;

  el.addEventListener(pointer.down, function(e) {
    var start = e.timeStamp;
    var target = e.target;

    // If there is a removeRelease pending
    // run it before we add any more 'pressed'
    if (removeReleased) { removeReleased(); }

    // Add the 'pressed' class up the tree
    // and clear and pending timeouts.
    classListUp(target, 'add', 'pressed');
    clearTimeout(timeouts.pressed);

    addEventListener(pointer.up, function fn(e) {
      removeEventListener(pointer.up, fn, true);

      var duration = e.timeStamp - start;
      var delta = min - duration;
      var lag = Math.max(delta, 0);

      // Once we consider the 'press' event
      // to be over, we remove the 'pressed'
      // class and add a 'released' class.
      timeouts.pressed = setTimeout(function() {
        classListUp(target, 'remove', 'pressed');
        classListUp(target, 'add', 'released');

        removeReleased = function() {
          clearTimeout(timeouts.released);
          classListUp(target, 'remove', 'released');
          removeReleased = null;
        };

        timeouts.released = setTimeout(removeReleased, released);
      }, lag);
    }, true);
  }, true);
};

/**
 * Run a classList method on every
 * element up the DOM tree.
 *
 * @param  {Element} el
 * @param  {String} method
 * @param  {String} cls
 */
function classListUp(el, method, cls) {
  while (el && el.classList) {
    el.classList[method](cls);
    el = el.parentNode;
  }
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('pressed',this));
},{}],3:[function(require,module,exports){
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
  this.createShadowRoot().innerHTML = template;

  // Get els
  this.els = {
    actionButton: this.shadowRoot.querySelector('.action-button'),
    headings: this.querySelectorAll('h1,h2,h3,h4'),
    inner: this.shadowRoot.querySelector('.inner')
  };

  this.els.actionButton.addEventListener('click',
    proto.onActionButtonClick.bind(this));

  this.configureActionButton();
  this.setupInteractionListeners();
  this.shadowStyleHack();
  this.runFontFit();
};

proto.shadowStyleHack = function() {
  if (hasShadowCSS) { return; }
  var style = this.shadowRoot.querySelector('style').cloneNode(true);
  this.classList.add('-content', '-host');
  style.setAttribute('scoped', '');
  this.appendChild(style);
};

proto.attachedCallback = function() {
  this.restyleShadowDom();
  this.rerunFontFit();
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
  pressed(this.els.inner);
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

.icon-back:before { content: 'back'; }
.icon-menu:before { content: 'menu'; }
.icon-close:before { content: 'close'; }

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

},{"./lib/font-fit":4,"gaia-icons":1,"pressed":2}],4:[function(require,module,exports){
;(function(define){'use strict';define(function(require,exports,module){

  /**
   * Utility functions for measuring and manipulating font sizes
   */
  var GaiaHeaderFontFit = {
    /**
     * Allowable font sizes for header elements.
     */
    _HEADER_SIZES: [
      16, 17, 18, 19, 20, 21, 22, 23, 24
    ],

    /**
     * Perform auto-resize when textContent changes on element.
     *
     * @param {HTMLHeadingElement} heading The element to observer for changes
     */
    observeHeadingChanges: function(heading) {
      var observer = this._getTextChangeObserver();
      // Listen for any changes in the child nodes of the header.
      observer.observe(heading, { childList: true });
    },

    /**
     * Resize and reposition the header text based on string length and
     * container position.
     *
     * @param {HTMLHeadingElement} heading h1 text inside header to reformat.
     */
    reformatHeading: function(heading) {
      // Skip resize logic if header has no content, ie before localization.
      if (!heading || heading.textContent.trim() === '') {
        return;
      }

      // Reset our centering styles.
      this._resetCentering(heading);

      // Cache the element style properties to avoid reflows.
      var style = this._getStyleProperties(heading);

      // If the document is inside a hidden iframe
      // `window.getComputedStyle()` returns null,
      // and various canvas APIs throw errors; so we
      // must abort here to avoid exceptions.
      if (!style) {
        return;
      }

      // Perform auto-resize and center.
      style.textWidth = this._autoResizeElement(heading, style);
      this._centerTextToScreen(heading, style);
    },

    /**
     * Clear any current canvas contexts from the cache.
     */
    resetCache: function() {
      this._cachedContexts = {};
    },

    /**
     * Keep a cache of canvas contexts with a given font.
     * We do this because it is faster to create new canvases
     * than to re-set the font on existing contexts repeatedly.
     *
     * @private
     */
    _cachedContexts: {},

    /**
     * Grab or create a cached canvas context for a given fontSize/family pair.
     * @todo Add font-weight as a new dimension for caching.
     *
     * @param {number} fontSize The font size of the canvas we want.
     * @param {string} fontFamily The font family of the canvas we want.
     * @param {string} fontStyle The style of the font (default to italic).
     * @return {CanvasRenderingContext2D} A context with the specified font.
     * @private
     */
    _getCachedContext: function(fontSize, fontFamily, fontStyle) {
      // Default to italic style since this code is only ever used
      // by headers right now and header text is always italic.
      fontStyle = fontStyle || 'italic';

      var cache = this._cachedContexts;
      var ctx = cache[fontSize] && cache[fontSize][fontFamily] ?
        cache[fontSize][fontFamily][fontStyle] : null;

      if (!ctx) {
        var canvas = document.createElement('canvas');
        canvas.setAttribute('moz-opaque', 'true');
        canvas.setAttribute('width', '1');
        canvas.setAttribute('height', '1');

        ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.font = fontStyle + ' ' + fontSize + 'px ' + fontFamily;

        // Populate the contexts cache.
        if (!cache[fontSize]) {
          cache[fontSize] = {};
        }
        if (!cache[fontSize][fontFamily]) {
          cache[fontSize][fontFamily] = {};
        }
        cache[fontSize][fontFamily][fontStyle] = ctx;
      }

      return ctx;
    },

    /**
     * Use a single observer for all text changes we are interested in.
     *
     * @private
     */
    _textChangeObserver: null,

    /**
     * Auto-resize all text changes.
     *
     * @param {Array} mutations A MutationRecord list.
     * @private
     */
    _handleTextChanges: function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        this.reformatHeading(mutations[i].target);
      }
    },

    /**
     * Singleton-like interface for getting our text change observer.
     * By reusing the observer, we make sure we only ever attach a
     * single observer to any given element we are interested in.
     *
     * @private
     */
    _getTextChangeObserver: function() {
      if (!this._textChangeObserver) {
        this._textChangeObserver = new MutationObserver(
          this._handleTextChanges.bind(this));
      }
      return this._textChangeObserver;
    },

    /**
     * Get the width of a string in pixels, given its fontSize and fontFamily
     * and fontStyle.
     *
     * @param {string} string The string we are measuring.
     * @param {number} fontSize The size of the font to measure against.
     * @param {string} fontFamily The font family to measure against.
     * @param {string} fontStyle The style of the font (default to italic).
     * @return {number} The pixel width of the string with the given font.
     * @private
     */
    _getFontWidth: function(string, fontSize, fontFamily, fontStyle) {
      var ctx = this._getCachedContext(fontSize, fontFamily, fontStyle);
      return ctx.measureText(string).width;
    },

    /**
     * Get the maximum allowable fontSize for a string such that it will
     * not overflow past a maximum width.
     *
     * @param {string} string The string for which to check max font size.
     * @param {Array.<number>} allowedSizes A list of fontSizes allowed.
     * @param {string} fontFamily The font family of the string we're measuring.
     * @param {number} maxWidth The maximum number of pixels before overflow.
     * @return {Object} Dict containing max fontSize and overflow flag.
     * @private
     */
    _getMaxFontSizeInfo: function(string, allowedSizes, fontFamily, maxWidth) {
      var fontSize;
      var resultWidth;
      var i = allowedSizes.length - 1;

      do {
        fontSize = allowedSizes[i];
        resultWidth = this._getFontWidth(string, fontSize, fontFamily);
        i--;
      } while (resultWidth > maxWidth && i >= 0);

      return {
        fontSize: fontSize,
        overflow: resultWidth > maxWidth,
        textWidth: resultWidth
      };
    },

    /**
     * Get an element's content width disregarding its box model sizing.
     *
     * @param {Object} style element, or style object.
     * @returns {Number} Width in pixels of elements content.
     * @private
     */
    _getContentWidth: function(style) {
      var width = parseInt(style.width, 10);
      if (style.boxSizing === 'border-box') {
        width -= (parseInt(style.paddingRight, 10) +
          parseInt(style.paddingLeft, 10));
      }
      return width;
    },

    /**
     * Get an element's style properies.
     *
     * @param {HTMLHeadingElement} heading The element from which to get style.
     * @return {Object} A dictionary containing element's style properties.
     * @private
     */
    _getStyleProperties: function(heading) {
      var style = getComputedStyle(heading) || {};
      var contentWidth = this._getContentWidth(style);
      if (isNaN(contentWidth)) {
        contentWidth = 0;
      }

      return {
        fontFamily: style.fontFamily || 'unknown',
        contentWidth: contentWidth,
        paddingRight: parseInt(style.paddingRight, 10),
        paddingLeft: parseInt(style.paddingLeft, 10),
        offsetLeft: heading.offsetLeft
      };
    },

    /**
     * Auto-resize element's font to fit its content width.
     *
     * @param {HTMLHeadingElement} heading The element to auto-resize.
     * @param {Object} styleOptions Dictionary containing cached style props,
     *                 to avoid reflows caused by grabbing style properties.
     * @return {number} The pixel width of the resized text.
     * @private
     */
    _autoResizeElement: function(heading, styleOptions) {
      var contentWidth = styleOptions.contentWidth ||
        this._getContentWidth(heading);

      var fontFamily = styleOptions.fontFamily ||
        getComputedStyle(heading).fontFamily;

      var info = this._getMaxFontSizeInfo(
        heading.textContent,
        this._HEADER_SIZES,
        fontFamily,
        contentWidth
      );

      heading.style.fontSize = info.fontSize + 'px';

      return info.textWidth;
    },

    /**
     * Reset the auto-centering styling on an element.
     *
     * @param {HTMLHeadingElement} heading The element to reset.
     * @private
     */
    _resetCentering: function(heading) {
      // We need to set the lateral margins to 0 to be able to measure the
      // element width properly. All previously set values are ignored.
      heading.style.marginLeft = heading.style.marginRight = '0';
    },

    /**
     * Center an elements text based on screen position rather than container.
     *
     * @param {HTMLHeadingElement} heading The element we want to center.
     * @param {Object} styleOptions Dictionary containing cached style props,
     *                 avoids reflows caused by caching style properties.
     * @private
     */
    _centerTextToScreen: function(heading, styleOptions) {
      // Calculate the minimum amount of space needed for the header text
      // to be displayed without overflowing its content box.
      var minHeaderWidth = styleOptions.textWidth + styleOptions.paddingRight +
        styleOptions.paddingLeft;

      // Get the amount of space on each side of the header text element.
      var tightText = styleOptions.textWidth > (styleOptions.contentWidth - 30);
      var sideSpaceLeft = styleOptions.offsetLeft;
      var sideSpaceRight = this._getWindowWidth() - sideSpaceLeft -
        styleOptions.contentWidth - styleOptions.paddingRight -
        styleOptions.paddingLeft;

      // If there is no space to the left or right of the title
      // we apply padding so that it's not flush up against edge
      heading.classList.toggle('flush-left', tightText && !sideSpaceLeft);
      heading.classList.toggle('flush-right', tightText && !sideSpaceRight);

      // If both margins have the same width, the header is already centered.
      if (sideSpaceLeft === sideSpaceRight) {
        return;
      }

      // To center, we need to make sure the space to the left of the header
      // is the same as the space to the right, so take the largest of the two.
      var margin = Math.max(sideSpaceLeft, sideSpaceRight);

      // If the minimum amount of space our header needs plus the max margins
      // fits inside the width of the window, we can center this header.
      // We subtract 1 pixels to wrap text like Gecko.
      // See https://bugzil.la/1026955
      if (minHeaderWidth + (margin * 2) < this._getWindowWidth() - 1) {
        if (sideSpaceLeft < sideSpaceRight) {
          heading.style.marginLeft = (sideSpaceRight - sideSpaceLeft) + 'px';
        }
        if (sideSpaceRight < sideSpaceLeft) {
          heading.style.marginRight = (sideSpaceLeft - sideSpaceRight) + 'px';
        }
      }
    },

    /**
     * Cache and return the width of the inner window.
     *
     * @return {number} The width of the inner window in pixels.
     * @private
     */
    _getWindowWidth: function() {
      return window.innerWidth;
    }
  };

  module.exports = GaiaHeaderFontFit;

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('./lib/font-fit',this));

},{}]},{},[3])(3)
});