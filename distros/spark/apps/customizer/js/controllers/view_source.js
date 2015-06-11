define(["exports"], function (exports) {
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

  var ViewSourceController = (function (Controller) {
    var ViewSourceController = function ViewSourceController(options) {
      Controller.call(this, options);
    };

    _extends(ViewSourceController, Controller);

    ViewSourceController.prototype.teardown = function () {
      this.view = null;

      this.target = null;
    };

    ViewSourceController.prototype.open = function (target) {
      console.log("view source controller open");
      this.target = target;
      var url = target.src || target.href;
      var filename = url.substring(url.lastIndexOf("/") + 1);
      this.view.setTitle(filename);
      this.view.setSource("Loading...");
      this.fetchAndDisplay(url);
      this.view.open();
    };

    ViewSourceController.prototype.close = function () {
      this.view.close();
      this.view.setSource("");
    };

    ViewSourceController.prototype.fetchAndDisplay = function (url) {
      var self = this;
      try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.responseType = "text";
        xhr.send();
        xhr.onload = function () {
          if (xhr.status === 200) {
            self.view.setSource(xhr.response);
          } else {
            self.view.setSource(xhr.status + ":" + xhr.statusText);
          }
        };
        xhr.onerror = function () {
          self.view.setSource(xhr.error.name);
        };
      } catch (e) {
        // Surprisingly, the xhr.send() call above can throw an exception
        // if the URL is malformed.
        self.view.setSource(e.toString());
      }
    };

    return ViewSourceController;
  })(Controller);

  exports["default"] = ViewSourceController;
});