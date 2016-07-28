/*exported MockContactRenderer */

'use strict';

function MockContactRenderer(opts) {
}

MockContactRenderer.prototype = {
  render: function() {}
};

MockContactRenderer.flavor = function() {
  return new MockContactRenderer();
};
