window.GaiaTextinput = (function(win) {
  'use strict';

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaTextinputBaseurl ||
    '/shared/elements/gaia-textinput/';

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();
    this._template = template.content.cloneNode(true);
    this._input = this._template.getElementById('input');

    if (this.getAttribute('value') !== null) {
      this._input.value = this.getAttribute('value');
    }

    if (this.getAttribute('placeholder') !== null) {
      this._input.placeholder = this.getAttribute('placeholder');
    }

    if (this.getAttribute('required')) {
      this._input.required = '';
    }

    if (this.getAttribute('reset') !== null) {
      var reset = document.createElement('button');
      reset.id = 'input-reset';
      reset.type = 'reset';
      reset.textContent = 'Clear';
      this._template.getElementById('gaia-text-input').appendChild(reset);

      // Don't take focus from the input field
      reset.addEventListener('mousedown', function(e) {
        e.preventDefault();
      });

      reset.addEventListener('click', this.resetInput.bind(this));
    }

    shadow.appendChild(this._template);
  };

  proto.resetInput = function(e) {
    e.target.previousElementSibling.value = '';
    e.preventDefault();
  };

  // HACK: Create a <template> in memory at runtime.
  // When the custom-element is created we clone
  // this template and inject into the shadow-root.
  // Prior to this we would have had to copy/paste
  // the template into the <head> of every app that
  // wanted to use <gaia-textinput>, this would make
  // markup changes complicated, and could lead to
  // things getting out of sync. This is a short-term
  // hack until we can import entire custom-elements
  // using HTML Imports (bug 877072).
  var stylesheet = baseurl + 'style.css';
  var template = document.createElement('template');
  template.innerHTML = '<style scoped>' +
    '@import url(' + stylesheet + ');</style>' +
    '<p id="gaia-text-input">' +
      '<input id="input" type="text">' +
    '</p>';

  // Register and return the constructor
  return document.registerElement('gaia-textinput', { prototype: proto });
})(window);
