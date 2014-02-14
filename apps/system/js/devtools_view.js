'use strict';

(function(exports) {

  /**
   * DevtoolsView displays metrics as an overlay on top of mozapps.
   * @param {Object} data The data to update the devtools view with.
   * @class DevtoolsView
   */
  function DevtoolsView() {
    window.addEventListener('widget-panel-update', function updateHandler(e){
      this.display(e.detail);
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
    display: function(data) {
      var target = 'iframe[mozapp="' + data.manifestURL + '"]';
      var iframe = document.querySelector(target);
      if (!iframe) {
        return;
      }

      var appwindow = iframe.parentElement;
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
    }
  };

  exports.DevtoolsView = DevtoolsView;

}(window));
