/* globals SmartWeather, WeatherWidget */
'use strict';
(function(exports) {

function WeatherWidget() {}

WeatherWidget.prototype = {
  elements: {},
  clocks: [],
  init: function sc_init() {
    this.elements.panel = document.getElementById('panel');
    this.clocks.push(new SmartWeather());
    this.clocks.push(new SmartWeather());
    this.clocks.forEach(function(clock) {
      this.elements.panel.appendChild(clock);
    }.bind(this));
    this.elements.panel.dataset.count = this.clocks.length;
  }
};

exports.WeatherWidget = WeatherWidget;
})(window);

var weatherWidget = new WeatherWidget();
weatherWidget.init();
