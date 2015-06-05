define(["exports"], function (exports) {
  "use strict";

  (function (window) {
    "use strict";

    var template = "<style>\n.modal-dialog {\n  background: #2d2d2d;\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  overflow: hidden;\n  z-index: 100;\n}\n.modal-dialog > section {\n  color: #FAFAFA;\n  padding: 80px 25px 0;\n  -moz-box-sizing: padding-box;\n  font-size: 22px;\n  line-height: 30px;\n  font-weight: 300;\n  width: 100%;\n  display: inline-block;\n  overflow-y: scroll;\n  max-height: 100%;\n  vertical-align: middle;\n}\n.modal-dialog h1 {\n  font-size: 19px;\n  font-weight: 400;\n  line-height: 28px;\n  color: #fff;\n  margin: 0;\n  padding-top: 10px;\n}\n/* Menu & buttons setup */\n.modal-dialog menu {\n  padding: 15px;\n  background: #4d4d4d;\n  display: flex;\n  overflow: hidden;\n  position: absolute;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  margin: 0;\n}\n.modal-dialog p {\n  word-wrap: break-word;\n  margin: 10px 0 0;\n  padding: 10px 0;\n  border-top: 0.1rem solid #686868;\n  line-height: 30px;\n}\n.modal-dialog p > span {\n  padding-top: 25px;\n  display: block;\n}\n.modal-dialog menu button {\n  font-family: sans-serif;\n  font-style: italic;\n  width: 100%;\n  height: 40px;\n  margin: 0 0 10px;\n  padding: 0 2px;\n  font-size: 16px;\n  line-height: 40px;\n  -moz-box-sizing: border-box;\n  display: inline-block;\n  vertical-align: middle;\n  background: #d8d8d8;\n  border: none;\n  border-radius: 20px;\n  color: #333;\n  text-align: center;\n  -moz-margin-end: 10px;\n}\n/* Pressed */\n.modal-dialog menu button:active {\n  background: #00aacc;\n  color: #fff;\n}\n.modal-dialog menu button:last-child {\n  -moz-margin-end: 0;\n}\n.hidden {\n  display: none;\n}\n</style>\n<div class=\"modal-dialog hidden\">\n  <section>\n    <h1>Developer Mode not enabled</h1>\n    <p>To gain access to this and other customization features,\n    you must enable Developer Mode.\n    <span>Click Continue to go to Settings app and enable Developer Mode.</span>\n    </p>\n  </section>\n  <menu>\n    <button class=\"cancel\">Cancel</button>\n    <button class=\"continue\">Continue</button>\n  </menu>\n</div>";

    var proto = Object.create(HTMLElement.prototype);

    proto.createdCallback = function () {
      var _this = this;
      this.shadow = this.createShadowRoot();
      this.shadow.innerHTML = template;
      this.modalDialog = this.shadow.querySelector(".modal-dialog");
      this.cancelButton = this.shadow.querySelector(".cancel");
      this.continueButton = this.shadow.querySelector(".continue");

      this.cancelButton.addEventListener("click", this.handleCancel.bind(this));
      this.continueButton.addEventListener("click", this.handleContinue.bind(this));

      // If dev mode perf is enabled emit 'enabled' event else
      // show the confirm modal dialog
      navigator.getFeature("dom.apps.developer_mode").then(function (enabled) {
        if (enabled) {
          // Emit Enabled Event
          _this.dispatchEvent(new CustomEvent("enabled"));
        } else {
          _this.modalDialog.classList.remove("hidden");
        }
      });
    };

    proto.handleCancel = function (e) {
      window.close();
    };

    proto.handleContinue = function (e) {
      // Invoke Settings activity to enable developer mode
      // XXX: Bug 1163889
      var activity = new window.MozActivity({
        name: "configure",
        data: {
          target: "device",
          section: "full-developer-mode"
        }
      });
      activity.onerror = function () {
        console.log("Settings configure activity error:", activity.error.name);
      };
    };

    try {
      document.registerElement("fxos-dev-mode-dialog", { prototype: proto });
    } catch (e) {
      if (e.name !== "NotSupportedError") {
        throw e;
      }
    }
  })(window);
});