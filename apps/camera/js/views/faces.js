define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var Face = require('views/face');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'faces',
  faces: [],

  initialize: function() {
    this.el.innerHTML = this.template();
  },

  renderFace: function(face, faceView) {
    // Maximum radius is 300px as in the visual spec
    var radius = Math.min(300, face.radius);
    faceView.setPosition(face.x, face.y);
    faceView.setRadius(radius);
    faceView.show();
  },

  render: function(faces) {
    var self = this;
    this.hideFaces();
    faces.forEach(function(face, index) {
      var faceView = self.faces[index];
      self.renderFace(face, faceView);
    });
  },

  hideFaces: function() {
    this.faces.forEach(function(face) {
      face.hide();
    });
  },

  clear: function() {
    var self = this;
    this.faces.forEach(function(face) {
      self.el.removeChild(face.el);
    });
    this.faces = [];
  },

  // It creates the DOM elements that will display circles
  // around the detected faces.
  configure: function(maxNumberFaces) {
    var face;
    var i;
    for(i = 0; i < maxNumberFaces; ++i) {
      face = new Face();
      face.hide();
      this.faces.push(face);
      face.appendTo(this.el);
    }
  }

});

});
