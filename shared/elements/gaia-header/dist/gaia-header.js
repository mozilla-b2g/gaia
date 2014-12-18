!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.GaiaHeader=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
;(function(define){define(function(require,exports,module){
'use strict';

var noop  = function() {};

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

module.exports.register = function(name, props) {
  var proto = mixin(Object.create(base), props);
  var output = extractLightDomCSS(proto.template, name);

  proto.template =  output.template;
  proto.lightCSS =  output.lightCSS;

  // Register and return the constructor
  // and expose `protoype` (bug 1048339)
  var El = document.registerElement(name, { prototype: proto });
  //El.prototype = proto;
  return El;
};

var base = mixin(Object.create(HTMLElement.prototype), {
  attributeChanged: noop,
  attached: noop,
  detached: noop,
  created: noop,
  template: '',

  createdCallback: function() {
    this.injectLightCSS(this);
    this.created();
  },

  attributeChangedCallback: function(name, from, to) {
    this.attributeChanged(name, from, to);
  },

  attachedCallback: function() {
    this.attached();
  },

  detachedCallback: function() {
    this.detached();
  },

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
  injectLightCSS: function(el) {
    if (hasShadowCSS) { return; }
    var style = document.createElement('style');
    style.setAttribute('scoped', '');
    style.innerHTML = el.lightCSS;
    el.appendChild(style);
  }
});

/**
 * Extracts the :host and ::content rules
 * from the shadow-dom CSS and rewrites
 * them to work from the <style scoped>
 * injected at the root of the component.
 *
 * @return {String}
 */
function extractLightDomCSS(template, name) {
  var regex = /(?::host|::content)[^{]*\{[^}]*\}/g;
  var lightCSS = '';

  if (!hasShadowCSS) {
    template = template.replace(regex, function(match) {
      lightCSS += match.replace(/::content|:host/g, name);
      return '';
    });
  }

  return {
    template: template,
    lightCSS: lightCSS
  };
}

function mixin(a, b) {
  for (var key in b) { a[key] = b[key]; }
  return a;
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-component',this));

},{}],2:[function(require,module,exports){
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
  console.log('>>> loading gaia icons');
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

},{}],3:[function(require,module,exports){
;(function(define){'use strict';define(function(require,exports,module){
/*jshint esnext:true*/

/**
 * Dependencies
 */

var Component = require('gaia-component');
var fontFit = require('./lib/font-fit');

// Load 'gaia-icons' font-family
require('gaia-icons');

/**
 * Supported action types
 *
 * @type {Object}
 */
var actionTypes = { menu: 1, back: 1, close: 1 };

const KNOWN_ATTRIBUTES = ['action', 'skip-init', 'start', 'end'];

/**
 * Register the component.
 *
 * @return {Element} constructor
 */
module.exports = Component.register('gaia-header', {

  /**
   * Called when the element is first created.
   *
   * Here we create the shadow-root and
   * inject our template into it.
   *
   * @private
   */
  created: function() {
    this.attrs = {};
    this.runFontFitTimeout = null;

    KNOWN_ATTRIBUTES.forEach((name) => this._updateAttribute(name));

    this.createShadowRoot().innerHTML = this.template;

    // Get els
    this.els = {
      actionButton: this.shadowRoot.querySelector('.action-button'),
      headings: this.querySelectorAll('h1,h2,h3,h4'),
      inner: this.shadowRoot.querySelector('.inner')
    };

    this.els.actionButton.addEventListener('click', e => this.onActionButtonClick(e));
    this.configureActionButton();
  },

  /**
   * Initializes the component.
   * It especially runs the font-fit algorithm once, and registers the
   * textContent observer.
   *
   * @private
   */
  init: function() {
    if (this.attrs.skipInit !== null) {
      return;
    }

    this.runFontFit();
    this.addFontFitObserver();
  },

  /**
   * Called when the element is
   * attached to the DOM.
   *
   * @private
   */
  attached: function() {
    this.init();
  },

  /**
   * Called when the element is detached from the DOM
   */
  detached: function() {
    this.removeFontFitObserver();
  },

  /**
   * Called when one of the attributes
   * on the element changes.
   *
   * @private
   */
  attributeChanged: function(attr) {
    if (KNOWN_ATTRIBUTES.indexOf(attr) === -1) {
      return;
    }

    this._updateAttribute(attr);

    if (attr === 'skip-init') {
      setTimeout(() => this.init());
      return;
    }

    if (attr === 'action') {
      this.configureActionButton();
    }

    this.runFontFitSoon();
  },

  /**
   * Used to camel case a word containing dashes
   *
   * @private
   */
  _camelCase: function ut_camelCase(str) {
    return str.replace(/-(.)/g, function replacer(str, p1) {
      return p1.toUpperCase();
    });
  },

  /**
   * Updates an attribute value in the internal attrs object
   *
   * @private
   */
  _updateAttribute: function(name) {
    var newVal = this.getAttribute(name);
    this.attrs[this._camelCase(name)] = newVal;
  },

  /**
   * Adds the textContent observer in the font fit library.
   *
   * @private
   */
  addFontFitObserver: function() {
    for (var i = 0; i < this.els.headings.length; i++) {
      fontFit.observeHeadingChanges(this.els.headings[i]);
    }
  },

  /**
   * Removes the textContent observer in the font fit library.
   *
   * @private
   */
  removeFontFitObserver: function() {
    fontFit.disconnectHeadingObserver();
  },

  /**
   * This function will debounce the use of runFontFit. This is used in
   * attributeChanged so that the component user can change different attributes
   * and still have runFontFit run once.
   *
   * @private
   */
  runFontFitSoon: function() {
    clearTimeout (this.runFontFitTimeout);
    this.runFontFitTimeout = setTimeout(() => this.runFontFit());
  },

  /**
   * Runs the logic to size and position
   * header text inside the available space.
   *
   * @private
   */
  runFontFit: function() {
    for (var i = 0; i < this.els.headings.length; i++) {
      var heading = this.els.headings[i];
      var start = parseInt(this.attrs.start);
      var end = parseInt(this.attrs.end);
      start = isNaN(start) ? null : start;
      end = isNaN(end) ? null : end;
      fontFit.reformatHeading(heading, start, end);
    }
  },

  /**
   * Triggers the 'action' button
   * (used in testing).
   *
   * @public
   */
  triggerAction: function() {
    if (this.isSupportedAction(this.attrs.action)) {
      this.els.actionButton.click();
    }
  },

  /**
   * Configure the action button based
   * on the value of the `data-action`
   * attribute.
   *
   * @private
   */
  configureActionButton: function() {
    var old = this.els.actionButton.getAttribute('icon');
    var type = this.attrs.action;
    var supported = this.isSupportedAction(type);
    this.els.actionButton.classList.remove('icon-' + old);
    this.els.actionButton.setAttribute('icon', type);
    this.els.inner.classList.toggle('supported-action', supported);
    if (supported) { this.els.actionButton.classList.add('icon-' + type); }
  },

  /**
   * Validate action against supported list.
   *
   * @private
   */
  isSupportedAction: function(action) {
    return !!(action && actionTypes[action]);
  },

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
  onActionButtonClick: function(e) {
    var config = { detail: { type: this.attrs.action } };
    var actionEvent = new CustomEvent('action', config);
    setTimeout(this.dispatchEvent.bind(this, actionEvent));
  },

  template: `
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

  :host[hidden] {
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
    direction: ltr;

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
    width: 50px;
    font-size: 30px;
    margin: 0;
    padding: 0;
    border: 0;
    align-items: center;
    background: none;
    cursor: pointer;
    transition: opacity 200ms 280ms;

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

  /**
   * :active
   */

  .action-button:active {
    transition: none;
    opacity: 0.2;
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
    -moz-user-select: none;

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
    cursor: pointer;

    transition: opacity 200ms 280ms;

    color:
      var(--gaia-header-button-color);
  }

  /**
   * :active
   */

  ::content a:active,
  ::content button:active {
    transition: none;
    opacity: 0.2;
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
    color: var(--header-disabled-button-color);
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
  .icon-back:before { content: 'back'; }

  </style>

  <div class="inner">
    <button class="action-button">
      <content select=".l10n-action"></content>
    </button>
    <content select="h1,h2,h3,h4,a,button"></content>
  </div>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));

},{"./lib/font-fit":4,"gaia-component":1,"gaia-icons":2}],4:[function(require,module,exports){
;(function(define){'use strict';define(function(require,exports,module){

  var privMap = new WeakMap();

  function getPriv(instance) {
    var privMembers = privMap.get(instance);

    if (!privMembers) {
      privMembers = {
        start: null,
        end: null
      };
      privMap.set(instance, privMembers);
    }

    return privMembers;
  }

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
     * Stops the observer from observing the heading changes.
     */
    disconnectHeadingObserver: function() {
      var observer = this._getTextChangeObserver();
      observer.disconnect();
    },

    /**
     * Resize and reposition the header text based on string length and
     * container position
     *
     * @param {HTMLHeadingElement} heading h1 text inside header to reformat.
     * @param {Number} start Offset in pixels between the start of the text
     * container and the start of the inner window.
     * @param {Number} end Offset in pixels between the end of the text
     * container and the end of the inner window.
     */
    reformatHeading: function(heading, start, end) {
      // Skip resize logic if header has no content, ie before localization.
      if (!heading || heading.textContent.trim() === '') {
        return;
      }

      console.log('>> running runFontFit for heading', heading.textContent);

      var style;
      var priv = getPriv(heading);
      if (start !== undefined) {
        priv.start = start;
      }

      if (end !== undefined) {
        priv.end = end;
      }

      start = priv.start;
      end = priv.end;

      var hasSizeInformation = start !== null || end !== null;

      // Reset our centering styles.
      this._resetCentering(heading);

      if (hasSizeInformation) {
        console.log('>>> hasSizeInformation');
        style = {
          fontFamily: 'sans-serif',
          contentWidth: this._getWindowWidth() - (start || 0) - (end || 0),
          paddingRight: 0,
          paddingLeft: 0,
          offsetLeft: start || 0,
          rtlFriendly: true
        };
      } else {
        console.log('>>> has no size information');
        // Cache the element style properties to avoid reflows.
        style = this._getStyleProperties(heading);
      }

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
     * We reformat only once even if several mutations occur for one target.
     *
     * @param {Array} mutations A MutationRecord list.
     * @private
     */
    _handleTextChanges: function(mutations) {
      var targets = new Set();

      for (var i = 0; i < mutations.length; i++) {
        targets.add(mutations[i].target);
      }

      for (var target of targets) {
        this.reformatHeading(target);
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

      var text = heading.textContent.replace(/\s+/g, ' ').trim();

      var info = this._getMaxFontSizeInfo(
        text,
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
      heading.style.MozMarginStart = heading.style.MozMarginEnd = '0';
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

      var propLeft, propRight;
      if (styleOptions.rtlFriendly) {
        propLeft = 'MozMarginStart';
        propRight = 'MozMarginEnd';
      } else {
        propLeft = 'marginLeft';
        propRight = 'marginRight';
      }

      // reset the previous value
      ['marginLeft', 'marginRight', 'MozMarginStart', 'MozMarginEnd'].forEach(
        (prop) => delete heading.style[prop]
      );

      // To center, we need to make sure the space to the left of the header
      // is the same as the space to the right, so take the largest of the two.
      var margin = Math.max(sideSpaceLeft, sideSpaceRight);

      // If the minimum amount of space our header needs plus the max margins
      // fits inside the width of the window, we can center this header.
      // We subtract 1 pixels to wrap text like Gecko.
      // See https://bugzil.la/1026955
      if (minHeaderWidth + (margin * 2) < this._getWindowWidth() - 1) {
        if (sideSpaceLeft < sideSpaceRight) {
          heading.style[propLeft] = (sideSpaceRight - sideSpaceLeft) + 'px';
        }
        if (sideSpaceRight < sideSpaceLeft) {
          heading.style[propRight] = (sideSpaceLeft - sideSpaceRight) + 'px';
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
