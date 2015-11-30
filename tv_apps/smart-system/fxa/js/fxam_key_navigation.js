/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global KeyNavigationAdapter */
/* global SpatialNavigator */
/* exported FxaModuleKeyNavigation */

'use strict';

(function(exports) {

  function getElements(elementNames) {
    var elements = [];

    elementNames.forEach(selector => {
      var element = document.querySelector(selector);
      if (element) {
        elements.push(element);
      }
    });

    return elements;
  }

  var FxaModuleKeyNavigation = {

    enabled: false,

    spatialNavigator: null,

    keyNavigationAdapter: null,

    init(elementNames) {
      var elements = elementNames ? getElements(elementNames) : null;

      this.spatialNavigator = new SpatialNavigator(elements, {
        navigableFilter: elem => {
          return !((elem.offsetWidth <= 0 && elem.offsetHeight <= 0) ||
                  elem.disabled);
        }
      });

      this.spatialNavigator.on('focus', elem => {
        document.activeElement.blur();
        elem.focus();
      });

      this.keyNavigationAdapter = new KeyNavigationAdapter();

      this.keyNavigationAdapter.init();

      this.keyNavigationAdapter.on('move', key => {
        if (!this.enabled) {
          return;
        }

        var element = this.spatialNavigator.getFocusedElement();
        // Check if the key is pressed inside an email or password input element
        if (element.tagName === 'INPUT' &&
            (element.type === 'email' || element.type === 'password') &&
            element.value.length > 0 &&
            element.selectionStart === element.selectionEnd &&
            ((key === 'left' && element.selectionStart > 0) ||
            (key === 'right' &&
             element.selectionStart < element.value.length))) {
          return;
        }

        this.spatialNavigator.move(key);
      });
    },

    focus(element) {
      this.spatialNavigator.focus(element);
    },

    add(param) {
      var elements = [];
      Array.isArray(param) ?
         elements = elements.concat(getElements(param)) :
         elements.push(document.querySelector(param));
      this.spatialNavigator.multiAdd(elements);
      this.spatialNavigator.focus(elements[0]);
      this.enabled = true;
    },

    remove(param) {
      var elements = [];
      Array.isArray(param) ?
        elements = elements.concat(getElements(param)) :
        elements.push(document.querySelector(param));
        this.spatialNavigator.multiRemove(elements);
      if (!this.spatialNavigator.getFocusedElement()) {
        this.enabled = false;
      }
    },

    enable() {
      this.enabled = true;
      this.spatialNavigator.focus();
    },

    disable() {
      this.enabled = false;
    }
  };

  exports.FxaModuleKeyNavigation = FxaModuleKeyNavigation;

})(window);
