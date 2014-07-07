window.GaiaDrawer = (function(win) {
  /*global ComponentUtils*/
  /*jshint maxlen:false*/
  'use strict';

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaDrawerBaseurl ||
    '/shared/elements/gaia_drawer/';

  /**
   * Runs when an instance of the
   * element is first created.
   *
   * When use this moment to create the
   * shadow-dom, inject our template
   * content, setup event listeners
   * and set the draw state to match
   * the initial `open` attribute.
   *
   * @private
   */
  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();
    this._template = template.content.cloneNode(true);

    // Fetch some els
    this._els = {};
    this._els.background = this._template.getElementById('background');
    this._els.content = this._template.getElementById('content');
    this._els.inner = this._template.getElementById('inner');

    this._attachEvents();
    this.toggle(this.hasAttribute('open'));

    // Put content in the shadow-dom
    shadow.appendChild(this._template);
    ComponentUtils.style.call(this, baseurl);
  };

  /**
   * Runs when any attribute changes
   * on the element.
   *
   * We only support the `open` attribute,
   * so we ignore all others. We then toggle,
   * opening the drawer for all values other
   * than `null` (which means the attribute
   * was removed).
   *
   * @param  {String} attr
   * @param  {String|null} oldVal
   * @param  {String|null} newVal
   * @private
   */
  proto.attributeChangedCallback = function(attr, oldVal, newVal) {
    if (attr !== 'open') { return; }
    this.toggle(newVal !== null);
  };

  proto._attachEvents = function() {
    this._els.background.addEventListener('click', this.close.bind(this));
    this._els.content.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  };

  /**
   * Toggle the drawer open/closed.
   *
   * If a value is passed, we ignore the
   * current `open` value and just derive
   * the state from the value given (similar
   * to how `classList.toggle` works).
   *
   * @param  {Boolean} value
   * @public
   */
  proto.toggle = function(value) {
    value = arguments.length ? value : !this.hasAttribute('open');
    if (value) { this.open(); }
    else { this.close(); }
  };

  /**
   * Open the drawer.
   *
   * We have to also duplicate the
   * attribute on the `.inner` element
   * inside the shadow-root as we are
   * currently missing the `:host`
   * selector from the platform.
   *
   * @public
   */
  proto.open = function() {
    this.setAttribute('open', '');
    this._els.inner.setAttribute('open', '');
  };

  /**
   * Close the drawer.
   *
   * We have to also duplicate the
   * attribute on the `.inner` element
   * inside the shadow-root as we are
   * currently missing the `:host`
   * selector from the platform.
   *
   * @public
   */
  proto.close = function() {
    this.removeAttribute('open');
    this._els.inner.removeAttribute('open');
  };

  // HACK: Create a <template> in memory at runtime.
  // When the custom-element is created we clone
  // this template and inject into the shadow-root.
  // Prior to this we would have had to copy/paste
  // the template into the <head> of every app that
  // wanted to use <gaia-switch>, this would make
  // markup changes complicated, and could lead to
  // things getting out of sync. This is a short-term
  // hack until we can import entire custom-elements
  // using HTML Imports (bug 877072).
  // var stylesheet = baseurl + 'style.css';
  var template = document.createElement('template');
  template.innerHTML = '<div class="inner" id="inner">' +
      '<div class="background" id="background"></div>' +
      '<div class="content" id="content"><content></content></div>' +
    '</div>';

  // Register and return the constructor
  return document.registerElement('gaia-drawer', { prototype: proto });
})(window);
