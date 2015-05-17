'use strict';

define(function() {

/**
 * HTML Marquee in JavaScript/CSS
 * - slow scrolling of text depending on `behavior' and `timingFunction'
 *   parameters provided to the `activate' method
 * - start aligned left with delay (see marquee.css for details on classes)
 *
 * Creates a HTML element of the form:
 *  <headerNode>
 *    <div id="marquee-h-wrapper">
 *      <div id="marquee-h-text" class="marquee">
 *          Marqueed text content
 *      </div>
 *    </div>
 *  </headerNode>
 * where 'headerNode' is the node that will containt the text that needs a
 * marquee (i.e. <header>, <h1>, etc.).
 */
var Marquee = {
  /**
   * List of supported timing functions
   */
  timingFunction: ['linear', 'ease'],

  /**
   * Setup the marquee DOM structure
   * @param {string} text the string of text that requires a marquee.
   * @param {element} headerNode the DOM element parent of the text.
   */
  setup: function marquee_setup(text, headerNode) {
    this._headerNode = headerNode;

    this._headerWrapper = document.getElementById('marquee-h-wrapper');
    if (!this._headerWrapper) {
      this._headerWrapper = document.createElement('div');
      this._headerWrapper.id = 'marquee-h-wrapper';
      this._headerNode.appendChild(this._headerWrapper);
    }

    var headerText = document.getElementById('marquee-h-text');
    if (!headerText) {
      headerText = document.createElement('div');
      headerText.id = 'marquee-h-text';
      this._headerWrapper.dir = 'auto';
      this._headerWrapper.appendChild(headerText);
    }

    headerText.textContent = text;
  },

  /**
   * Activate the marquee
   * NOTE: This should only be called once the DOM structure is updated with
   *       Marquee.setup() and all created DOM elements are appended to the
   *       document, otherwise the text overflow check will not work properly.
   * @param {string} behavior the way the marquee behaves: 'scroll' (default)
   *                           for continuous right-to-left (rtl) scrolling or
   *                           'alternate' for alternating right-to-left and
   *                           left-to-right scrolling.
   * @param {string} timingFun the animation timing function: 'linear' (default)
   *                           for linear animation speed, or 'ease' for slow
   *                           start of the animation.
   */
  activate: function marquee_activate(behavior, timingFun) {
    if (!this._headerNode || !this._headerWrapper) {
      return;
    }

    // Set defaults for arguments
    var mode = behavior || 'scroll';
    var tf = timingFun || null;
    var timing = (Marquee.timingFunction.indexOf(tf) >= 0) ? tf : 'linear';
    var marqueeCssClass = 'marquee';

    var titleText = document.getElementById('marquee-h-text');
    var cssClass, width;

    // Regardless of text character alignment, still want shorter text that does
    // not span the whole element area to be aligned to match the UI. The
    // dir="auto" on titleText will still preserve the correct order of the
    // characters in the text.
    titleText.classList.remove('ltr-align');
    titleText.classList.remove('rtl-align');
    titleText.classList.add((document.dir === 'rtl' ? 'rtl' : 'ltr') +
                           '-align');

    // Check if the title text overflows, and if so, add the marquee class
    // NOTE: this can only be checked it the DOM structure is updated
    //       through Marquee.setup()
    if (this._headerWrapper.clientWidth < this._headerWrapper.scrollWidth) {
      // Track the CSS classes added to the text
      this._marqueeCssClassList = [];
      switch (mode) {
        case 'scroll':
          cssClass = marqueeCssClass + '-rtl';
          // Set the width of the marquee to match the text contents length
          width = this._headerWrapper.scrollWidth;
          titleText.style.width = width + 'px';
          // Start the marquee animation (aligned left with delay)
          titleText.classList.add(cssClass + '-start-' + timing);
          this._marqueeCssClassList.push(cssClass + '-start-' + timing);

          var self = this;
          titleText.addEventListener('animationend', function() {
            titleText.classList.remove(cssClass + '-start-' + timing);
            this._marqueeCssClassList.pop();
            // Correctly calculate the width of the marquee
            var visibleWidth = self._headerWrapper.clientWidth + 'px';
            titleText.style.transform = 'translateX(' + visibleWidth + ')';
            // Enable the continuous marquee
            titleText.classList.add(cssClass);
            this._marqueeCssClassList.push(cssClass);
          });
          break;
        case 'alternate':
          // If rtl text, then need to switch the direction of the animation.
          var dirSuffix = '';
          if (window.getComputedStyle(titleText).direction === 'rtl') {
            dirSuffix = '-rtl';
          }
          timing += dirSuffix;

          cssClass = marqueeCssClass + '-alt-';
          // Set the width of the marquee to match the text contents length
          width =
              this._headerWrapper.scrollWidth - this._headerWrapper.clientWidth;
          titleText.style.width = width + 'px';

          // Start the marquee animation (aligned left with delay)
          titleText.classList.add(cssClass + timing);
          break;
      }
    } else {
      if (!this._marqueeCssClassList) {
        return;
      }
      // Remove the active marquee CSS classes
      for (var titleCssClass in this._marqueeCssClassList) {
        titleText.classList.remove(titleCssClass);
      }

      titleText.style.transform = '';
    }
  }
};

return Marquee;

});
