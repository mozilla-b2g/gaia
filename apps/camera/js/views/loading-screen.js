define(function(require, exports, module) {
'use strict';

var debug = require('debug')('view:loading-screen');
var View = require('vendor/view');

module.exports = View.extend({
  name: 'loading-screen',
  fadeTime: 300,

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template;

    // Clean up
    delete this.template;

    debug('rendered');
    return this;
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