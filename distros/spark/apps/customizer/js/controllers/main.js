define(["exports"], function (exports) {
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

  var MainController = (function (Controller) {
    var MainController = function MainController(options) {
      var _this = this;
      Controller.call(this, options);

      this._checkOpenFromLauncher();
      this._waitToBeOpened();

      window.addEventListener("visibilitychange", function () {
        if (!document.hidden) {
          _this._checkOpenFromLauncher();
        }
      });

      console.log("[Customizer] Initialized MainController", this);
    };

    _extends(MainController, Controller);

    MainController.prototype._lazyLoadModules = function () {
      var _this2 = this;
      this._loadedModules = this._loadedModules || new Promise(function (resolve, reject) {
        /*jshint evil:true*/
        var source = window.localStorage.getItem("__CUSTOMIZER__componentsSource");
        if (!source) {
          reject();
          return;
        }

        eval.call(window, source);

        var editView = new EditView();
        var actionMenuView = new ActionMenuView();
        var viewSourceView = new ViewSourceView();
        var appendChildView = new AppendChildView();
        var copyMoveView = new CopyMoveView();
        var mainView = new MainView({
          editView: editView,
          actionMenuView: actionMenuView,
          viewSourceView: viewSourceView,
          appendChildView: appendChildView,
          copyMoveView: copyMoveView
        });

        var editController = new EditController({
          view: editView
        });

        var viewSourceController = new ViewSourceController({
          view: viewSourceView
        });

        var appendChildController = new AppendChildController({
          view: appendChildView
        });

        var copyMoveController = new CopyMoveController({
          view: copyMoveView
        });

        var actionMenuController = new ActionMenuController({
          view: actionMenuView,
          editController: editController,
          viewSourceController: viewSourceController,
          appendChildController: appendChildController,
          copyMoveController: copyMoveController
        });

        _this2.view = mainView;
        mainView.init(_this2);

        _this2.actionMenuController = actionMenuController;

        editController.mainController = _this2;
        viewSourceController.mainController = _this2;
        actionMenuController.mainController = _this2;
        appendChildController.mainController = _this2;
        copyMoveController.mainController = _this2;

        console.log("[Customizer] Lazy-initialized modules");
        resolve();
      });

      return this._loadedModules;
    };

    MainController.prototype._waitToBeOpened = function () {
      var _this3 = this;
      Gesture.detect(this.openGesture).then(function () {
        return _this3.open();
      });
    };

    MainController.prototype._waitToBeClosed = function () {
      var _this4 = this;
      Gesture.detect(this.closeGesture).then(function () {
        return _this4.close();
      });
    };

    MainController.prototype._checkOpenFromLauncher = function () {
      var _this5 = this;
      var requestXHR = new XMLHttpRequest();
      requestXHR.open("GET", "http://localhost:3215/request", true);
      requestXHR.onload = function () {
        if (requestXHR.responseText !== _this5.manifestURL) {
          return;
        }

        _this5.open();

        var confirmXHR = new XMLHttpRequest();
        confirmXHR.open("GET", "http://localhost:3215/confirm?url=" + _this5.manifestURL, true);

        console.log("Sending HTTP request confirmation to Customizer Launcher");
        confirmXHR.send();
      };

      console.log("Sending HTTP request check to Customizer Launcher");
      requestXHR.send();
    };

    MainController.prototype.open = function () {
      var _this6 = this;
      if (this._isOpen) {
        return;
      }

      this._isOpen = true;

      this._lazyLoadModules().then(function () {
        return _this6.view.open();
      }).then(function () {
        _this6.view.customizer.setRootNode(document.documentElement);
        _this6._waitToBeClosed();
      });
    };

    MainController.prototype.close = function () {
      var _this7 = this;
      if (!this._isOpen) {
        return;
      }

      this.view.close().then(function () {
        return _this7._waitToBeOpened();
      });

      this._isOpen = false;
    };

    MainController.prototype.openAddonManager = function () {
      var activity = new MozActivity({
        name: "configure",
        data: {
          target: "device",
          section: "addons",
          options: {
            manifestURL: this.manifestURL
          }
        }
      });

      activity.onerror = function (e) {
        console.error("Error opening \"Settings > Add-ons\" panel", e);
      };
    };

    _classProps(MainController, null, {
      openGesture: {
        get: function () {
          return {
            type: "swipe", // Swipe:
            numFingers: 2, // with two fingers,
            startRegion: { // from bottom 30% of the screen (10% for SHB),
              x0: 0, y0: 0.8, x1: 1, y1: 1.1
            },
            endRegion: { // up into the top 75% of the screen,
              x0: 0, y0: 0, x1: 1, y1: 0.75
            },
            maxTime: 1000 };
        }
      },
      closeGesture: {
        get: function () {
          return {
            type: "swipe", // Swipe:
            numFingers: 2, // with two fingers,
            startRegion: { // from the middle ~half of the screen
              x0: 0, y0: 0.3, x1: 1, y1: 0.7
            },
            endRegion: { // down into the bottom quarter of the screen
              x0: 0, y0: 0.75, x1: 1, y1: 1
            },
            maxTime: 1000 };
        }
      }
    });

    return MainController;
  })(Controller);

  exports["default"] = MainController;
});