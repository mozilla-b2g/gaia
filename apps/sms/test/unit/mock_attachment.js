'use strict';

function MockAttachment(blob, name = '') {
  this.blob = blob;
  this.name = name;
  this.size = blob && blob.size;
  this.mNextRender = document.createElement('iframe');
}

MockAttachment.prototype = {
  render: function() {
    return this.mNextRender;
  }
};
