'use strict';

(function(exports) {

  /**
   * The Developer HUD displays app metrics as an overlay on top of MozApps.
   * @class DeveloperHUD
   */
  function DeveloperHUD() {
    window.addEventListener('developer-hud-update', function updateHandler(e) {
      this.display(e.target, e.detail);
      e.preventDefault();
    }.bind(this));
  }

  DeveloperHUD.prototype = {

    /**
     * Display a HUD over an app to show its metrics' values.
     * @param {Object} target The iframe of the app being tracked.
     * @param {Object} data The metric values to display.
     */
    display: function(target, data) {
      if (!target) {
        return;
      }

      var appwindow = target.parentElement;
      if (!appwindow) {
        return;
      }

      var overlay = appwindow.querySelector('.developer-hud');

      if (!overlay) {
        overlay = document.createElement('div');
        overlay.classList.add('developer-hud');
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

    widget: function(metric) {
      var value = metric.value;
      if (!value) {
        return '';
      }

      var color;
      switch(metric.name) {
        case 'warnings':
          color = 'orange';
          break;

        case 'errors':
          color = 'red';
          break;

        case 'security':
          color = 'black';
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

  exports.DeveloperHUD = DeveloperHUD;

}(window));
