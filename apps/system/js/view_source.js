/* global Service */
/* global BrowserFrame */
/* global BaseModule */

'use strict';

(function() {
  var ViewSource = function() {};
  ViewSource.SERVICES = [
    'viewsource'
  ];

  /**
   * ViewSource displays source of current page in an iframe as an overlay on
   * top of mozapps.
   * @class ViewSource
   * @requires Service
   * @requires BrowserFrame
   */
  BaseModule.create(ViewSource, {
    name: 'ViewSource',
    DEBUG: false,
    _viewer: null,

    _start: function() {
      this._handleTouchstart = this._handleTouchstart.bind(this);
    },

    /**
     * Toggle the source viewer, calling {@link ViewSource#_show} if hidden
     * or {@link ViewSource#_hide} if shown.
     * @memberof ViewSource.prototype
     */
    viewsource: function() {
      this._viewer ? this._hide() : this._show();
    },

    /**
     * Create and show viewer and point the iframe to the current page but using
     * the "view-source:" scheme.
     * @memberof ViewSource.prototype
     */
    _show: function() {
      var url = Service.query('getTopMostWindow').origin;
      if (!url) {
        // Assume the System UI is the visible app.
        url = window.location.toString();
      }
      url = 'view-source:' + url + '/index.html';

      var config = {
        url: url,
        title: url,
        oop: true
      };
      var frame = new BrowserFrame(config);
      var viewsource = frame.element;
      viewsource.classList.add('view-source');
      document.body.appendChild(viewsource);
      this._viewer = viewsource;

      window.addEventListener('touchstart', this._handleTouchstart);
    },

    /**
     * Unlink viewer from DOM and delete node.
     * @memberof ViewSource.prototype
     */
    _hide: function() {
      var viewsource = this._viewer;
      viewsource.parentNode.removeChild(viewsource);
      this._viewer = null;

      window.removeEventListener('touchstart', this._handleTouchstart);
    },

    /**
     * Closes the viewer when the user taps outside the viewer window.
     * @memberof ViewSource.prototype
     */
    _handleTouchstart: function(evt) {
      if (evt.target !== this._viewer) {
        this._hide();
      }
    }
  });
}(window));
