'use strict';
/* global KeyNavigationAdapter, Dashboard */

(function(exports) {

  function Dashboard () {}

  Dashboard.prototype = {

    init: function () {
      document.body.dataset.activeDirection = '';

      this.keyNavigationAdapter = new KeyNavigationAdapter();
      this.keyNavigationAdapter.on('move', this.onMove.bind(this));
      this.keyNavigationAdapter.init(document.body);
    },

    onMove: function (key) {
      var activeDirection = document.body.dataset.activeDirection;

      switch (activeDirection) {
        case 'up':
          if (key === 'down') {
            document.body.dataset.activeDirection = '';
          }
          break;
        case 'right':
          if (key === 'left') {
            document.body.dataset.activeDirection = '';
          }
          break;
        case 'down':
          if (key === 'up') {
            document.body.dataset.activeDirection = '';
          }
          break;
        case 'left':
          if (key === 'right') {
            document.body.dataset.activeDirection = '';
          }
          break;
        default:
          document.body.dataset.activeDirection = key;
          break;
      }
    }

  };

  exports.Dashboard = Dashboard;

}(window));

window.dashboard = new Dashboard();
window.dashboard.init();
