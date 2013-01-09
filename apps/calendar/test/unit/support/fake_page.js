Calendar.ns('Test').FakePage = (function() {

  var page = function() {
    page.routes.push(Array.prototype.slice.call(arguments));
  };

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

  return page;
}());
