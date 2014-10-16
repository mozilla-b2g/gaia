'use strict';

(function(exports) {
  var MockLayoutNormalizer = function(layout) {
    this._layout = layout;

    MockLayoutNormalizer.instances.push(this);
  };

  MockLayoutNormalizer.instances = [];

  MockLayoutNormalizer.teardown = function() {
    MockLayoutNormalizer.instances = [];
  };

  MockLayoutNormalizer.setup = function() {
    MockLayoutNormalizer.instances = [];
  };

  MockLayoutNormalizer.prototype = {
    normalize: sinon.stub()
  };

  exports.MockLayoutNormalizer = MockLayoutNormalizer;
}(window));
