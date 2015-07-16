'use strict';
/* exported MockImageEditor */

var MockImageEditor = (function() {
  var MockImageEditor = function(imageBlob, container, edits, ready, croponly) {
    this.imageBlob = imageBlob;
    this.container = container;
    this.edits = edits;
    this.ready = ready;
    this.croponly = croponly;
    
    this.dest = {};
    this.cropOverlayRegion = {};

    setTimeout(ready);
  };

  MockImageEditor.prototype.showCropOverlay = sinon.spy();
  MockImageEditor.prototype.setCropAspectRatio = sinon.spy();
  MockImageEditor.prototype.destroy = sinon.spy();

  MockImageEditor.prototype.hasBeenCropped = function() {
    return (this.cropOverlayRegion.left !== 0 ||
            this.cropOverlayRegion.top !== 0 ||
            this.cropOverlayRegion.right !== this.dest.width ||
            this.cropOverlayRegion.bottom !== this.dest.height);
  };

  MockImageEditor.prototype.getCropRegion = function() {
    var region = this.cropOverlayRegion;
    var previewRect = this.dest;

    // Convert the preview crop region to fractions
    var left = region.left / previewRect.width;
    var right = region.right / previewRect.width;
    var top = region.top / previewRect.height;
    var bottom = region.bottom / previewRect.height;

    return {
      left: left,
      top: top,
      width: right - left,
      height: bottom - top
    };
  };

  sinon.spy(MockImageEditor.prototype, 'hasBeenCropped');
  sinon.spy(MockImageEditor.prototype, 'getCropRegion');

  return MockImageEditor;
})();
