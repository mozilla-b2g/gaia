define(["exports"], function (exports) {
  "use strict";

  (function (window) {
    "use strict";

    var proto = Object.create(HTMLElement.prototype);

    var template = "<style>\n[data-icon]:before,\n.ligature-icons {\n  font-family: \"gaia-icons\";\n  content: attr(data-icon);\n  display: inline-block;\n  font-weight: 500;\n  font-style: normal;\n  text-decoration: inherit;\n  text-transform: none;\n  text-rendering: optimizeLegibility;\n  font-size: 30px;\n  -webkit-font-smoothing: antialiased;\n}\n\ngaia-dom-tree {\n  width: 100%;\n  height: 100%;\n}\n\n.pin {\n  position: absolute;\n  top: 0;\n  right: 0;\n  margin: 1rem !important;\n\n  opacity: 1;\n\n  transition: opacity 0.5s ease-in-out;\n}\n\n.pin.scrolling {\n  pointer-events: none;\n\n  opacity: 0;\n}\n</style>\n<gaia-button circular class=\"pin\" data-action=\"settings\">\n  <i data-icon=\"settings\"></i>\n</gaia-button>\n<gaia-dom-tree></gaia-dom-tree>\n<gaia-css-inspector></gaia-css-inspector>\n<gaia-modal>\n  <p>lorem ipsum...</p>\n</gaia-modal>";

    proto.createdCallback = function () {
      this.shadow = this.createShadowRoot();
      this.shadow.innerHTML = template;

      this.settingsButton = this.shadow.querySelector("[data-action=\"settings\"]");
      this.gaiaDomTree = this.shadow.querySelector("gaia-dom-tree");
      this.gaiaCssInspector = this.shadow.querySelector("gaia-css-inspector");
      this.gaiaModal = this.shadow.querySelector("gaia-modal");

      this.settingsButton.addEventListener("click", this._handleMenuAction.bind(this));
      this.gaiaDomTree.addEventListener("click", this._handleSelected.bind(this));
      this.gaiaDomTree.addEventListener("longpressed", this._handleLongPressed.bind(this));

      this._watchScrolling();

      this.gaiaDomTree.addEventListener("contextmenu", function (evt) {
        evt.stopPropagation();
      });

      this._rootNodeClickHandler = this._handleClick.bind(this);
    };

    proto.setRootNode = function (rootNode) {
      // If we already have a root node defined, disconnect from it first
      if (this._root) {
        this.unwatchChanges();
        this.gaiaDomTree.setRoot(null);
        this.gaiaDomTree.render();
        this._root.removeEventListener("click", this._rootNodeClickHandler);
        this._root = null;
      }

      // If we've got a new root node, set that one up
      if (rootNode) {
        this._root = rootNode;
        rootNode.addEventListener("click", this._rootNodeClickHandler);
        this.gaiaDomTree.setRoot(rootNode);
        this.gaiaDomTree.render();
        this.watchChanges();
      }
    };

    proto._watchScrolling = function () {
      var _this = this;
      this.gaiaDomTree.shadowRoot.addEventListener("scroll", function (evt) {
        if (_this._scrollTimeout) {
          clearTimeout(_this._scrollTimeout);
        }

        _this._scrollTimeout = setTimeout(function () {
          _this.settingsButton.classList.remove("scrolling");
        }, 500);

        _this.settingsButton.classList.add("scrolling");
      }, true);
    };

    proto._shadowContains = function (el) {
      var customizerRootView = document.body.querySelector(".fxos-customizer-main-view");

      if (!el || el == document.documentElement) {
        return false;
      } else if (el == customizerRootView) {
        return true;
      }

      return this._shadowContains(el.parentNode || el.host);
    };

    proto.watchChanges = function () {
      var _this2 = this;
      var OBSERVER_CONFIG = {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true
      };

      this._observer = new MutationObserver(function (mutations) {
        // Only re-render if a mutation occurred in the app itself, and is
        // outside of the customizer addon. This depends on the customizer
        // root element having the class "fxos-customizer-main-view"
        for (var i = mutations.length - 1; i >= 0; i--) {
          if (!_this2._shadowContains(mutations[i].target)) {
            var selectedNode = _this2.gaiaDomTree.selectedNode;
            _this2.gaiaDomTree.render();
            _this2.select(selectedNode);
            return;
          }
        }
      });

      this._observer.observe(this._root, OBSERVER_CONFIG);
    };

    proto.unwatchChanges = function () {
      this._observer.disconnect();
      this._observer = null;
    };

    proto.select = function (node) {
      this.gaiaDomTree.select(node);
    };

    proto._handleMenuAction = function (e) {
      var action = e.target.dataset.action;
      if (action) {
        console.log(action);
        this.dispatchEvent(new CustomEvent("menu", {
          detail: action
        }));
      }
    };

    proto._handleSelected = function (e) {
      e.stopPropagation();

      var selectedNode = this.gaiaDomTree.selectedNode;
      if (!selectedNode) {
        return;
      }

      this._selected = (selectedNode.nodeType === Node.TEXT_NODE) ? selectedNode.parentNode : selectedNode;

      this.dispatchEvent(new CustomEvent("selected", {
        detail: this._selected
      }));
    };

    proto._handleLongPressed = function (e) {
      this._handleSelected(e);

      this.dispatchEvent(new CustomEvent("action", {
        detail: this._selected
      }));
    };

    proto._handleClick = function (e) {
      if (e.target === this.gaiaDomTree) {
        return;
      }

      this.select(e.target);
    };

    try {
      document.registerElement("fxos-customizer", { prototype: proto });
    } catch (e) {
      if (e.name !== "NotSupportedError") {
        throw e;
      }
    }
  })(window);
});