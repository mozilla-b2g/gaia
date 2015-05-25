define(["exports"], function (exports) {
  "use strict";

  (function (window) {
    "use strict";

    var shadowHTML = "<style scoped>\n.overlay {\n  display: none;\n  position: absolute;\n  box-sizing: border-box;\n  pointer-events: none;\n  z-index: 9999999; /* above the app, but below the other customizer elements */\n  background-color: #00caf2;\n  border: 2px dotted #fff;\n  outline: 1px solid #00caf2;\n  opacity: 0.75;\n}\n.label {\n  background-color: rgba(0, 0, 0, 0.5);\n  border-bottom-right-radius: 2px;\n  color: #fff;\n  font-family: 'FiraSans';\n  font-size: 10px;\n  line-height: 1.2em;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  display: inline-block;\n  position: absolute;\n  padding: 0 2px;\n  top: 0;\n  left: 0;\n  max-width: 100%;\n  overflow: hidden;\n}\n</style>\n<div class=\"overlay\">\n  <div class=\"label\"></div>\n</div>";

    var proto = Object.create(HTMLElement.prototype);

    proto.createdCallback = function () {
      this.shadow = this.createShadowRoot();
      this.shadow.innerHTML = shadowHTML;
      this.overlay = this.shadow.querySelector(".overlay");
      this.label = this.shadow.querySelector(".label");
    };

    proto.highlight = function (element) {
      // Figure out where the element is
      var rect = element && element.getBoundingClientRect();

      // If the element has zero size, hide the highlight
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        this.overlay.style.display = "none";
      } else {
        // Otherwise, highlight the element.
        // Note that we use add the document scroll offsets to the element
        // coordinates to get document coordinates instead of screen coordinates.
        this.overlay.style.left = (rect.left + window.pageXOffset) + "px";
        this.overlay.style.top = (rect.top + window.pageYOffset) + "px";
        this.overlay.style.width = rect.width + "px";
        this.overlay.style.height = rect.height + "px";
        this.overlay.style.display = "block";

        // Set the label to properly identify the element.
        this.label.textContent = element.tagName;
        if (element.id) {
          this.label.textContent += "#" + element.id;
        }

        // And try to move the element so that it is on screen
        element.scrollIntoView({ behavior: "smooth" });
      }
    };

    proto.hide = function () {
      this.overlay.style.display = "none";
    };

    try {
      document.registerElement("fxos-customizer-highlighter", { prototype: proto });
    } catch (e) {
      if (e.name !== "NotSupportedError") {
        throw e;
      }
    }
  })(window);
});