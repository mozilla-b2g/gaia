'use strict';

(function(exports) {

  /**
   * DevtoolsView displays metrics as an overlay on top of mozapps.
   * @param {Object} data The data to update the devtools view with.
   * @class DevtoolsView
   */
  function DevtoolsView() {
    window.addEventListener('developer-hud-update', function updateHandler(e) {
      this.display(e.target, e.detail);
      e.preventDefault();
    }.bind(this));
  }

  DevtoolsView.prototype = {

    /**
     * Displays the devtools view if it does not exist and updates with data.
     * Currently we measure errors, warnings, and reflows.
     * @memberof DevtoolsView.prototype
     * @param {Object} data The data to update the devtools view with.
     */
    display: function(target, data) {
      if (!target) {
        return;
      }

      var appwindow = target.parentElement;
      if (!appwindow) {
        return;
      }

      var overlay = appwindow.querySelector('.devtools-view');

      if (!overlay) {
        overlay = document.createElement('div');
        overlay.classList.add('devtools-view');
        appwindow.appendChild(overlay);
      }

      if (!data.metrics || data.metrics.length < 1) {
        overlay.remove();
        return;
      }

      var html = '';

      data.metrics.forEach(function(metric) {
        html += this.widget(metric);
      }, this);

      overlay.innerHTML = html;
    },

    /**
     * Updates a single metric to be displayed.
     * @memberof DevtoolsView.prototype
     * @param {Object} metric The metric to be updated.
     */
    widget: function(metric) {
      var value = metric.value;
      if (!value) {
        return '';
      }

      var color;
      switch(metric.name) {
        case 'errors':
          color = 'red';
          break;

        case 'warnings':
          color = 'orange';
          break;

        case 'reflows':
          color = 'purple';
          break;

        case 'jank':
          color = 'cornflowerblue';
          value += 'ms';
          break;

        case 'uss':
          color = 'navy';
          value = this.formatMemory(value);
          break;

        case 'memory':
          color = 'slategrey';
          value = this.formatMemory(value);
          break;

        default:
          color = this.colorHash(metric.name);
          break;
      }

      return '<div class=widget style="background-color: ' + color + '">' +
             value + '</div>';
    },

    /**
     * Given a color name, returns a styled CSS background value.
     * @memberof DevtoolsView.prototype
     * @param {String} name The name of the color.
     */
    colorHash: function(name) {
      var hue = 0;
      for (var i = 0; i < name.length; i++) {
        hue += name.charCodeAt(i);
      }
      return 'hsl(' + (hue % 360) + ', 75%, 50%)';
    },

    formatMemory: function(bytes) {
      var prefix = ['','K','M','G','T','P','E','Z','Y'];
      var i = 0;
      for (; bytes > 1024 && i < prefix.length; ++i) {
        bytes /= 1024;
      }
      return (Math.round(bytes * 100) / 100) + ' ' + prefix[i] + 'B';
    }
  };

  exports.DevtoolsView = DevtoolsView;

}(window));
