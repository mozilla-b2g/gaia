;(function(umd){umd(function(require,exports,module){
'use strict';

/**
 * Dependencies
 */

var component = require('gaia-component');

/**
 * Exports
 */

module.exports = component.register('gaia-tabs', {

  /**
   * Runs on creation
   *
   * The initial value of the `select`
   * attribute is used to select a tab.
   *
   * @private
   */
  created: function() {
    this.setupShadowRoot();

    this.els = {
      marker: this.shadowRoot.querySelector('.marker')
    };

    this.makeAccessible();
    this.addEventListener('click', this.onClick);
    this.select(this.getAttribute('selected'));
    this.setupMarker();
  },

  getLength: function() {
    var style = this.querySelector('style') ? 1 : 0;
    return this.children.length - style;
  },

  setupMarker: function() {
    this.els.marker.style.width = (1 / this.getLength() * 100) + '%';
  },

  setMarkerPosition: function(index) {
    index = document.dir === 'rtl' ? this.getLength() - index - 1 : index;
    this.els.marker.style.transform = 'translateX(' + index * 100 + '%)';
  },

  /**
   * Add necessary attributes to
   * improve accessibility.
   *
   * @private
   */
  makeAccessible: function() {
    this.setAttribute('role', 'tablist');
    for (var el = this.firstElementChild; el; el = el.nextElementSibling) {
      el.setAttribute('role', 'tab');
      el.tabIndex = 0;
    }
  },

  /**
   * Walks up the DOM from the `event.target`
   * until it finds an immediate child of the
   * element, then selects the index
   * of that element.
   *
   * @param  {Event} e
   * @private
   */
  onClick: function(e) {
    var el = e.target;
    var i;
    while (el) {
      i = [].indexOf.call(this.children, el);
      if (i > -1) { return this.select(i); }
      el = el.parentNode;
    }
  },

  /**
   * Select a tab by index.
   *
   * @param  {Number} index
   * @public
   */
  select: function(index) {
    if (index === null) { return; }

    // Make sure it's a number
    index = Number(index);

    var el = this.children[index];
    this.deselect(this.selected);
    this.setMarkerPosition(index);
    this.selectedChild = el;
    this.selected = index;

    el.setAttribute('aria-selected', 'true');
    el.classList.add('selected');

    var e = new CustomEvent('change');
    setTimeout(this.dispatchEvent.bind(this, e));
  },

  /**
   * Deselect a tab by index.
   * @param  {Number} index
   * @public
   */
  deselect: function(index) {
    var el = this.children[index];
    if (!el) { return; }
    el.removeAttribute('aria-selected');
    el.classList.remove('selected');
    if (this.current == el) {
      this.selectedChild = null;
      this.selected = null;
    }
  },

  template: `
    <div class="inner">
      <content></content>
      <div class="marker"></div>
    </div>
    <style>

    /** Host
     ---------------------------------------------------------*/

    :host {
      display: block;
      position: relative;
      border-top: 1px solid;
      overflow: hidden;

      border-color:
        var(--border-color,
        var(--background-plus))
    }

    /** Inner
     ---------------------------------------------------------*/

    .inner {
      display: flex;
      height: 45px;
    }

    /** Direct Children
     ---------------------------------------------------------*/

    ::content > * {
      position: relative;

      display: block;
      height: 100%;
      text-align: center;
      line-height: 45px;
      outline: 0;
      border: 0;
      flex: 1;

      font-size: 17px;
      font-style: italic;
      font-weight: lighter;
      background: none;
      cursor: pointer;
      color: inherit;
      transition:
        color,
        opacity 0.2s;
      transition-delay: 200ms;
    }

    /**
     * :active
     */

    ::content > :active {
      transition: none;
      opacity: 0.3;
    }

    /**
     * .selected
     */

    ::content > .selected {
      color: var(--highlight-color, #000);
      transition: none;
    }

    /**
     * [disabled]
     */

    ::content > [disabled] {
      transition: none;
      opacity: 0.3;
      pointer-events: none;
    }

    /** Style
     ---------------------------------------------------------*/

    ::content style {
      display: none !important;
    }

    /** Marker
     ---------------------------------------------------------*/

    .marker {
      position: absolute;
      bottom: 0px;
      left: 0px;
      height: 3px;
      background: var(--highlight-color, #000);
      transition: transform 0.2s;
      transition-timing-function: cubic-bezier(0.175, 0.885, 0.320, 1.275);
    }

    </style>
  `
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-tabs',this));
