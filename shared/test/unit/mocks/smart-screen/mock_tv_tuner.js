/* global MockTVSource */

(function(exports) {
  'use strict';

  function MockTVTuner() {
    this.stream = 'http://mystream.moz';
    this.currentSource = null;
    this.sources = [];

    var source = new MockTVSource();
    source.type = 'dvb-0';
    this.sources.push(source);

    source = new MockTVSource();
    source.type = 'dvb-1';
    this.sources.push(source);

    source = new MockTVSource();
    source.type = 'dvb-2';
    this.sources.push(source);

    this.getSources = function() {
      return {
        then: function(callback) {
          callback(this.sources);
        }.bind(this)
      };
    };

    this.setCurrentSource = function(type) {
      this.currentSource = this.sources[type];
      return {
        then: function(callback) {
          callback();
        }.bind(this)
      };
    };
  }

  exports.MockTVTuner = MockTVTuner;
}(window));
