'use strict';

function MockAttachment(blob, name = '') {
  this.blob = blob;
  this.name = name;
}

MockAttachment.prototype = {
  render: function() {
    return this.mNextRender;
  }
};
