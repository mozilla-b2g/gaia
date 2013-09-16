/*global Utils */
/*exported MockAttachment */

'use strict';

function MockAttachment(blob, options) {
  this.blob = blob;
  options = options || {};
  this.name = options.name;
  this.mNextRender = document.createElement('iframe');
  this.mNextRender.className = 'attachment-container';
}

MockAttachment.prototype = {
  get size() {
    return this.blob && this.blob.size;
  },
  get type() {
    return Utils.typeFromMimeType(this.blob.type);
  },
  render: function() {
    this.mNextRender = document.createElement('iframe');
    this.mNextRender.className = 'attachment-container';
    return this.mNextRender;
  },
  view: function() {}
};
