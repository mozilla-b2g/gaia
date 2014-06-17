/* global SettingsListener */

(function(exports) {
  'use strict';

  /**
   * The Developer HUD displays app metrics as an overlay on top of MozApps.
   * @class DeveloperHUD
   */
  function DeveloperHUD() {
    SettingsListener.observe('devtools.overlay.system',
                             false, this.toggleSystemHUD.bind(this));
  }

  DeveloperHUD.prototype = {

    start: function() {
      window.addEventListener('developer-hud-update', this);
      return this;
    },

    stop: function() {
      window.removeEventListener('developer-hud-update', this);
    },

    _showSystemHUD: false,
    toggleSystemHUD: function(enabled) {
      if (!enabled) {
        this.display(window, {});
      }

      this._showSystemHUD = enabled;
    },

    handleEvent: function(e) {
      this.display(e.target, e.detail);
      e.preventDefault();
    },

    /**
     * Display a HUD over an app to show its metrics' values.
     * @param {Object} target The iframe of the app being tracked.
     * @param {Object} data The metric values to display.
     */
    display: function(target, data) {
      if (!target) {
        return;
      }

      // For regular mozbrowser iframes use the div container.
      var appwindow = target.parentElement;

      // For system messages, directly insert the hud into the #screen
      // wrapper if needed.
      if (!appwindow) {
        if (target === window && this._showSystemHUD) {
          appwindow = document.getElementById('screen');
        } else {
          return;
        }
      }

      var overlay = appwindow.querySelector(':scope > .developer-hud');

      if (!overlay) {
        overlay = document.createElement('div');
        overlay.classList.add('developer-hud');
        appwindow.appendChild(overlay);
      }

      if (!data.metrics || data.metrics.length < 1) {
        overlay.remove();
        return;
      }

      var canvas = overlay.querySelector('.widgets');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.classList.add('widgets');
        canvas.height = 30;
        overlay.appendChild(canvas);
      }

      // The width is always set to the size of the screen in case the screen
      // has been rotated. This does not cause a reflow as long as the width
      // is the same.
      canvas.width = window.innerWidth;

      var ctx = canvas.getContext('2d');
      ctx.font = '18px sans-serif';
      ctx.textBaseline = 'top';

      ctx.save();

      // Widgets are positioned starting from the right side of the screen.
      ctx.translate(canvas.width, 0);

      data.metrics.reverse().forEach((function(metric) {
        var widget = this.widget(metric);
        if (!widget) {
          return;
        }

        // The size of a widget is comprise between 30px and the size of its
        // content. There is also an additional padding of 5px on each side.
        var textWidth = ctx.measureText(widget.value).width;
        var widgetWidth = Math.max(30, textWidth) + (5 * 2);

        // Position the widget relatively to the last position on the left
        // of the screen.
        ctx.translate(-widgetWidth, 0);

        // Fill widget background-color.
        ctx.fillStyle = widget.color;
        ctx.fillRect(0, 0, widgetWidth, canvas.height);

        // Draw widget text centered both horizontally and vertically.
        ctx.fillStyle = 'white';
        ctx.fillText(widget.value,
                     (widgetWidth - textWidth) / 2,
                     canvas.height / 4);
      }).bind(this));

      ctx.restore();
    },

    widget: function(metric) {
      var value = metric.value;
      if (!value) {
        return null;
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
          color = 'dimgrey';
          value = this.formatMemory(value);
          break;

        case 'memory':
          color = 'lightslategrey';
          value = this.formatMemory(value);
          break;

        default:
          color = this.colorHash(metric.name);
          break;
      }

      return {
        'color': color,
        'value': value
      };
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
