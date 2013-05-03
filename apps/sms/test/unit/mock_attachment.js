'use strict';

function MockAttachment(type, uri, size) {
  this.type = type;
  this.uri = uri;
  this.size = size;
}

MockAttachment.prototype = {
  render: function() {
    return this.mNextRender;
  }
};
