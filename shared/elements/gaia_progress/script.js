'use strict';
/* global ComponentUtils */

window.GaiaProgress = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaProgressBaseurl || '/shared/elements/gaia_progress/';

  proto.createdCallback = function() {
    //set Accessibility attributes on creation
    this.setAttribute('role', 'progressbar');
    this.setAttribute('aria-live', 'polite');

    var shadow = this.createShadowRoot();

    this._template = template.content.cloneNode(true);
    this._progress = this._template.getElementById('progress');

    shadow.appendChild(this._template);

    ComponentUtils.style.call(this, baseurl);

    if (this.hasAttribute('animated')) {
      this.start();
    }
  };

  /**
   * Starts the animation for the gaia-progress element.
   * This is a workaround for bug 962594.
   */
  proto.start = function() {
    this.setAttribute('animated', '');
    this._progress.classList.add('animated');
    this.setAttribute('data-l10n-id', 'gaia-progress-loading');
  };

  /**
   * Stops the animation for the gaia-progress element.
   * This is a workaround for bug 962594.
   */
  proto.stop = function() {
    this.removeAttribute('animated');
    this._progress.classList.remove('animated');
    this.setAttribute('data-l10n-id', 'gaia-progress-loaded');
  };

  var template = document.createElement('template');
  template.innerHTML = '<div id="progress"></div>';

  // Register and return the constructor
  return document.registerElement('gaia-progress', { prototype: proto });
})(window);
