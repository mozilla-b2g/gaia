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

    // XXX: we leave a focusable element here for determining focus issues.
    // This wiget has no focusable element by design, but we need to test
    // dashboard ability on setting focus. These lines should be removed after
    // other widgets are landed.
    this.clocks[0].tabIndex = 1;
    this.clocks[0].focus();

    window.onhashchange = function(evt) {
      document.body.classList.toggle(
                                  'expand', window.location.hash === '#expand');
    };
  }
};

exports.WeatherWidget = WeatherWidget;
})(window);

var weatherWidget = new WeatherWidget();
weatherWidget.init();
