'use strict';  

/* exported Timer, addMixin, ObserverSubjectMixin */

var Timer = function() {
  this._startTime = new Date();
};

Timer.prototype = {
  _startTime: null,

  getElapsedTime: function getElapsedTime() {
    var endTime = new Date();
    return endTime.getTime() - this._startTime.getTime();
  },

  reset: function reset() {
    this._startTime = new Date();
  }
};

function addMixin(destination, source) {
  for (var k in source) {
    if (source.hasOwnProperty(k)) {
      destination[k] = source[k];
    }
  }
  return destination;
}

var ObserverSubjectMixin = {
    _notify: function mlv_notify(data) {
      if(this._observers && Array.isArray(this._observers)) {
        this._observers.forEach((obs) => obs.onEvent(this._id, data));
      }
    },

    addListener: function mlv_addListener(observer) {
      if('onEvent' in observer) {
        if(!this._observers) {
          this._observers = [];
        }
        this._observers.push(observer);
      }
    },

    removeListener: function mlv_removeListener(observer) {
      if(!this._observers || !Array.isArray(this._observers)) {
        return;
      }

      var idx = this._observers.indexOf(observer);
      if(idx !== -1) {
        this._observers.splice(idx, 1);
      }
    },
};
