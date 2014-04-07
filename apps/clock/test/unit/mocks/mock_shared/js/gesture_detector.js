define(function() {
'use strict';

var MockGestureDetector = sinon.spy(function() {
  this.startDetecting = sinon.spy();
});

return MockGestureDetector;
});
