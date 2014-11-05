define(function(require, exports, module) {
'use strict';

function page() {
  page.routes.push(Array.prototype.slice.call(arguments));
}
module.exports = page;

page.routes = [];

page.show = function(item) {
  this.shown = item;
};

page.start = function() {
  this.started = true;
};

page.stop = function() {
  this.started = false;
};

});
