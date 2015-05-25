/* global MockTVTuner */

(function(exports) {
  'use strict';

  function MockTVManager() {
    this.tuners = [];
    var tuner = new MockTVTuner();
    tuner.id = '0';
    this.tuners.push(tuner);

    tuner = new MockTVTuner();
    tuner.id = '1';
    this.tuners.push(tuner);

    this.getTuners = function() {
      return {
        then: function(callback) {
          callback(this.tuners);
        }.bind(this)
      };
    };
  }

  exports.MockTVManager = MockTVManager;
}(window));
