/* globals Clock */

'use strict';
(function(exports) {

var proto = Object.create(HTMLElement.prototype);

proto.createdCallback = function sw_createdCallBack() {
  this.hands = {};
  this.timeouts = {};
  this.innerHTML = this._getView();

  this.hands.min = this.getElementsByClassName('minute-hand')[0];
  this.hands.hour = this.getElementsByClassName('hour-hand')[0];

  this.clock = new Clock();
};

proto.attachedCallback = function sw_attachedCallback() {
  this.clock.start(this.updateAnalogClock.bind(this));
};

proto.detachedCallback = function sw_detachedCallback() {
  this.clock.stop();
};

proto._getView = function sw_getView() {
  // TODO: Change the following fake data to real weather data.
  var view = `
    <section class="clock">
      <div class='hour-hand'></div>
      <div class='minute-hand'></div>
    </section>
    <section class="city">New York</section>
    <section class="weather-detail">
      <div>Partly Cloudy</div>
      <div>17-24°C</div>
        <div>70 %</div>
        <div>7 mph</div>
      </section>
    </section>`;
  return view;
};

proto.updateAnalogClock = function sw_updateAnalogClock(now) {
  var min, hour;
  min = now.getMinutes();
  // hours progress gradually
  hour = (now.getHours() % 12) + min / 60;
  this.setTransform('min', min);
  this.setTransform('hour', hour);
};

proto.setTransform = function sw_setTransform(id, angle) {
  var hand = this.hands[id];
  // return correct angle for different hands
  function conv(timeFrag) {
    var mult;
    // generate a conformable number to rotate about
    // 30 degrees per hour 6 per second and minute
    mult = id === 'hour' ? 30 : 6;
    // we generate the angle from the fractional sec/min/hour
    return (timeFrag * mult);
  }
  // Use transform rotate on the rect itself vs on a child element
  // avoids unexpected behavior if either dur and fill are set to defaults
  // Use translateZ to force it on its own layer, which will invoke the GPU
  // and thus do the minimum amount of work required (reduces power usage)
  hand.style.transform = 'rotate(' + conv(angle) + 'deg) translateZ(1px)';
};

exports.SmartWeather =
            document.registerElement('smart-weather', {prototype: proto});
}(window));

