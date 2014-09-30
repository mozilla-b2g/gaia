/**
 * This file is compiled and will live in build_stage.
 * It would not be checked into github.
 */

System.register("foobar", [], function($__export) {
  "use strict";
  var __moduleName = "foobar";
  var foobar;
  return {
    setters: [],
    execute: function() {
      foobar = $__export("foobar", (function() {
        var foobar = function foobar() {
          console.log('this is an es6 class!');
        };
        return ($traceurRuntime.createClass)(foobar, {start: function() {
            console.log('Module started.');
          }}, {});
      }()));
    }
  };
});
