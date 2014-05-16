window.GaiaSwitch = (function(win) {
  'use strict';

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaSwitchBaseurl ||
    '/shared/elements/gaia-switch/';

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();
    this._template = template.content.cloneNode(true);
    this._input = this._template.querySelector('input[type="checkbox"]');
    this._styleHack();

    var checked = this.dataset.checked;
    if (checked) {
      this._input.checked = true;
    }

    var label = this._template.getElementById('switch-label');
    label.addEventListener('click', this.toggleCheck.bind(this));

    shadow.appendChild(this._template);
  };

  proto.attributeChangedCallback = function(attr, oldVal, newVal) {
    if (attr === 'data-checked') {
      this._input.checked = newVal === 'true';
    }
  };

  proto.toggleCheck = function(e) {
    var element = this._input;
    this.dataset.checked = element.checked ? 'true' : 'false';
  };

  /**
   * We clone the scoped stylesheet and append
   * it outside the shadow-root so that we can
   * style projected <content> without the need
   * of the :content selector.
   *
   * When the :content selector lands, we won't
   * need this hack anymore and can style projected
   * <content> from stylesheets within the shadow root.
   * (bug 992249)
   *
   * @private
   */
  proto._styleHack = function() {
    var style = this._template.querySelector('style');
    this.appendChild(style.cloneNode(true));
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
  var stylesheet = baseurl + 'style.css';
  var template = document.createElement('template');
  template.innerHTML = '<style scoped>' +
    '@import url(' + stylesheet + ');</style>' +
    '<label id="switch-label" class="pack-switch">' +
      '<input type="checkbox">' +
      '<span><content select="label"></content></span>' +
    '</label>';

  // Register and return the constructor
  return document.registerElement('gaia-switch', { prototype: proto });
})(window);
