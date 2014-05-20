
window.GaiaButtons = (function(win) {
  'use strict';

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaButtonsBaseurl ||
    '/shared/elements/gaia_buttons/';

  proto.createdCallback = function() {
    this._addStyle();
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
  proto._addStyle = function() {
    var style = document.createElement('style');
    style.setAttribute('scoped', true);
    var url = baseurl + 'style.css';
    style.innerHTML = '@import url(' + url + ')';
    this.appendChild(style);
  };

  // Register and return the constructor
  return document.registerElement('gaia-buttons', { prototype: proto });
})(window);
