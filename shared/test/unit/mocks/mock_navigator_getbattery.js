'use strict';

(function() {

  var Battery = function() {
    this._listeners = {};
    this.charging = true;
  };

  Battery.prototype.addEventListener = function(type, cb) {
    if (!(type in this._listeners)) {
      this._listeners[type] = [];
    }

    this._listeners[type].push(cb);
  };

  Battery.prototype.removeEventListener = function() {
  };

  Battery.prototype.dispatchEvent = function(type) {
    if (!this._listeners[type]) {
      return;
    }
    this._listeners[type].forEach((cb) => {
      if (cb.handleEvent) {
        cb.handleEvent({
          type: type
        });
      } else {
        cb();
      }
    });
  };

  var battery = new Battery();

  window.MockBattery = {
    _battery: battery,
    getBattery: function() {
      return Promise.resolve(battery);
    },
  };
})();
