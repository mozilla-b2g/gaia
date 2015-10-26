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

    /**
     * Entry point for module.
     * @memberof ViewSource.prototype
     */
    _start: function() {
      this._hide = this._hide.bind(this);
      this._resize = this._resize.bind(this);
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
      var url = 'view-source:' + Service.query('getTopMostWindow').config.url;
      var config = {
        url: url,
        title: url,
        oop: true
      };
      var frame = new BrowserFrame(config);

      var container = document.createElement('div');
      container.classList.add('view-source');
      container.dataset.zIndexLevel = 'view-source';
      this._viewer = container;

      var header = document.createElement('gaia-header');
      header.innerHTML = `
        <h1 data-l10n-id="viewSourceHeader"></h1>
        <button disabled></button>
      `;
      header.setAttribute('action', 'close');
      header.addEventListener('action', this._hide);
      container.appendChild(header);

      var viewsource = frame.element;
      container.appendChild(viewsource);

      var screen = document.querySelector('#screen');
      screen.appendChild(container);

      this._resize();

      window.addEventListener('home', this._hide);
      window.addEventListener('holdhome', this._hide);
      window.addEventListener('sleep', this._hide);
      window.addEventListener('lockscreen-appopened', this._hide);
      window.addEventListener('system-resize', this._resize);
    },

    /**
     * Unlink viewer from DOM and delete node.
     * @memberof ViewSource.prototype
     */
    _hide: function() {
      var viewsource = this._viewer;
      viewsource.parentNode.removeChild(viewsource);
      this._viewer = null;

      var header = viewsource.querySelector('gaia-header');
      header.removeEventListener('action', this._hide);
      window.removeEventListener('home', this._hide);
      window.removeEventListener('holdhome', this._hide);
      window.removeEventListener('sleep', this._hide);
      window.removeEventListener('lockscreen-appopened', this._hide);
      window.removeEventListener('system-resize', this._resize);
    },

    /**
     * Size the viewer correctly according to the space that it has available.
     * @memberof ViewSource.prototype
     */
    _resize: function(evt) {
      var container = this._viewer;
      var frame = container.querySelector('iframe');

      var windowWidth = Service.query('LayoutManager.width');
      var windowHeight = Service.query('getHeightFor', frame);

      container.style.width = windowWidth + 'px';
      container.style.height =
        'calc(' + windowHeight + 'px - var(--statusbar-height))';

      frame.style.height =
        'calc(' + windowHeight + 'px - var(--statusbar-height) - 50px)';
    }
  });
}(window));
