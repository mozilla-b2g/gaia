define(function(require, exports, module) {
'use strict';

var View = require('view');

module.exports = View.extend({
  name: 'loading-screen',
  fadeTime: 300,

  initialize: function() {
    this.el.innerHTML = this.template;
  },

  show: function(done) {
    this.reflow = this.el.offsetTop;
    View.prototype.show.call(this);
  },

  hide: function(done) {
    View.prototype.hide.call(this);
    if (done) { setTimeout(done, this.fadeTime); }
  },

  template: '<progress></progress>'
});

});