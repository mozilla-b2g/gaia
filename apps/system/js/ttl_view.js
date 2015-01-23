'use strict';
/* global SettingsListener */

(function(exports) {

  var targets = [
    'homescreen',
    'app',
    'activity'
  ];

  /**
   * TtlView measures and displays startup time as measured by "first paint".
   * The load time is displayed in ms next to the type of load event.
   * There are two possible types of load events, [c] and [w].
   * [c] cold load time, is measured when the app is not currently running.
   * [w] warm load time, is measured when the app is backgrounded then launched.
   * @class TtlView
   */
  function TtlView() {
    SettingsListener.observe('debug.ttl.enabled', false, function(value) {
      !!value ? this.show() : this.hide();
    }.bind(this));
  }

  TtlView.prototype = {

    /**
     * A reference to the element which contains the TtlView.
     * @memberof TtlView.prototype
     * @type {Element}
     */
    element: null,

    /**
     * Whether or not the TtlView is visible.
     * @memberof TtlView.prototype
     * @return {Boolean} The TtlView is visible.
     */
    get visible() {
      return this.element && this.element.style.display === 'block';
    },

    /**
     * Hides the overlay.
     * @memberof TtlView.prototype
     */
    hide: function() {
      if (this.element) {
        this.element.style.visibility = 'hidden';
      }

      targets.forEach(function listen(target) {
        window.removeEventListener(target + 'opening', this);
        window.removeEventListener(target + 'loadtime', this);
      }, this);
    },

    /**
     * Shows the overlay.
     * @memberof TtlView.prototype
     */
    show: function() {
      if (!this.element) {
        this.createElement();
      }
      this.element.style.visibility = 'visible';

      // this is fired when the app launching is initialized
      targets.forEach(function listen(target) {
        window.addEventListener(target + 'opening', this);
        window.addEventListener(target + 'loadtime', this);
      }, this);
    },

    /**
     * Creates the element for the overlay.
     * @memberof TtlView.prototype
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
     * @memberof TtlView.prototype
     * @param  {DOMEvent} evt The event.
     */
    handleEvent: function(evt) {
      switch (evt.type) {
        case 'homescreenloadtime':
        case 'apploadtime':
        case 'activityloadtime':
          this.updateLoadtime(evt.detail.time, evt.detail.type);
          break;

        case 'homescreenopening':
        case 'appopening':
        case 'activityopening':
          this.resetLoadtime();
          break;
      }
    },

    /**
     * Resets the load time to a clean slate.
     * @memberof TtlView.prototype
     */
    resetLoadtime: function() {
      if (!this.element) {
        this.createElement();
      }
      this.element.innerHTML = '00000';
    },

    /**
     * Updates the load time.
     * @memberof TtlView.prototype
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
     * @memberof TtlView.prototype
     */
    toggle: function() {
      this.visible ? this.hide() : this.show();
    }
  };

  exports.TtlView = TtlView;

}(window));
