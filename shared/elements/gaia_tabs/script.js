window.GaiaTabs = (function(win) {
  /* global ComponentUtils */
  'use strict';

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);
  var indexOf = [].indexOf;

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaTabsBaseurl ||
    '/shared/elements/gaia_tabs/';

  /**
   * Runs when an instance of `GaiaTabs`
   * is first created.
   *
   * The intial value of the `select` attribute
   * is used to select a tab.
   *
   * @private
   */
  proto.createdCallback = function() {
    ComponentUtils.style.call(this, baseurl);
    this.addEventListener('click', this.onClick);
    this.select(this.getAttribute('selected'));
  };

  /**
   * Updates the selected tab when
   * the `selected` attribute changes.
   *
   * @param  {String} attr
   * @param  {String|null} oldVal
   * @param  {String|null} newVal [description]
   * @private
   */
  proto.attributeChangedCallback = function(attr, oldVal, newVal) {
    if (attr === 'selected') { this.select(newVal); }
  };

  /**
   * Walks up the DOM from the `event.target`
   * until it finds an immendiate child
   * of the element, then selects the index
   * of that element.
   *
   * @param  {Event} e
   * @private
   */
  proto.onClick = function(e) {
    var el = e.target;
    var i;
    while (el) {
      i = indexOf.call(this.children, el);
      if (i > -1) { return this.select(i); }
      el = el.parentNode;
    }
  };

  /**
   * Select a tab by index.
   *
   * @param  {Number} index
   * @public
   */
  proto.select = function(index) {
    if (index === null) { return; }

    // Make sure it's a number
    index = Number(index);

    var el = this.children[index];
    this.deselect(this.selected);
    this.selectedChild = el;
    this.selected = index;

    el.setAttribute('aria-selected', 'true');
    el.classList.add('selected');

    var e = new CustomEvent('change');
    setTimeout(this.dispatchEvent.bind(this, e));
  };

  /**
   * Deselect a tab by index.
   * @param  {Number} index
   * @public
   */
  proto.deselect = function(index) {
    var el = this.children[index];
    if (!el) { return; }
    el.removeAttribute('aria-selected');
    el.classList.remove('selected');
    if (this.current == el) {
      this.selectedChild = null;
      this.selected = null;
    }
  };

  // Register and return the constructor
  return document.registerElement('gaia-tabs', { prototype: proto });
})(window);
