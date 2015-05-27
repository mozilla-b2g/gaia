'use strict';
/* global KeyNavigationAdapter, AppWidget, DigitalClock */

(function(exports) {

  function Dashboard () {}

  Dashboard.prototype = {
    init: function d_init() {
      document.body.dataset.activeDirection = '';

      this.elements = {};
      this.elements.mainSection = document.getElementById('main-section');

      this.keyNavigationAdapter = new KeyNavigationAdapter();
      this.keyNavigationAdapter.on('move', this.onMove.bind(this));
      this.keyNavigationAdapter.on('before-move', this.onMove.bind(this));
      this.keyNavigationAdapter.init(window, {useMozBrowserKeyEvents: true});
      document.addEventListener(
              'visibilitychange', this.onVisibilityChange.bind(this));

      this.widgets = {};
      this.widgets.down = new AppWidget({
        manifestURL: 'app://weather-widget.gaiamobile.org/manifest.webapp',
        widget: 'weather',
        url: 'app://weather-widget.gaiamobile.org/widget.html',
        position: 'bottom'
      });

      this.digitalClock = new DigitalClock();
      this.digitalClock.init();
      this.digitalClock.start();
    },

    onVisibilityChange: function d_onVisibilityChange() {
      if (document.visibilityState !== 'visible') {
        this._clearActiveDirection();
      }
    },

    onMove: function d_onMove(key) {
      var activeDirection = document.body.dataset.activeDirection;

      switch (activeDirection) {
        case 'up':
          if (key === 'down') {
            this._clearActiveDirection();
          }
          break;
        case 'right':
          if (key === 'left') {
            this._clearActiveDirection();
          }
          break;
        case 'down':
          if (key === 'up') {
            this._clearActiveDirection();
          }
          break;
        case 'left':
          if (key === 'right') {
            this._clearActiveDirection();
          }
          break;
        default:
          document.body.dataset.activeDirection = key;
          if (this.widgets[key]) {
            this.widgets[key].toggleExpand(true);

            this._holdFocus();
            // Note: Gecko refuses to change focus on a key event callback. we
            // need to setTimeout to prevent fail.
            setTimeout(() => this.widgets[key].focus());
          }
          break;
      }
    },

    _holdFocus: function() {
      document.activeElement.blur();
      this.elements.mainSection.focus();
    },

    _clearActiveDirection: function() {
      var direction = document.body.dataset.activeDirection;
      this.widgets[direction] && this.widgets[direction].toggleExpand(false);
      document.body.dataset.activeDirection = '';
      this._holdFocus();
    }

  };

  exports.Dashboard = Dashboard;

}(window));
