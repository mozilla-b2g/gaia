define(["exports", "fxos-mvc/dist/mvc"], function (exports, _fxosMvcDistMvc) {
  "use strict";

  var _classProps = function (child, staticProps, instanceProps) {
    if (staticProps) Object.defineProperties(child, staticProps);
    if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
  };

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


  var singletonGuard = {};
  var instance;

  /* jshint -W101 */
  var icons = ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAANCAYAAAB2HjRBAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2hpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYxIDY0LjE0MDk0OSwgMjAxMC8xMi8wNy0xMDo1NzowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowMTgwMTE3NDA3MjA2ODExOEM5RkVDOTQxRDNGQzczQSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpBQjI5NUNCQzZBQ0ExMUUxOTEwMkY4NzAyQjVDRTJERCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpBQjI5NUNCQjZBQ0ExMUUxOTEwMkY4NzAyQjVDRTJERCIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1LjEgTWFjaW50b3NoIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NkY0OTRDMTgxNTIwNjgxMUIzNjVENjU0NThENUFEQkEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDE4MDExNzQwNzIwNjgxMThDOUZFQzk0MUQzRkM3M0EiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5n+0vmAAAA40lEQVR42mL8KCbBAAWWQBwOxJxAvAaIdzMggDEQRwHxXyDeBMRHQIKMUM2ZQDwZiJmRNDQBcT0Q50DlkEExEPeBNIsCGQ+hNjJgUdSFZigI/AJiDRYg4YpDIwj04hBnA+JAJiAhx0AekABpfk2m5hcgP/MDGTdAJpGg8QsQq4Js/gjEQVABYgBM/QsmqMBxINaD0vjADiDWhqUBJiSJ+0BsBcRZQPwdTRMocZQBsScQP4UJMmExfToQm4OcBeWDDAoF4m50hUw4nHcZassvqMb12BSx4PHfBSC2BeJTuBQABBgAkf0rYAW2ug4AAAAASUVORK5CYII=", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjEwMPRyoQAAAE1JREFUOE9jYACC/2QAkD6wxqamJpIxSB9ezfgMxqsZ3SforsOpGWYjWTYPnGaQ/5ABttggOrSx+X0QaiYUx7AwoU0KI5TewQFGSa4CAIp5nbtWcD+xAAAAAElFTkSuQmCC", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAATCAYAAAB2pebxAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAHRJREFUeNrM1G0KwCAIBuCMzuqhvKz7AEcrNbdF7P1Z9oAZATOnr4ElCBGdBYgIrxABJBZkIi3gQSpSA/shWTOhDtGAak+FbogHeNCFRAALysrFDd9FW5PThExBSrR3r9X/tKOO+EmOEZuPLQqs+08i2QQYAIoIXFlI2XeyAAAAAElFTkSuQmCC", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAF9JREFUeNpiYKA34AfieiB+D8T/ofg9VIwfm+LzSArR8Xl0DSBT/r9//x6McWiqR9bwnggN7xmRNPwnxpNMpIYKsoYPRKj/wIzE4QBiBwIaOtAFSApW5ODFFnFgABBgADYiOslAa4FxAAAAAElFTkSuQmCC"];
  var IconService = (function (Service) {
    var IconService = function IconService(guard) {
      if (guard !== singletonGuard) {
        console.error("Cannot create singleton class");
        return;
      }

      Service.call(this);
    };

    _extends(IconService, Service);

    _classProps(IconService, {
      instance: {
        get: function () {
          if (!instance) {
            instance = new this(singletonGuard);
          }
          return instance;
        }
      }
    }, {
      icons: {
        get: function () {
          return icons;
        }
      }
    });

    return IconService;
  })(Service);

  exports["default"] = IconService;
});