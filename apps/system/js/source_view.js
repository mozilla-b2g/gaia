/* global Service */

'use strict';

(function(exports) {
  var toggleEventHandler;
  var hideEventHandler;

  /**
   * SourceView displays source of current page in an iframe as an overlay on
   * top of mozapps.
   * @class SourceView
   * @requires Service
   */
  function SourceView() {
    var self = this;
    toggleEventHandler = function() {
      self.toggle();
    };
    hideEventHandler = function() {
      self.hide();
    };
  }

  SourceView.prototype = {
    /**
     * Return DOM element used to show source, if exists.
     * @memberof SourceView.prototype
     * @return {Element}
     */
    get viewer() {
      return document.getElementById('appViewsource');
    },

    /**
     * Return true if viewer exists and is visible, false otherwise.
     * @memberof SourceView.prototype
     * @return {Boolean}
     */
    get active() {
      return !this.viewer ? false : this.viewer.style.visibility === 'visible';
    }
  };

  /**
   * Initialize SourceView instance: listen for 'home+volume' and 'locked'
   * events to toggle SourceView instance when needed.
   * Return the instance itself for chaining.
   * @memberof SourceView.prototype
   * @return {Object}
   */
  SourceView.prototype.start = function sv_start() {
    window.addEventListener('home+volume', toggleEventHandler);
    window.addEventListener('locked', hideEventHandler);
    return this;
  };

  /**
   * Cleanup SourceView instance: Detach from 'home+volume' and 'locked'
   * events and remove {@link SourceView#viewer} if inserted to document.
   * @memberof SourceView.prototype
   */
  SourceView.prototype.stop = function sv_stop() {
    window.removeEventListener('home+volume', toggleEventHandler);
    window.removeEventListener('locked', hideEventHandler);
    if (this.viewer) {
      this.viewer.parentElement.removeChild(this.viewer);
    }
  };

  /**
   * Show {@link SourceView#viewer} and point the iframe to the current page
   * but using the "view-source:" scheme.
   * If shown for the first time, create and insert the viewer DOM element.
   * @memberof SourceView.prototype
   */
  SourceView.prototype.show = function sv_show() {
    var viewsource = this.viewer;
    if (!viewsource) {
      var style = `#appViewsource {
                    position: absolute;
                    top: calc(10%);
                    left: calc(10%);
                    width: calc(80% - 2 * 1.5rem);
                    height: calc(80% - 2 * 1.5rem);
                    visibility: hidden;
                    margin: 1.5rem;
                    background-color: white;
                    opacity: 0.92;
                    color: black;
                    z-index: 9999;
                  }`;
      document.styleSheets[0].insertRule(style, 0);

      viewsource = document.createElement('iframe');
      viewsource.id = 'appViewsource';
      document.body.appendChild(viewsource);
    }

    var url = Service.query('getTopMostWindow').origin;
    if (!url) {
      // Assume the home screen is the visible app.
      url = window.location.toString();
    }
    viewsource.src = 'view-source: ' + url;
    viewsource.style.visibility = 'visible';
  };

  /**
   * Hide {@link SourceView#viewer}, and point the iframe to about:blank.
   * @memberof SourceView.prototype
   */
  SourceView.prototype.hide = function sv_hide() {
    var viewsource = this.viewer;
    if (viewsource) {
      viewsource.style.visibility = 'hidden';
      viewsource.src = 'about:blank';
    }
  };

  /**
   * Toggle the source viewer, calling {@link SourceView#show} if hidden
   * ({@link SourceView#active} is false) or {@link SourceView#hide} if shown
   * ({@link SourceView#active} is true).
   * @memberof SourceView.prototype
   */
  SourceView.prototype.toggle = function sv_toggle() {
    if (Service.query('screenEnabled')) {
      this.active ? this.hide() : this.show();
    }
  };

  exports.SourceView = SourceView;
}(window));
