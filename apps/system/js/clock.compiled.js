/**
 * This file would not be included in github.
 * It is only here for illustrative purposes.
 */
System.register("clock", [], function($__export) {
  "use strict";
  var __moduleName = "clock";
  var Clock;
  return {
    setters: [],
    execute: function() {
      'use strict';
      Clock = $__export("Clock", (function() {
        var Clock = function Clock() {};
        return ($traceurRuntime.createClass)(Clock, {
          contructor: function() {
            this.timeoutID = null;
            this.timerID = null;
          },
          start: function(refresh) {
            var date = new Date();
            var self = this;
            refresh(date);
            if (this.timeoutID == null) {
              this.timeoutID = window.setTimeout(function cl_setClockInterval() {
                if (self.timerID == null) {
                  self.timerID = window.setInterval(function cl_clockInterval() {
                    refresh(new Date());
                  }, 60000);
                }
              }, (60 - date.getSeconds()) * 1000);
            }
          },
          stop: function() {
            if (this.timeoutID != null) {
              window.clearTimeout(this.timeoutID);
              this.timeoutID = null;
            }
            if (this.timerID != null) {
              window.clearInterval(this.timerID);
              this.timerID = null;
            }
          }
        }, {});
      }()));
    }
  };
});
