'use strict';

var Eventer = {
  makeEventable: function(view) {
    view.on = (function(event, fn) {
      this['on' + event] = fn;
    }.bind(view));
    view.emit = (function(event) {
      var fn = this['on' + event];
      if (fn) {
        var args = Array.prototype.slice.call(arguments, 0);
        args.shift();
        fn.apply(null, args);
      }
    }.bind(view));
  }
};
