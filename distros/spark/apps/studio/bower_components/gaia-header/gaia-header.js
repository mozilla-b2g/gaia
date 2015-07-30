;(function(define){'use strict';define(function(require,exports,module){

/**
 * Dependencies
 */

var component = require('gaia-component');
var fontFit = require('font-fit');

/**
 * Load 'gaia-icons' font-family
 */
require('gaia-icons');

/**
 * Simple logger (toggle 0)
 *
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console) : function() {};

/**
 * Supported action types
 *
 * @type {Object}
 */
const KNOWN_ACTIONS = {
  menu: 'menu',
  back: 'back',
  close: 'close'
};

/**
 * The default title font.
 *
 * @type {String}
 */
const TITLE_FONT = 'italic 300 24px FiraSans';

/**
 * The padding (start/end) used if
 * the title needs padding away from
 * the edge of the header.
 *
 * @type {Number}
 */
const TITLE_PADDING = 10;

/**
 * This is the minimum font size that we can take
 * when the header title is centered in the window.
 */
const MINIMUM_FONT_SIZE_CENTERED = 20;

/**
 * This is the minimum font size that we can take
 * when the header title is not centered in the window.
 */
const MINIMUM_FONT_SIZE_UNCENTERED = 18;

/**
 * This is the maximum font size that we can use for
 * the heade title.
 */
const MAXIMUM_FONT_SIZE = 23;

/**
 * Register the element.
 *
 * @return {Element} constructor
 */
module.exports = component.register('gaia-header', {

  /**
   * Called when the element is first created.
   *
   * Here we create the shadow-root and
   * inject our template into it.
   *
   * @private
   */
  created: function() {
    debug('created');
    this.setupShadowRoot();

    // Elements
    this.els = {
      actionButton: this.shadowRoot.querySelector('.action-button'),
      buttons: this.querySelectorAll('button, a'),
      titles: this.querySelectorAll('h1')
    };

    // Events
    this.els.actionButton.addEventListener('click', e => this.onActionButtonClick(e));
    this.observer = new MutationObserver(this.onMutation.bind(this));

    // Properties
    this.titleEnd = this.getAttribute('title-end');
    this.titleStart = this.getAttribute('title-start');
    this.noFontFit = this.getAttribute('no-font-fit');
    this.notFlush = this.hasAttribute('not-flush');
    this.action = this.getAttribute('action');

    this.unresolved = {};
    this.pending = {};
    this._resizeThrottlingId = null;

    // bind the listener in advance so that we can remove it when detaching.
    this.onResize = this.onResize.bind(this);
  },

  /**
   * Called when the element is
   * attached to the DOM.
   *
   * Run fontFit when we have DOM
   * context and start listening
   * for DOM mutations.
   *
   * We run font-fit on next tick to
   * avoid reading from the DOM when
   * it may not be loaded yet.
   *
   * @private
   */
  attached: function() {
    debug('attached');
    this.runFontFitSoon();
    this.observerStart();
    window.addEventListener('resize', this.onResize);
  },

  /**
   * Called when the element is
   * detached from the DOM.
   *
   * @private
   */
  detached: function() {
    debug('detached');
    window.removeEventListener('resize', this.onResize);
    this.observerStop();
    this.clearPending();
  },

  /**
   * Clears pending `.nextTick()`s and requestAnimationFrame's.
   *
   * @private
   */
  clearPending: function() {
    for (var key in this.pending) {
      this.pending[key].clear();
      delete this.pending[key];
    }

    window.cancelAnimationFrame(this._resizeThrottlingId);
    this._resizeThrottlingId = null;
  },

  /**
   * Run the font-fit logic and
   * center the title.
   *
   * The styles are calculated synchronously,
   * but then set asynchronously. This means
   * this function can be hammered in one turn,
   * and the title styles will only be written
   * once, with the latest styles.
   *
   * @return {Promise}
   * @public
   */
  runFontFit: function() {
    debug('run font-fit');

    // Nothing is run if `no-font-fit` attribute
    // is present. We don't `reject()` as this
    // isn't technically an error state.
    if (this.noFontFit) { return Promise.resolve(); }

    var titles = this.els.titles;
    var space = this.getTitleSpace();
    var styles = [].map.call(titles, el => this.getTitleStyle(el, space));

    // Update the title styles using the latest
    // styles. This function can be called many
    // times but will only run once in each tick.
    return this.setTitleStylesSoon(styles);
  },

  /**
   * Microtask debounced `runFontFit`
   *
   * @private
   */
  runFontFitSoon: function() {
    debug('run font-fit soon');
    if (this.pending.runFontFitSoon) { return; }
    this.pending.runFontFitSoon = this.nextTick(() => {
      delete this.pending.runFontFitSoon;
      this.runFontFit();
    });
  },

  /**
   * Get the style properties required
   * to fit and position the title text.
   *
   * @param  {HTMLH1Element} el
   * @param  {Number} space
   * @return {Object} {fontSize, marginStart, overflowing, id}
   * @private
   */
  getTitleStyle: function(el, space) {
    debug('get el style', el, space);
    var text = el.textContent;
    var styleId = space.start + text + space.end + '#' + space.value;

    // Bail when there's no text (or just whitespace)
    if (!text || !text.trim()) { return debug('exit: no text'); }

    // If neither the text or the titleSpace
    // changed, there's no reason to continue.
    if (getStyleId(el) === styleId) { return debug('exit: no change'); }

    var marginStart = this.getTitleMarginStart();
    var textSpace = space.value - Math.abs(marginStart);
    var fontFitResult = this.fontFit(text, textSpace, {
      min: MINIMUM_FONT_SIZE_CENTERED
    });

    var overflowing = fontFitResult.overflowing;
    var padding = { start: 0, end: 0 };

    // If the text is overflowing in the
    // centered title, we remove centering
    // to free up space, rerun fontFit to
    // get a fontSize which fits this space.
    if (overflowing) {
      debug('title overflowing');
      padding.start = !space.start ? TITLE_PADDING : 0;
      padding.end = !space.end ? TITLE_PADDING : 0;
      textSpace = space.value - padding.start - padding.end;
      fontFitResult = this.fontFit(text, textSpace);
      marginStart = 0;
    }

    return {
      id: styleId,
      fontSize: fontFitResult.fontSize,
      marginStart: marginStart,
      overflowing: overflowing,
      padding: padding
    };
  },

  /**
   * Set's styles on the title elements.
   *
   * If there is already an unresolved Promise
   * we return it instead of scheduling another.
   * This means that the function can be hammered
   * in the same sync-turn and will only run
   * once (like a debounce).
   *
   * @param {Array} styles
   * @return {Promise}
   */
  setTitleStylesSoon: function(styles) {
    debug('set title styles soon', styles);
    var key = 'setStyleTitlesSoon';

     // Always update styles
    this._titleStyles = styles;

    // Return existing unresolved
    // promise, or make a new one
    return this.unresolved[key] = this.unresolved[key] || new Promise((resolve) => {
      this.pending[key] = this.nextTick(() => {
        var styles = this._titleStyles;
        var els = this.els.titles;

        [].forEach.call(els, (el, i) => {
          if (!styles[i]) { return debug('exit'); }
          this.setTitleStyle(el, styles[i]);
        });

        // Clean up
        delete this._titleStyles;
        delete this.unresolved[key];
        delete this.pending[key];

        resolve();
      });
    });
  },

  /**
   * Fit text and center a title between
   * the buttons before and after.
   *
   * Right now, because gaia-header is not
   * fully rtl-compatible (due to Gaia),
   * we're using `marginLeft` etc. These
   * will be changed to `marginStart` etc
   * when we become fully RTL.
   *
   * @param  {HTMLH1Element} title
   * @param  {Number} space
   * @private
   */
  setTitleStyle: function(el, style) {
    debug('set title style', style);
    this.observerStop();
    el.style.marginLeft = style.marginStart + 'px';
    el.style.paddingLeft = style.padding.start + 'px';
    el.style.paddingRight = style.padding.end + 'px';
    el.style.fontSize = style.fontSize + 'px';
    setStyleId(el, style.id);
    this.observerStart();
  },

  /**
   * Run font-fit on a title with
   * the given amount of content space.

   * @param {String} text
   * @param {Number} space
   * @param {Object} optional {[min]}
   * @return {Object} {fontSize, textWidth}
   * @private
   */
  fontFit: function(text, space, opts = {}) {
    debug('font fit:', text, space, opts);

    var fontFitArgs = {
      font: TITLE_FONT,
      min: opts.min || MINIMUM_FONT_SIZE_UNCENTERED,
      max: MAXIMUM_FONT_SIZE,
      text: text,
      space: space
    };

    return fontFit(fontFitArgs);
  },

  /**
   * Start the observer listening
   * for DOM mutations.
   * Start the listener for 'resize' event.
   *
   * @private
   */
  observerStart: function() {
    if (this.observing) { return; }

    this.observer.observe(this, {
      childList: true,
      attributes: true,
      subtree: true
    });

    this.observing = true;
    debug('observer started');
  },

  /**
   * Stop the observer listening
   * for DOM mutations.
   *
   * @private
   */
  observerStop: function() {
    if (!this.observing) { return; }
    this.observer.disconnect();

    this.observing = false;
    debug('observer stopped');
  },

  /**
   * Handle 'resize' events.
   * @param {Event} The DOM Event that's being handled.
   *
   * @private
   */
  onResize: function(e) {
    debug('onResize', this._resizeThrottlingId);

    if (this._resizeThrottlingId !== null) {
      return;
    }

    /* Resize events can arrive at a very high rate, so we're trying to
     * reasonably throttle these events. */
    this._resizeThrottlingId = window.requestAnimationFrame(() => {
      this._resizeThrottlingId = null;
      this.runFontFitSoon();
    });
  },

  /**
   * When the components DOM changes we
   * call `.runFontFit()` (sync).
   *
   * If the `textContent` is changed in a
   * mutation observer just after attaching,
   * we end up running twice.
   *
   * If there is a pending async .runFontFit(),
   * then we don't want to run it now.
   *
   * @param  {Array} mutations
   * @private
   */
  onMutation: function(mutations) {
    debug('on mutation', mutations);
    if (!this.pending.runFontFitSoon) { this.runFontFit(); }
  },

  /**
   * Get the title width.
   *
   * Returns the space available for <h1>.
   *
   * @return {Number}
   * @private
   */
  getTitleSpace: function() {
    var start = this.titleStart;
    var end = this.titleEnd;
    var space = this.getWidth() - start - end;
    var result = {
      value: space,
      start: start,
      end: end
    };

    debug('get title space', result);
    return result;
  },

  /**
   * Get the width of the component.
   *
   * For performance reasons we make the
   * assumption that the width is the same
   * as `window.innerWidth` unless the
   * `not-flush` attribute is used.
   *
   * @return {Number}
   * @private
   */
  getWidth: function() {
    var value = this.notFlush
      ? this.clientWidth
      : window.innerWidth;

    debug('get width', value);
    return value;
  },

  /**
   * Triggers the 'action' button
   * (used in Gaia integration testing).
   *
   * @public
   */
  triggerAction: function() {
    if (this.action) { this.els.actionButton.click(); }
  },

  /**
   * Handle clicks on the action button.
   *
   * Fired pending to allow the 'click' event
   * to finish its event path before
   * dispatching the 'action' event.
   *
   * @param  {Event} e
   * @private
   */
  onActionButtonClick: function() {
    debug('action button click');
    var config = { detail: { type: this.action } };
    var e = new CustomEvent('action', config);
    setTimeout(() => this.dispatchEvent(e));
  },

  /**
   * Get the margin-start value required
   * to center the title between
   * surrounding buttons.
   *
   * @param  {Object} title
   * @return {Object}
   * @private
   */
  getTitleMarginStart: function() {
    var start = this.titleStart;
    var end = this.titleEnd;
    var marginStart = end - start;
    debug('get title margin start', marginStart);
    return marginStart;
  },

  /**
   * Get all the buttons (<a> & <button>)
   * before the first <h1>.
   *
   * @return {Array}
   * @private
   */
  getButtonsBeforeTitle: function() {
    var children = this.children;
    var l = children.length;
    var els = [];

    for (var i = 0; i < l; i++) {
      var el = children[i];
      if (el.tagName === 'H1') { break; }
      if (!contributesToLayout(el)) { continue; }

      els.push(el);
    }

    // Don't forget the action button
    if (this.action) { els.push(this.els.actionButton); }
    return els;
  },

  /**
   * Get all the buttons (<a> & <button>)
   * after the last <h1>.
   *
   * @return {Array}
   * @private
   */
  getButtonsAfterTitle: function() {
    var children = this.children;
    var els = [];

    for (var i = children.length - 1; i >= 0; i--) {
      var el = children[i];
      if (el.tagName === 'H1') { break; }
      if (!contributesToLayout(el)) { continue; }

      els.push(el);
    }

    return els;
  },

  /**
   * Get the sum of the width of
   * the given buttons.
   *
   * This function is optimized to avoid reading
   * `element.clientWidth` when possible.
   *
   * If a button is `display: none` it will
   * have a `.clientWidth` of 0, therefore won't
   * contribute anything to the overall sum.
   *
   * @param  {Array} buttons
   * @return {Number}
   * @private
   */
  sumButtonWidths: function(buttons) {
    var defaultWidth = 50;
    var sum = buttons.reduce((prev, button) => {
      var isStandardButton = button === this.els.actionButton;
      var width = isStandardButton ? defaultWidth : button.clientWidth;
      return prev + width;
    }, 0);

    debug('sum button widths', buttons, sum);
    return sum;
  },

  /**
   * Known attribute property
   * descriptors.
   *
   * These setters get called when matching
   * attributes change on the element.
   *
   * @type {Object}
   */
  attrs: {
    action: {
      get: function() { return this._action; },
      set: function(value) {
        var action = KNOWN_ACTIONS[value];
        if (action === this._action) { return; }
        this.setAttr('action', action);
        this._action = action;
      }
    },

    titleStart: {
      get: function() {
        debug('get title-start');
        if ('_titleStart' in this) { return this._titleStart; }
        var buttons = this.getButtonsBeforeTitle();
        var value = this.sumButtonWidths(buttons);
        debug('get title-start', buttons, value);
        return value;
      },

      set: function(value) {
        debug('set title-start', value);
        value = parseInt(value, 10);
        if (value === this._titleStart || isNaN(value)) { return; }
        this.setAttr('title-start', value);
        this._titleStart = value;
        debug('set');
      }
    },

    titleEnd: {
      get: function() {
        debug('get title-end');
        if ('_titleEnd' in this) { return this._titleEnd; }
        var buttons = this.getButtonsAfterTitle();
        return this.sumButtonWidths(buttons);
      },

      set: function(value) {
        debug('set title-end', value);
        value = parseInt(value, 10);
        if (value === this._titleEnd || isNaN(value)) { return; }
        this.setAttr('title-end', value);
        this._titleEnd = value;
      }
    },

    noFontFit: {
      get: function() { return this._noFontFit || false; },
      set: function(value) {
        debug('set no-font-fit', value);
        value = !!(value || value === '');

        if (value === this.noFontFit) { return; }
        this._noFontFit = value;

        if (value) { this.setAttr('no-font-fit', ''); }
        else { this.removeAttr('no-font-fit'); }
      }
    }
  },

  template: `<div class="inner">
    <button class="action-button">
      <content select=".l10n-action"></content>
    </button>
    <content></content>
  </div>

  <style>

  :host {
    display: block;
    -moz-user-select: none;

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
    -moz-user-select: none;

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
    position: relative;

    display: none; /* 1 */
    width: 50px;
    font-size: 30px;
    margin: 0;
    padding: 0;
    border: 0;
    outline: 0;

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
   * [action=back]
   * [action=menu]
   * [action=close]
   *
   * 1. For icon vertical-alignment
   */

  [action=back] .action-button,
  [action=menu] .action-button,
  [action=close] .action-button {
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

  .action-button:before {
    font-family: 'gaia-icons';
    font-style: normal;
    text-rendering: optimizeLegibility;
    font-weight: 500;
  }

  [action=close] .action-button:before { content: 'close' }
  [action=back] .action-button:before { content: 'back' }
  [action=menu] .action-button:before { content: 'menu' }

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
    padding: 0;
    overflow: hidden;

    white-space: nowrap;
    text-overflow: ellipsis;
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
   * [dir=rtl]
   *
   * When the document is in RTL mode we still
   * want the <h1> text to be reversed to that
   * strings like '1 selected' become 'selected 1'.
   *
   * When we're happy for gaia-header to be fully
   * RTL responsive we won't need this rule anymore,
   * but this depends on all Gaia apps being ready.
   */

  :host-context([dir=rtl]) ::content h1 {
    direction: rtl;
  }

  /** Buttons
   ---------------------------------------------------------*/

  ::content a,
  ::content button {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    width: auto;
    height: auto;
    min-width: 50px;
    margin: 0;
    padding: 0 10px;
    outline: 0;
    border: 0;

    font-size: 14px;
    line-height: 1;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    text-align: center;
    background: none;
    border-radius: 0;
    font-style: italic;
    cursor: pointer;
    transition: opacity 200ms 280ms;
    color: var(--gaia-header-button-color);
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

  /**
   * If users want their action button
   * to be in the component's light-dom
   * they can add an .action class
   * to make it look like the
   * shadow action button.
   */

  ::content .action {
    color:
      var(--header-action-button-color,
      var(--header-icon-color,
      var(--gaia-header-button-color)));
  }

  /**
   * [data-icon]:empty
   *
   * Icon buttons with no textContent,
   * should always be 50px.
   *
   * This is to prevent buttons being
   * larger than they should be before
   * icon-font has loaded.
   */

  ::content [data-icon]:empty {
    width: 50px;
  }

  </style>`,

  // Test hook
  nextTick: nextTick
});

/**
 * Utils
 */

/**
 * Determines whether passed element
 * contributes to the layout in gaia-header.
 *
 * @param  {Element}  el
 * @return {Boolean}
 */
function contributesToLayout(el) { return el.tagName !== 'STYLE'; }

/**
 * Set a 'style id' property that
 * can be retrieved later.
 *
 * Used to determine whether a title's
 * `style` needs to be updated or not.
 *
 * @param {Element} el
 * @param {String} id
 */
function setStyleId(el, id) { el._styleId = id; }

/**
 * Get a 'style id' property.
 *
 * Used to determine whether a title's
 * `style` needs to be updated or not.
 *
 * @param {Element} el
 * @param {String} id
 */
function getStyleId(el) { return el._styleId; }

/**
 * Calls callback at next 'microtask'.
 * Returns an object that has
 * a `.clear()` method.
 *
 * @param  {Function} fn
 * @return {Object} { clear }
 */
function nextTick(fn) {
  var cleared;
  Promise.resolve().then(() => { if (!cleared) { fn(); } });
  return { clear: function() { cleared = true; }};
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));
