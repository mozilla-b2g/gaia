'use strict';

function MockAttachmentRenderer() {}

MockAttachmentRenderer.prototype = {
  render: function() {
    return Promise.resolve();
  },
  getAttachmentContainer: function() {},
  updateFileSize: function() {}
};

MockAttachmentRenderer.for = function() {
  return new MockAttachmentRenderer();
};
