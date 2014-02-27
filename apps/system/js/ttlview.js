'use strict';
/* global SettingsListener */

(function(exports) {

  /**
   * TTLView measures and displays startup time as measured by "first paint".
   * The load time is displayed in ms next to the type of load event.
   * There are two possible types of load events, [c] and [w].
   * [c] cold load time, is measured when the app is not currently running.
   * [w] warm load time, is measured when the app is backgrounded then launched.
   * @class TTLView
   */
  function TTLView() {
    SettingsListener.observe('debug.ttl.enabled', false, function(value) {
      !!value ? this.show() : this.hide();
    }.bind(this));
  }

  TTLView.prototype = {

    /**
     * A reference to the element which contains the TTLView.
     * @memberof TTLView.prototype
     * @type {Element}
     */
    element: null,

    /**
     * Whether or not the TTLView is visible.
     * @memberof TTLView.prototype
     * @return {Boolean} The TTLView is visible.
     */
    get visible() {
      return this.element && this.element.style.display === 'block';
    },

    /**
     * Hides the overlay.
     * @memberof TTLView.prototype
     */
    hide: function() {
      if (this.element) {
        this.element.style.visibility = 'hidden';
      }

      window.removeEventListener('appwillopen', this);
      window.removeEventListener('apploadtime', this);
      window.removeEventListener('activitywillopen', this);
      window.removeEventListener('activityloadtime', this);
    },

    /**
     * Shows the overlay.
     * @memberof TTLView.prototype
     */
    show: function() {
      if (!this.element) {
        this.createElement();
      }
      this.element.style.visibility = 'visible';

      // this is fired when the app launching is initialized
      window.addEventListener('appwillopen', this);
      window.addEventListener('apploadtime', this);

      // this is to calculate the load time of inline activity
      window.addEventListener('activitywillopen', this);
      window.addEventListener('activityloadtime', this);
    },

    /**
     * Creates the element for the overlay.
     * @memberof TTLView.prototype
     */
    createElement: function() {
      var element = document.createElement('div');
      element.id = 'debug-ttl';
      element.innerHTML = '00000';
      element.dataset.zIndexLevel = 'debug-ttl';

      this.element = element;
      document.getElementById('screen').appendChild(element);
    },

    /**
     * General event handler interface.
     * Updates the overlay with as we receive load events.
     * @memberof TTLView.prototype
     * @param  {DOMEvent} evt The event.
     */
    handleEvent: function(evt) {
      switch (evt.type) {
        case 'apploadtime':
        case 'activityloadtime':
          this.updateLoadtime(evt.detail.time, evt.detail.type);
          break;

        case 'appwillopen':
        case 'activitywillopen':
          this.resetLoadtime();
          break;
      }
    },

    /**
     * Resets the load time to a clean slate.
     * @memberof TTLView.prototype
     */
    resetLoadtime: function() {
      if (!this.element) {
        this.createElement();
      }
      this.element.innerHTML = '00000';
    },

    /**
     * Updates the load time.
     * @memberof TTLView.prototype
     * @param {Number} time The time to load.
     * @param {String} type The type of event. Generally a single character.
     */
    updateLoadtime: function(time, type) {
      if (!this.element) {
        this.createElement();
      }
      this.element.innerHTML = time + ' [' + type + ']';
    },

    /**
     * Toggles visibility of the overlay.
     * @memberof TTLView.prototype
     */
    toggle: function() {
      this.visible ? this.hide() : this.show();
    }
  };

  exports.TTLView = TTLView;

}(window));
