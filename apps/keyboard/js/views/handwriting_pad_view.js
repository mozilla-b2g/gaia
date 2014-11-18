'use strict';

(function(exports) {

/**
 * HandwritingPadView handles the rendering of handwriting pad and
 * interactions on it. Handwriting pad is a canvas element in DOM.
 */
var HandwritingPadView = function(target, options, viewManager) {
  this.target = target;
  // Not used for now, added to comply with the ViewClass interface.
  this.options = options;
  this.viewManager = viewManager;
  this.element = null;
  this.lastX = this.lastY = 0;
};

HandwritingPadView.prototype.render = function render() {
  this.element = document.createElement('canvas');
  this.element.className = 'handwriting-pad';

  if (this.viewManager) {
    this.viewManager.registerView(this.target, this);
  }
};

HandwritingPadView.prototype.drawHandwritingPad =
  function drawHandwritingPad(press, start, strokeWidth) {
    var ctx = this.element.getContext('2d');
    ctx.strokeStyle = '#df4b26';
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    var point = this._getPressPoint(press);

    ctx.beginPath();
    if (start) {
      this.lastX = point.posX - 1;
      this.lastY = point.posY;
    }
    ctx.moveTo(this.lastX, this.lastY);
    ctx.lineTo(point.posX, point.posY);
    ctx.closePath();
    ctx.stroke();
    this.lastX = point.posX;
    this.lastY = point.posY;

    return point;
  };

HandwritingPadView.prototype.clearHandwritingPad =
  function clearHandwritingPad() {
    var ctx = this.element.getContext('2d');
    var width = this.element.width;
    var height = this.element.height;
    ctx.clearRect(0, 0, width, height);
  };

// Get user press point relative position in canvas.
HandwritingPadView.prototype._getPressPoint =
  function getPressPoint(press) {
    var canvasRect = this.element.getBoundingClientRect();

    // Get canvas rectangle's relative top left positon
    // in document body.
    var posTop = canvasRect.top - document.body.clientTop;
    var posLeft = canvasRect.left - document.body.clientLeft;

    // Get user press's relative position in canvas
    var posX = press.clientX - posLeft;
    var posY = press.clientY - posTop;

    // Get position in canvas context.
    posX *= window.devicePixelRatio;
    posY *= window.devicePixelRatio;

    return {
      posX: posX,
      posY: posY
    };
  };

exports.HandwritingPadView = HandwritingPadView;

})(window);
