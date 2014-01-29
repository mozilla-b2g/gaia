'use strict';

var CanvasTests = {

  get drawButton() {
    delete this.drawButton;
    return this.drawButton = document.getElementById('button-draw');
  },

  get toggleHiddenButton() {
    delete this.toggleHiddenButton;
    return this.toggleHiddenButton =
      document.getElementById('button-toggle-hidden');
  },

  get canvas() {
    delete this.canvas;
    return this.canvas = document.getElementById('canvas');
  },

  get hiddenStatus() {
    delete this.hiddenStatus;
    return this.hiddenStatus = document.getElementById('hidden-status');
  },

  init: function ct_init() {
    this.hiddenStatus.innerHTML =
      'hidden = ' +
      this.canvas.classList.contains('hidden');

    this.drawButton.addEventListener('click', this.draw.bind(this));
    this.toggleHiddenButton.addEventListener('click',
      this.toggleShowHide.bind(this));
  },

  draw: function ct_draw() {
    // var element = document.getElementById('canvas');
    var context = this.canvas.getContext('2d');
    var image = new Image();
    var path = '../../style/images/canardpc.jpg';
    image.src = path;
    var self = this;
    image.onload = function() {
      var w = image.width;
      var h = image.height;
      context.drawImage(image, 0, 0, w, h, 0, 0, w, h);
    };
  },

  toggleShowHide: function ct_toggleShowHide() {
    this.canvas.classList.toggle('hidden');
    var status = this.canvas.classList.contains('hidden');
    this.hiddenStatus.innerHTML = 'hidden = ' + status;
  }
};

window.addEventListener('DOMContentLoaded', function() {
  CanvasTests.init();
});
