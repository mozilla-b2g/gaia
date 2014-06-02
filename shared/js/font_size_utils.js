(function(exports) {
  'use strict';

  /**
   * Allowable font sizes for header elements.
   */
  var HEADER_SIZES = [
    16, 17, 18, 19, 20, 21, 22, 23
  ];

  var _screenWidth = 0;

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
        this.autoResizeElement(mutations[i].target);
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
        //overflow: resultWidth > maxWidth,
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
      if (element.tagName === 'H1' && element.parentNode &&
          element.parentNode.tagName === 'HEADER') {
        return HEADER_SIZES;
      }
      // No allowed sizes for this element, so return empty array.
      return [];
    },

    /**
     * Perform auto-resize logic for an element.
     *
     * @param {HTMLElement} element The element to perform auto-resize on.
     */
    autoResizeElement: function(element) {
      var allowedSizes = this.getAllowedSizes(element);
      if (allowedSizes.length === 0) {
        return;
      }
      var style = window.getComputedStyle(element);
      var info = this.getMaxFontSizeInfo(element.textContent, allowedSizes,
                                         style.fontFamily,
                                         parseInt(style.width));
      element.style.fontSize = info.fontSize + 'px';

      // If we have resized to less than our max fontSize for this
      // container, we need to listen for textContent changes so that
      // we can auto resize to a larger fontSize if space allows it.
      if (info.fontSize !== allowedSizes[allowedSizes.length - 1]) {
        this._resizeOnTextChange(element);
      }
    },

    /**
     * When certain elements overflow, auto resize their fonts
     *
     * @param {UIEvent} ext The overflow/underflow event object.
     */
    handleTextFlowChange: function(evt) {
      var element = evt.target;
      // This check should really be in its own function, but as a
      // performance optimization we will avoid the overhead of any
      // additional function call by doing this check inline.
      if (element.tagName === 'H1' && element.parentNode &&
          element.parentNode.tagName === 'HEADER') {
        this.reformatHeaderText(element);
      }
    },

    /**
     * Resize and reposition the header text based on string length and
     * container position.
     *
     * @param {HTMLElement} header h1 text inside header to reformat.
     */
    reformatHeaderText: function(header) {
      FontSizeUtils.autoResizeElement(header);
      FontSizeUtils.centerTextToScreen(header);
    },

    /**
     * Center an elements text based on screen position rather than container.
     *
     * @param {HTMLElement} element The element whose text we want to center.
     */
    centerTextToScreen: function(element) {
      // Get header and text widths.
      var headerWidth = element.clientWidth;

      // @todo Inline with autoResizeElement to avoid calling getAllowedSizes.
      var style = window.getComputedStyle(element);
      var allowedSizes = FontSizeUtils.getAllowedSizes(element);
      var info = FontSizeUtils.getMaxFontSizeInfo(
        element.textContent,
        allowedSizes,
        style.fontFamily,
        parseInt(style.width, 10)
      );

      // There is a 10px padding on each side, so we need to subtract 20.
      var textWidth = info.textWidth + 20;

      var sideSpaceLeft = element.offsetLeft;
      var sideSpaceRight = FontSizeUtils.containerWidth -
        sideSpaceLeft - headerWidth;

      var margin = Math.max(sideSpaceLeft, sideSpaceRight);

      console.log('containerWidth', FontSizeUtils.containerWidth, 'headerWidth',
        headerWidth, 'textWidth', textWidth, 'margin', margin)

      // Can the header be centered?
      if (textWidth + (margin * 2) <= FontSizeUtils.containerWidth) {
        console.log('Header centered')
        element.style.marginLeft = element.style.marginRight = margin + 'px';
      } else if (textWidth <= headerWidth) {
        console.log('Header not centered')
        // Do nothing, just for better debugging.
      } else if (textWidth > headerWidth) {
        console.log('Header not centered and truncated')
        element.style.textOverflow = 'ellipsis';
      }
    },

    /**
     * Initialize the FontSizeUtils, add overflow handler and perform
     * auto resize once strings have been localized.
     */
    init: function () {
      // Add overflow listener once document body is ready.
      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', function() {
          document.body.addEventListener('overflow',
            this.handleTextFlowChange.bind(this), true);
        }.bind(this));
      } else {
        document.body.addEventListener('overflow',
          this.handleTextFlowChange.bind(this), true);
      }

      // When l10n is ready, resize all currently displayed headers.
      navigator.mozL10n && navigator.mozL10n.ready(function() {
        var headers = document.querySelectorAll('header > h1');
        for (var i = 0; i < headers.length; i++) {
          this.autoResizeElement(headers[i]);
        }
      });
    },

    /**
     * Cache the screen width.
     * @todo See if not caching has an impact on performance.
     *
     * @returns {number}
     */
    get containerWidth() {
      _screenWidth = screen.width;

      // Evaluated on first call, then will always return a cached version of
      // `screen.width` after.
      return function() {
        return _screenWidth;
      }();
    }
  };

  FontSizeUtils.init();

  exports.FontSizeUtils = FontSizeUtils;
}(this));
