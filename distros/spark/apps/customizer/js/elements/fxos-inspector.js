define(["exports"], function (exports) {
  "use strict";

  (function (window) {
    "use strict";

    var HTML_ESCAPE_CHARS = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
      "/": "&#x2F;"
    };

    var CONSTANT_PROPERTY_REGEX = /^[A-Z_]+$/;

    var proto = Object.create(HTMLElement.prototype);

    var template = "<style scoped>\n  [data-icon]:before {\n    font-family: \"gaia-icons\";\n    content: attr(data-icon);\n    display: inline-block;\n    font-weight: 500;\n    font-style: normal;\n    text-decoration: inherit;\n    text-transform: none;\n    text-rendering: optimizeLegibility;\n    font-size: 30px;\n  }\n  [flex] {\n    display: flex;\n    justify-content: space-between;\n    padding: 0 5px;\n  }\n  [flex] > * {\n    flex: 1 1 auto;\n    margin-right: 5px;\n    margin-left: 5px;\n  }\n  #container {\n    box-sizing: border-box;\n    position: relative;\n    width: 100%;\n    height: 100%;\n    overflow-x: hidden;\n    overflow-y: auto;\n  }\n  gaia-list a {\n    position: relative;\n    text-decoration: none;\n  }\n  gaia-list [hidden] {\n    display: none;\n  }\n  gaia-list h3 {\n    font-size: 18px;\n    max-width: calc(100% - 2em);\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n  gaia-list [data-icon] {\n    position: absolute;\n    padding: 1.6em 1em;\n    top: 0;\n    right: 0;\n  }\n  gaia-list .value {\n    color: #00aac5;\n  }\n  fxos-code-editor {\n    display: block;\n    width: 100%;\n    height: calc(100% - 100px);\n  }\n</style>\n<div id=\"container\"></div>\n<gaia-dialog-prompt id=\"new-attribute-name\">\n  Enter new attribute name\n</gaia-dialog-prompt>";

    proto.createdCallback = function () {
      var _this = this;
      this.shadow = this.createShadowRoot();
      this.shadow.innerHTML = template;

      this.container = this.shadow.querySelector("#container");
      this.newAttributeName = this.shadow.querySelector("#new-attribute-name");

      this.keyPath = [];

      // Handle all clicks within this component.
      this.container.addEventListener("click", function (evt) {
        // Handle case where <a href> was clicked.
        var target = evt.target.closest("a");
        if (target) {
          evt.preventDefault();

          // Handle case where <i data-action="remove"> was clicked.
          if (evt.target.dataset.action === "remove") {
            _this._handleRemoveAttributeClick(target);
          }

          // Otherwise, treat as regular list item click.
          else {
            _this._handleListItemClick(target);
          }
          return;
        }

        // Handle case where <gaia-button> was clicked.
        target = evt.target.closest("gaia-button");
        if (target) {
          evt.preventDefault();
          _this._handleButtonClick(target);
          return;
        }
      });

      // Filter the list of properties 500ms after a keypress
      // in the <gaia-text-input> search box.
      this.container.addEventListener("keyup", function (evt) {
        var textInput = evt.target.closest("gaia-text-input");
        if (!textInput) {
          return;
        }

        clearTimeout(_this._searchTimeout);
        _this._searchTimeout = setTimeout(function () {
          var value = textInput.value.toLowerCase();
          var items = [].slice.apply(_this.container.querySelectorAll("gaia-list a[data-search]"));

          // Toggle each list items' [hidden] attribute if the search text
          // isn't blank and the items' [data-search] value contains the
          // current search text.
          items.forEach(function (i) {
            return i.hidden = value && i.dataset.search.indexOf(value) === -1;
          });
        }, 500);
      });

      // Automatically set focus to the input box when the
      // <gaia-dialog-prompt> is opened.
      this.newAttributeName.addEventListener("opened", function () {
        _this.newAttributeName.els.input.focus();
      });

      // Reset the <gaia-dialog-prompt> value when closed.
      this.newAttributeName.addEventListener("closed", function () {
        _this.newAttributeName.els.input.value = "";
      });

      // Create a new attribute when the <gaia-dialog-prompt>
      // is submitted.
      this.newAttributeName.els.submit.addEventListener("click", function () {
        try {
          var name = _this.newAttributeName.els.input.value;
          var attribute = document.createAttribute(name);

          _this.target.setNamedItem(attribute);

          _this.dispatchEvent(new CustomEvent("createattribute", {
            detail: JSON.stringify({
              keyPath: _this.keyPath,
              expression: "['" + _this.keyPath.join("']['") + "']",
              name: name
            })
          }));
        } catch (e) {
          window.alert("Invalid attribute name");
          return;
        }

        _this.render();
      });
    };

    proto.render = function () {
      var _this2 = this;
      clearTimeout(this._searchTimeout);

      this.target = this.rootTarget;
      this.keyPath.forEach(function (key) {
        return _this2.target = _this2.target[key];
      });

      this.container.innerHTML = renderTargetPage(this.target, this.keyPath.length === 0).innerHTML;
      this.container.scrollTo(0, 0);
    };

    proto.setRootTarget = function (rootTarget) {
      this.rootTarget = rootTarget;
      this.target = this.rootTarget;

      this.keyPath = [];
      this.render();
    };

    proto._handleButtonClick = function (target) {
      var _this3 = this;
      switch (target.dataset.action) {
        case "cancel":
          this.keyPath.pop();
          break;
        case "save":
          (function () {
            var value = _this3.container.querySelector("fxos-code-editor").value;
            var target = _this3.rootTarget;

            _this3.keyPath.forEach(function (key, index) {
              if (index < _this3.keyPath.length - 1) {
                target = target[key];
                return;
              }

              target[key] = value;
            });

            _this3.dispatchEvent(new CustomEvent("save", {
              detail: JSON.stringify({
                keyPath: _this3.keyPath,
                expression: "['" + _this3.keyPath.join("']['") + "']",
                value: value
              })
            }));

            _this3.keyPath.pop();
          })();
          break;
        default:
          break;
      }

      this.render();
    };

    proto._handleRemoveAttributeClick = function (target) {
      var name = target.getAttribute("href");
      this.target.removeNamedItem(name);

      this.dispatchEvent(new CustomEvent("removeattribute", {
        detail: JSON.stringify({
          keyPath: this.keyPath,
          expression: "['" + this.keyPath.join("']['") + "']",
          name: name
        })
      }));

      this.render();
    };

    proto._handleListItemClick = function (target) {
      // If the link clicked has an `href` pointing
      // to "../", go back to the previous level in
      // the key path.
      var href = target.getAttribute("href");
      if (href === "../") {
        this.keyPath.pop();
      }

      // Show "Create New Attribute" prompt.
      else if (href === "#add-attribute") {
        this.newAttributeName.open();
      }

      // Otherwise, push the next part of the key path.
      else {
        this.keyPath.push(href);
      }

      this.render();
    };

    /**
     * Helper function for determining the type of
     * page to render for the current target (editor
     * or list).
     */
    function renderTargetPage(target, isRoot) {
      // If the target is not an object, assume that
      // it is editable and render the editor page.
      if (typeof target !== "object") {
        return renderTargetEditor(target);
      }

      // Otherwise, the target is an enumerable object
      // and we can render the list page.
      return renderTargetList(target, isRoot);
    }

    /**
     * Helper for rendering the editor page.
     */
    function renderTargetEditor(target) {
      var page = document.createElement("section");
      page.innerHTML = "<fxos-code-editor>" + target + "</fxos-code-editor>\n<section flex>\n  <gaia-button data-action=\"cancel\">Cancel</gaia-button>\n  <gaia-button data-action=\"save\">Save</gaia-button>\n</section>";

      return page;
    }

    /**
     * Helper for rendering the list page.
     */
    function renderTargetList(target, isRoot) {
      var list = document.createElement("gaia-list");

      if (!isRoot) {
        list.appendChild(renderBackItem());
      }

      if (target instanceof window.NamedNodeMap) {
        list.appendChild(renderAddAttributeItem());
      }

      getSortedProperties(target).forEach(function (property) {
        list.appendChild(renderTargetListItem(target, property));
      });

      var page = document.createElement("section");
      page.innerHTML = "<section flex>\n  <gaia-text-input type=\"search\" placeholder=\"Search Properties\"></gaia-text-input>\n</section>\n" + list.outerHTML;

      return page;
    }

    /**
     * Helper for rendering a list item.
     */
    function renderTargetListItem(target, property) {
      var value = target[property];
      if (value instanceof window.Attr) {
        value = "'" + escapeHTML(value.value) + "'";
      } else if (typeof value === "string") {
        value = "'" + escapeHTML(value) + "'";
      }

      var a = document.createElement("a");
      a.href = property;
      a.dataset.search = property.toLowerCase();
      a.innerHTML = "<h3>" + property + " = <span class=\"value\">" + value + "</span></h3>";

      // Append "X" button to remove attributes.
      if (target instanceof window.NamedNodeMap) {
        a.innerHTML += "<i data-icon=\"close\" data-action=\"remove\"></i>";
      }

      return a;
    }

    /**
     * Helper for rendering the "Up One Level [..]" list item.
     */
    function renderBackItem() {
      var a = document.createElement("a");
      a.href = "../";
      a.innerHTML = "<h3>Up One Level [..]</h3>";

      return a;
    }

    /**
     * Helper for rendering the "Create New Attribute"
     * list item.
     */
    function renderAddAttributeItem() {
      var a = document.createElement("a");
      a.href = "#add-attribute";
      a.innerHTML = "<h3>Create New Attribute</h3>\n<i data-icon=\"add\"></i>";

      return a;
    }

    /**
     * Helper for enumerating and sorting all direct
     * properties for the specified target object.
     * This also handles an `attributes` object as a
     * special case and returns a sorted array of
     * attribute names instead of an array-indexed
     * list of `Attr` objects.
     */
    function getSortedProperties(target) {
      var properties = [];

      // If the `target` is a `NamedNodeMap` (attributes),
      // enumerate the attributes and push their names
      // instead of treating it as properties.
      if (target instanceof window.NamedNodeMap) {
        for (var _iterator = target[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
          var attr = _step.value;
          properties.push(attr.name);
        }

        properties = properties.sort();
      }

      // Otherwise, emumerate the properties as usual.
      else {
        for (var property in target) {
          // Omit invalid properties.
          if (!isValidProperty(target, property)) {
            continue;
          }

          // Omit constants.
          if (CONSTANT_PROPERTY_REGEX.test(property)) {
            continue;
          }

          // Omit native functions unless the target object
          // directly contains them (e.g. `Element.prototype`).
          if (!target.hasOwnProperty(property) && isNativeFunction(target[property])) {
            continue;
          }

          properties.push(property + "");
        }

        // Explicitly add the `nodeValue`, `textContent` and
        // `value` properties for empty attributes so their
        // values can be set.
        if (target instanceof window.Attr && !target.value) {
          properties.push("nodeValue");
          properties.push("textContent");
          properties.push("value");
        }

        properties = properties.sort();

        // Append `__proto__` property to end of array after
        // sorting (if the object has one).
        if (target.__proto__) {
          properties.push("__proto__");
        }
      }

      return properties;
    }

    /**
     * Escapes HTML strings so that <, > and quotation
     * characters are properly rendered in the list items.
     */
    function escapeHTML(html) {
      return html.replace(/[&<>"'\/]/g, function (s) {
        return HTML_ESCAPE_CHARS[s];
      });
    }

    /**
     * Determines if the specified property is valid for
     * the target object.
     * NOTE: The `try`/`catch` is necessary to catch
     * exceptions for properties that cannot be directly
     * accessed.
     */
    function isValidProperty(target, property) {
      try {
        return !!target[property];
      } catch (e) {
        return false;
      }
    }

    /**
     * Determines if a function is native. Native functions
     * are filtered from the list items unless they are direct
     * members of the current target object. This is to
     * provide consistency with object/property inspection on
     * desktop DevTools.
     */
    function isNativeFunction(value) {
      return typeof value === "function" && !! ~value.toString().indexOf("[native code]");
    }

    try {
      document.registerElement("fxos-inspector", { prototype: proto });
    } catch (e) {
      if (e.name !== "NotSupportedError") {
        throw e;
      }
    }
  })(window);
});