/* jshint -W083 */

(function(exports) {
  'use strict';

  /**
   * Allowable font sizes for header elements.
   */
  const HEADER_SIZES = [
    16, 17, 18, 19, 20, 21, 22, 23
  ];

  var _windowInnerWidth = 0;

  /**
   * Utility functions for measuring and manipulating font sizes
   */
  var FontSizeUtils = {

    /**
     * Keep a cache of canvas contexts with a given font.
     * We do this because it is faster to create new canvases
     * than to re-set the font on existing contexts repeatedly.
     */
    _cachedContexts: {},

    /**
     * Grab or create a cached canvas context for a given fontSize/family pair.
     * @todo Add font-weight as a new dimension for caching.
     *
     * @param {Integer} fontSize The font size of the canvas we want.
     * @param {String} fontFamily The font family of the canvas we want.
     * @return {CanvasRenderingContext2D} A context with the specified font.
     */
    _getCachedContext: function(fontSize, fontFamily) {
      var cache = this._cachedContexts;
      var ctx = cache[fontSize] ? cache[fontSize][fontFamily] : null;

      if (!ctx) {
        var canvas = document.createElement('canvas');
        canvas.setAttribute('moz-opaque', 'true');
        canvas.setAttribute('width', '1');
        canvas.setAttribute('height', '1');

        ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.font = fontSize + 'px ' + fontFamily;

        // Populate the contexts cache.
        if (!cache[fontSize]) {
          cache[fontSize] = {};
        }
        cache[fontSize][fontFamily] = ctx;
      }

      return ctx;
    },

    /**
     * Clear any current canvas contexts from the cache.
     */
    resetCache: function() {
      this._cachedContexts = {};
    },

    /**
     * Use a single observer for all text changes we are interested in.
     */
    _textChangeObserver: null,

    /**
     * Auto resize all text changes.
     * @param {Array} mutations A MutationRecord list.
     */
    _handleTextChanges: function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        this.reformatHeaderText(mutations[i].target);
      }
    },

    /**
     * Singleton-like interface for getting our text change observer.
     * By reusing the observer, we make sure we only ever attach a
     * single observer to any given element we are interested in.
     */
    _getTextChangeObserver: function() {
      if (!this._textChangeObserver) {
        this._textChangeObserver = new MutationObserver(
          this._handleTextChanges.bind(this));
      }
      return this._textChangeObserver;
    },

    /**
     * Perform auto-resize when textContent changes on element.
     *
     * @param {HTMLElement} element The element to observer for changes
     */
    _resizeOnTextChange: function(element) {
      var observer = this._getTextChangeObserver();
      // Listen for any changes in the child nodes of the header.
      observer.observe(element, { childList: true });
    },

    /**
     * Get the width of a string in pixels, given its fontSize and fontFamily.
     *
     * @param {String} string The string we are measuring.
     * @param {Integer} fontSize The size of the font to measure against.
     * @param {String} fontFamily The font family to measure against.
     * @return {Integer} The pixel width of the string with the given font.
     */
    getFontWidth: function(string, fontSize, fontFamily) {
      var ctx = this._getCachedContext(fontSize, fontFamily);
      return ctx.measureText(string).width;
    },

    /**
     * Get the maximum allowable fontSize for a string such that it will
     * not overflow past a maximum width.
     *
     * @param {String} string The string for which to check max font size.
     * @param {Array} allowedSizes A list of fontSizes allowed.
     * @param {String} fontFamily The font family of the string we're measuring.
     * @param {Integer} maxWidth The maximum number of pixels before overflow.
     * @return {Object} Dict containing max fontSize and overflow flag.
     */
    getMaxFontSizeInfo: function(string, allowedSizes, fontFamily, maxWidth) {
      var fontSize;
      var resultWidth;
      var i = allowedSizes.length - 1;

      do {
        fontSize = allowedSizes[i];
        resultWidth = this.getFontWidth(string, fontSize, fontFamily);
        i--;
      } while (resultWidth > maxWidth && i >= 0);

      return {
        fontSize: fontSize,
        overflow: resultWidth > maxWidth,
        textWidth: resultWidth
      };
    },

    /**
     * Get the amount of characters truncated from overflow ellipses.
     *
     * @param {String} string The string for which to check max font size.
     * @param {Integer} fontSize The font size of the string we are measuring.
     * @param {String} fontFamily The font family of the string we're measuring.
     * @param {Integer} maxWidth The maximum number of pixels before overflow.
     */
    getOverflowCount: function(string, fontSize, fontFamily, maxWidth) {
      var substring;
      var resultWidth;
      var overflowCount = -1;

      do {
        overflowCount++;
        substring = string.substr(0, string.length - overflowCount);
        resultWidth = this.getFontWidth(substring, fontSize, fontFamily);
      } while (substring.length > 0 && resultWidth > maxWidth);

      return overflowCount;
    },

    /**
     * Get an array of allowed font sizes for an element
     *
     * @param {HTMLElement} element The element to get allowed sizes for.
     * @return {Array} An array containing pizels values of allowed sizes.
     */
    getAllowedSizes: function(element) {
      if (element.tagName === 'H1' && element.parentNode.tagName === 'HEADER') {
        return HEADER_SIZES;
      }
      // No allowed sizes for this element, so return empty array.
      return [];
    },

    /**
     * Get an element width disregarding its box model sizing.
     *
     * @param {Object} style
     * @returns {Number}
     */
    getElementWidth: function(style) {
      var width = parseInt(style.width, 10);
      if (style.boxSizing === 'border-box') {
        width -= (parseInt(style.paddingRight, 10) +
          parseInt(style.paddingLeft, 10));
      }
      return width;
    },

    /**
     * Auto-resize + center.
     *
     * @param {HTMLElement} element The element to perform auto-resize on.
     * @return {Object} An object containing measurements related to element.
     */
    autoResizeElement: function(element) {
      var allowedSizes = this.getAllowedSizes(element);
      if (allowedSizes.length === 0) {
        return false;
      }

      var style = window.getComputedStyle(element);
      var elementStyle = {
        fontFamily: style.fontFamily,
        width: this.getElementWidth(style),
        paddingRight: parseInt(style.paddingRight, 10),
        paddingLeft: parseInt(style.paddingLeft, 10),
        offsetLeft: element.offsetLeft,
        textWidth: 0 // Set below.
      };

      var info = this.getMaxFontSizeInfo(
        element.textContent,
        allowedSizes,
        elementStyle.fontFamily,
        elementStyle.width
      );
      element.style.fontSize = info.fontSize + 'px';

      elementStyle.textWidth = info.textWidth;

      return elementStyle;
    },

    /**
     * Reset basic styling.
     *
     * @param {HTMLElement} element The element to perform auto-resize on.
     */
    resetFormatting: function(element) {
      element.style.marginLeft = element.style.marginRight = '0';
    },

    /**
     * Resize and reposition the header text based on string length and
     * container position.
     *
     * @param {HTMLElement} header h1 text inside header to reformat.
     */
    reformatHeaderText: function(header) {
      if (header.textContent.trim() === '') {
        // This is the case when strings are not yet localized.
        return;
      }

      this.resetFormatting(header);
      var style = this.autoResizeElement(header);
      this.centerTextToScreen(header, style);
    },

    /**
     * Center an elements text based on screen position rather than container.
     *
     * @param {HTMLElement} element The element whose text we want to center.
     * @param {number} style An object containing measurements of element.
     */
    centerTextToScreen: function(element, style) {
      // If there are padding on each side, we need to add their values.
      var textWidth = style.textWidth + style.paddingRight + style.paddingLeft;

      // Get the width of side buttons.
      var sideSpaceLeft = style.offsetLeft;
      var sideSpaceRight = this.getWindowWidth() - sideSpaceLeft - style.width -
        style.paddingRight - style.paddingLeft;

      // If both margins have the same width, the header is already centered.
      if (sideSpaceLeft === sideSpaceRight) {
        return;
      }

      var margin = Math.max(sideSpaceLeft, sideSpaceRight);

      // Can the header be centered?
      if (textWidth + (margin * 2) <= this.getWindowWidth()) {
        element.style.marginLeft = element.style.marginRight = margin + 'px';
      }
    },

    /**
     * When certain elements overflow, auto resize their fonts.
     *
     * @param {UIEvent} evt The overflow/underflow event object.
     */
    handleTextFlowChange: function(evt) {
      var element = evt.target;
      // This check should really be in its own function, but as a
      // performance optimization we will avoid the overhead of any
      // additional function call by doing this check inline.
      if (element.tagName === 'H1' && element.parentNode.tagName === 'HEADER') {
        this.reformatHeaderText(element);
      }
    },

    /**
     * Initialize the FontSizeUtils, add overflow handler and perform
     * auto resize once strings have been localized.
     */
    init: function() {
      // When l10n is ready, resize all currently displayed headers.
      navigator.mozL10n && navigator.mozL10n.ready(function() {
        // Add overflow listener once document body is ready.
        // YYY: This code is moved inside navigator.mozL10n.ready() to avoid
        // resizing on reflow before the initial resizing is done below.
        if (document.readyState === 'loading') {
          window.addEventListener('DOMContentLoaded', function() {
            document.body.addEventListener('overflow',
              this.handleTextFlowChange.bind(this), true);
          }.bind(this));
        } else {
          document.body.addEventListener('overflow',
            this.handleTextFlowChange.bind(this), true);
        }

        this.reformatHeaderInNode(document);
      }.bind(this));
    },

    /**
     * Reformat all the headers located inside a DOM node.
     * @param {HTMLElement} domNode
     */
    reformatHeaderInNode: function(domNode) {
      var headers = domNode.querySelectorAll('header > h1');
      for (var i = 0; i < headers.length; i++) {
        // YYY: On some apps wrapping inside a requestAnimationFrame reduces the
        // number of calls to reformatHeaderText().
        window.requestAnimationFrame(function(header) {
          this._resizeOnTextChange(header);
          this.reformatHeaderText(header);
        }.bind(this, headers[i]));
      }
    },

    getWindowWidth: function() {
      _windowInnerWidth = window.innerWidth;
      return function() {
        return _windowInnerWidth;
      };
    }()
  };

  FontSizeUtils.init();

  exports.FontSizeUtils = FontSizeUtils;
}(this));
