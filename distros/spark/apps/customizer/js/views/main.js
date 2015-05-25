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

  /* global View */

  var mainViewTemplate = "<style scoped>\n  .fxos-customizer-main-view {\n    font-size: 14px;\n\n    /** Grey Colors\n     ---------------------------------------------------------*/\n\n    --color-alpha: #333333;\n    --color-beta: #ffffff;\n    --color-gamma: #4d4d4d;\n    --color-delta: #5f5f5f;\n    --color-epsilon: #858585;\n    --color-zeta: #a6a6a6;\n    --color-eta: #c7c7c7;\n    --color-theta: #e7e7e7;\n    --color-iota: #f4f4f4;\n\n  /** Brand Colors\n   ---------------------------------------------------------*/\n\n    --color-darkblue: #00539f;\n    --color-blue: #00caf2;\n    --color-turquoise: #27c8c2;\n    --color-darkorange: #e66000;\n    --color-orange: #ff9500;\n    --color-yellow: #ffcb00;\n    --color-violet: #c40c84;\n\n    --color-warning: #fbbd3c;\n    --color-destructive: #e2443a;\n    --color-preffered: #00ba91;\n\n    /** Background\n     ---------------------------------------------------------*/\n\n    --background: var(--color-alpha);\n    --background-plus: var(--color-gamma);\n    --background-minus: #2B2B2B;\n    --background-minus-minus: #1a1a1a;\n\n    /** Borders\n     ---------------------------------------------------------*/\n\n    --border-color: var(--color-gamma);\n\n    /** Highlight Color\n     ---------------------------------------------------------*/\n\n    --highlight-color: var(--color-blue);\n\n    /** Text Color\n     ---------------------------------------------------------*/\n\n    --text-color: var(--color-beta);\n    --text-color-minus: var(--color-eta);\n\n    /** Button\n     ---------------------------------------------------------*/\n\n    --button-background: var(--background-plus);\n\n    /** Links\n     ---------------------------------------------------------*/\n\n    --link-color: var(--highlight-color);\n\n    /** Inputs\n     ---------------------------------------------------------*/\n\n    --input-background: var(--background-plus);\n    --input-color: var(--color-alpha);\n    --input-clear-background: #909ca7;\n\n    /** Buttons\n     ---------------------------------------------------------*/\n\n     --button-box-shadow: none;\n     --button-box-shadow-active: none;\n\n    /** Header\n     ---------------------------------------------------------*/\n\n    --header-background: var(--background);\n    --header-icon-color: var(--text-color);\n    --header-button-color: var(--highlight-color);\n    --header-disabled-button-color: rgba(255,255,255,0.3);\n\n    /** Text Input\n     ---------------------------------------------------------*/\n\n    --text-input-background: var(--background-minus);\n\n    /** Switch\n     ---------------------------------------------------------*/\n\n    --switch-head-border-color: var(--background-minus-minus);\n    --switch-background: var(--background-minus-minus);\n\n    /** Checkbox\n     ---------------------------------------------------------*/\n\n    --checkbox-border-color: var(--background-minus-minus);\n  }\n\n  div.fxos-customizer-container {\n    background-color: var(--background);\n    position: fixed;\n    left: 0;\n    right: 0;\n    top: 100%; /* off-screen by default, animated translate to show and hide */\n    height: 50vh;\n    border-top: 1px solid #ccc;\n    /*\n     * this needs to go on top of the regular app, but below\n     * gaia-modal and gaia-dialog which we override elsewhere.\n     */\n    z-index: 10000000;\n\n    /* We show and hide this with an animated transform */\n    transition: transform 150ms;\n  }\n\n  /*\n   * Add this show class to animate the container onto the screen,\n   * and remove it to animate the container off.\n   */\n  .fxos-customizer-container.show {\n    transform: translateY(-100%);\n  }\n</style>\n<style>\n/*\n * These styles need to be applied globally to the app when the customizer\n * is displayed so that the user can scroll to see all of the app even\n * with the customizer taking up the bottom half of the screen.\n *\n * Note that this stylesheet is not scoped and is disabled by default.\n */\nhtml, body {\n  overflow-y: initial !important;\n}\n\nbody {\n  padding-bottom: 50vh !important;\n}\n</style>\n<div class=\"fxos-customizer-container\"><fxos-customizer></fxos-customizer></div>\n<div class=\"fxos-customizer-child-views\">\n<fxos-customizer-highlighter></fxos-customizer-highlighter>\n</div>";

  var MainView = (function (View) {
    var MainView = function MainView(options) {
      View.call(this, options);

      // Give this view a unique ID.
      this.el.id = "customizer-" + Date.now();
      this.el.className = "fxos-customizer-main-view";

      this.render();
    };

    _extends(MainView, View);

    MainView.prototype.init = function (controller) {
      var _this = this;
      View.prototype.init.call(this, controller);

      this.container = this.$("div.fxos-customizer-container");
      this.childViews = this.$("div.fxos-customizer-child-views");
      this.customizer = this.$("fxos-customizer");
      this.highlighter = this.$("fxos-customizer-highlighter");

      // We put all of the other view elements that the app needs into the
      // childViews container, so that we can add and remove them all at once.
      this.childViews.appendChild(this.actionMenuView.el);
      this.childViews.appendChild(this.editView.el);
      this.childViews.appendChild(this.viewSourceView.el);
      this.childViews.appendChild(this.appendChildView.el);
      this.childViews.appendChild(this.copyMoveView.el);

      // Hide this view from the DOM tree.
      this.customizer.gaiaDomTree.filter = "#" + this.el.id;

      this.on("menu", "fxos-customizer", function () {
        return _this.controller.openAddonManager();
      });

      this.on("action", "fxos-customizer", function (evt) {
        _this.customizer.unwatchChanges();
        _this.controller.actionMenuController.open(evt.detail);

        setTimeout(_this.customizer.watchChanges.bind(_this.customizer), 1000);
      });

      this.on("selected", "fxos-customizer", function (evt) {
        _this.highlighter.highlight(evt.detail);
      });
    };

    MainView.prototype.template = function () {
      return mainViewTemplate;
    };

    MainView.prototype._addToBody = function () {
      document.body.appendChild(this.el);
    };

    MainView.prototype._removeFromBody = function () {
      document.body.removeChild(this.el);
    };

    MainView.prototype.open = function () {
      var _this2 = this;
      // Add the fxos-customizer element and the other elements we need
      this._addToBody();

      return new Promise(function (resolve, reject) {
        window.requestAnimationFrame(function () {
          // Start the opening animation for the customizer
          _this2.container.classList.add("show");
        });

        // Wait for the animation to end, then:
        var listener = function () {
          _this2.container.removeEventListener("transitionend", listener);
          // Resolve the promise
          resolve();
        };

        _this2.container.addEventListener("transitionend", listener);
      });
    };

    MainView.prototype.close = function () {
      var _this3 = this;
      return new Promise(function (resolve, reject) {
        window.requestAnimationFrame(function () {
          // Start hiding the customizer with an animated transition
          _this3.container.classList.remove("show");
          // Erase any highlight right away
          _this3.highlighter.highlight(null);
          // Scroll the app to the top before beginning the transition
          // so we don't see the blank white padding as the panel slides down
          document.body.scrollIntoView();
        });

        // Wait for the transition to end, then:
        var listener = function () {
          _this3.container.removeEventListener("transitionend", listener);
          // Remove all the unnecessary elements from the document
          _this3._removeFromBody();
          // And resolve the promise
          resolve();
        };

        _this3.container.addEventListener("transitionend", listener);
      });
    };

    return MainView;
  })(View);

  exports["default"] = MainView;
});