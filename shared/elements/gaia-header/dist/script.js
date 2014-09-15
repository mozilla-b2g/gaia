!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.GaiaHeader=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function(define){'use strict';define(function(require,exports,module){

/**
 * Exports
 */

exports = module.exports = function(base) {
  var url = base + 'gaia-icons/style.css';
  if (!isLoaded()) { load(url); }
};

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

});})((function(n,w){'use strict';return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}},r=function(n){return w[n];};
w[n]=c(r,m.exports,m)||m.exports;};})('gaia-icons',this));

},{}],2:[function(require,module,exports){
(function(define){'use strict';define(function(require,exports,module){
/*globals define,exports,module,require*/

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

});})((function(n,w){'use strict';return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}},r=function(n){return w[n];};
w[n]=c(r,m.exports,m)||m.exports;};})('./lib/font-fit',this));

},{}],3:[function(require,module,exports){
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

},{"./lib/font-fit":2,"gaia-icons":1}]},{},[3])(3)
});