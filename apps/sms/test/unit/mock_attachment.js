'use strict';

function MockAttachment(blob, options) {
  this.blob = blob;
  options = options || {};
  this.name = options.name;
  this.size = blob && blob.size;
  this.mNextRender = document.createElement('iframe');
}

MockAttachment.prototype = {
  render: function() {
    return this.mNextRender;
  },
  view: function() {}
};
