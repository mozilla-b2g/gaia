define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var FaceView = require('views/face');
var View = require('view');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'faces',
  faces: [],

  initialize: function(options) {
    options = options || {};
    this.el.innerHTML = this.template();
    this.FaceView = options.FaceView || FaceView;
  },

  // It creates the DOM elements that will display circles
  // around the detected faces.
  configure: function(maxNumberFaces) {
    var faceView;
    var i;
    for(i = 0; i < maxNumberFaces; ++i) {
      faceView = new this.FaceView();
      faceView.hide();
      this.faces.push(faceView);
      faceView.appendTo(this.el);
    }
  },

  render: function(faces) {
    var self = this;
    this.hideFaces();
    faces.forEach(function(face, index) {
      var faceView = self.faces[index];
      self.renderFace(face, faceView);
    });
  },

  renderFace: function(face, faceView) {
    // Maximum diameter is 300px as in the visual spec
    var diameter = Math.min(300, face.diameter);
    faceView.setPosition(face.x, face.y);
    faceView.setDiameter(diameter);
    faceView.show();
  },

  hideFaces: function() {
    this.faces.forEach(function(faceView) {
      faceView.hide();
    });
  },

  clear: function() {
    var self = this;
    this.faces.forEach(function(faceView) {
      self.el.removeChild(faceView.el);
    });
    this.faces = [];
  }

});

});
