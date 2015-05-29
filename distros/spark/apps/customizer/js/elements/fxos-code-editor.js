define(["exports"], function (exports) {
  "use strict";

  (function (window) {
    "use strict";

    var proto = Object.create(HTMLElement.prototype);

    var template = "<style>\n  .container {\n    position: relative;\n    width: 100%;\n    height: 100%;\n  }\n  .line-numbers {\n    background: #95368c;\n    color: #fff;\n    font-family: Consolas,Monaco,\"Andale Mono\",monospace;\n    font-size: 14px;\n    line-height: 1.2em;\n    position: absolute;\n    padding: 0 2px;\n    top: 0;\n    left: 0;\n    width: 28px;\n    height: 100%;\n    overflow: hidden;\n  }\n  textarea {\n    background: #000;\n    border: none;\n    color: #fff;\n    font-family: Consolas,Monaco,\"Andale Mono\",monospace;\n    font-size: 14px;\n    line-height: 1.2em;\n    position: absolute;\n    top: 0;\n    left: 32px;\n    width: calc(100% - 32px);\n    height: 100%;\n    margin: 0;\n    padding: 0;\n    -moz-user-select: text !important;\n  }\n  .line-numbers,\n  textarea {\n    font-family: Consolas,Monaco,\"Andale Mono\",monospace;\n    font-size: 14px;\n    line-height: 1.2em;\n  }\n</style>\n<div class=\"container\">\n  <div class=\"line-numbers\"></div>\n  <textarea wrap=\"off\"></textarea>\n</div>";

    proto.createdCallback = function () {
      var _this = this;
      var value = this.innerHTML;

      this.shadow = this.createShadowRoot();
      this.shadow.innerHTML = template;

      this.lineNumbers = this.shadow.querySelector(".line-numbers");

      this.textarea = this.shadow.querySelector("textarea");
      this.textarea.value = value;

      this.textarea.addEventListener("keyup", function () {
        _this.dispatchEvent(new CustomEvent("change"));
        updateLineNumbers(_this);
      });

      this.textarea.addEventListener("scroll", function () {
        _this.lineNumbers.scrollTop = _this.textarea.scrollTop;
      });
    };

    Object.defineProperty(proto, "value", {
      get: function () {
        return this.textarea.value;
      },

      set: function (value) {
        this.textarea.value = value;
        this.dispatchEvent(new CustomEvent("change"));
        updateLineNumbers(this);
      }
    });

    function updateLineNumbers(element) {
      var html = "";

      var lines = element.value.split("\n").length;
      if (lines === element.lineNumbers.childElementCount) {
        return;
      }

      for (var i = 1; i <= lines; i++) {
        html += "<div>" + i + "</div>";
      }

      element.lineNumbers.innerHTML = html;
      element.lineNumbers.scrollTop = element.textarea.scrollTop;
    }

    try {
      document.registerElement("fxos-code-editor", { prototype: proto });
    } catch (e) {
      if (e.name !== "NotSupportedError") {
        throw e;
      }
    }
  })(window);
});