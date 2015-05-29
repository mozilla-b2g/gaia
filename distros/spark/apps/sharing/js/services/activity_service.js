define(["exports", "fxos-mvc/dist/mvc"], function (exports, _fxosMvcDistMvc) {
  "use strict";

  var _extends = function (child, parent) {
    child.prototype = Object.create(parent.prototype, {
      constructor: {
        value: child,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    child.__proto__ = parent;
  };

  var Service = _fxosMvcDistMvc.Service;
  var ActivityService = (function (Service) {
    var ActivityService = function ActivityService(guard) {
      Service.call(this);

      navigator.mozSetMessageHandler("activity", function (req) {
        var option = req.source;

        if (option.name === "share") {
          window.activityHandled = "share";
          var app = option.data.app;
          window.alert("Sharing " + app + " is not implemented yet");
        }
      });
    };

    _extends(ActivityService, Service);

    return ActivityService;
  })(Service);

  exports["default"] = new ActivityService();
});