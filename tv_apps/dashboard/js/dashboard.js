'use strict';
/* global KeyNavigationAdapter, Dashboard, AppWidget */

(function(exports) {

  function Dashboard () {}

  Dashboard.prototype = {

    init: function () {
      document.body.dataset.activeDirection = '';
      this.keyNavigationAdapter = new KeyNavigationAdapter();
      this.keyNavigationAdapter.on('move', this.onMove.bind(this));
      this.keyNavigationAdapter.init(document.body);

      this.widgets = {};
      this.widgets.down = new AppWidget({
        manifestURL: 'app://weather-widget.gaiamobile.org/manifest.webapp',
        widget: 'weather',
        url: 'app://weather-widget.gaiamobile.org/widget.html',
        position: 'bottom'
      });

    },

    onMove: function (key) {
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
          this.widgets[key] && this.widgets[key].toggleExpand(true);
          document.body.dataset.activeDirection = key;
          break;
      }
    },

    _clearActiveDirection: function() {
      var direction = document.body.dataset.activeDirection;
      this.widgets[direction] && this.widgets[direction].toggleExpand(false);
      document.body.dataset.activeDirection = '';
    }

  };

  exports.Dashboard = Dashboard;

}(window));

window.dashboard = new Dashboard();
window.dashboard.init();
