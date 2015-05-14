'use strict';
/* global KeyNavigationAdapter, Dashboard */

(function(exports) {

  function Dashboard () {}

  Dashboard.prototype = {

    init: function () {
      // #main-section DOM reference
      this.mainSection = document.getElementById('main-section');
      this.mainSection.dataset.activeDirection = '';
      this.mainSection.focus();

      this.keyNavigationAdapter = new KeyNavigationAdapter();
      this.keyNavigationAdapter.on('move', this.onMove.bind(this));
      this.keyNavigationAdapter.init(this.mainSection);
    },

    onMove: function (key) {
      var activeDirection = this.mainSection.dataset.activeDirection;

      switch (activeDirection) {
        case 'up':
          if (key === 'down') {
            this.mainSection.dataset.activeDirection = '';
          }
          break;
        case 'right':
          if (key === 'left') {
            this.mainSection.dataset.activeDirection = '';
          }
          break;
        case 'down':
          if (key === 'up') {
            this.mainSection.dataset.activeDirection = '';
          }
          break;
        case 'left':
          if (key === 'right') {
            this.mainSection.dataset.activeDirection = '';
          }
          break;
        default:
          this.mainSection.dataset.activeDirection = key;
          break;
      }
    }

  };

  exports.Dashboard = Dashboard;

}(window));

window.dashboard = new Dashboard();
window.dashboard.init();
