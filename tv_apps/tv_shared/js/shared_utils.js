(function(exports) {
  'use strict';
  exports.SharedUtils = {
    nodeListToArray: function su_nodeListToArray(obj) {
      return [].map.call(obj, function(element) {
        return element;
      });
    },

    addMixin: function su_addMixin(obj, mixin) {
      for (var prop in mixin) {
        if (mixin.hasOwnProperty(prop)) {
          if (!obj.prototype.hasOwnProperty(prop)) {
            obj.prototype[prop] = mixin[prop];
          }
        }
      }
    },

    // Because the scoped css cannot be override by outer css, we have to create
    // a cloned function without scope from shared/component_utils.js
    injectComponentStyle: function su_injectComponentStyle(self, baseUrl) {
      var style = document.createElement('style');
      var url = baseUrl + 'style.css';

      style.innerHTML = '@import url(' + url + ');';
      self.appendChild(style);

      self.style.visibility = 'hidden';

      // Wait for the stylesheet to load before injecting
      // it into the shadow-dom. This is to work around
      // bug 1003294, let's review once landed.
      style.addEventListener('load', function() {

        // Put a clone of the stylesheet into the shadow-dom.
        // We have to use two <style> nodes, to work around
        // the lack of `:host` (bug 992245) and `:content`
        // (bug 992249) selectors. Once we have those we
        // can do all our styling from a single style-sheet
        // within the shadow-dom.
        if (self.shadowRoot) {
          self.shadowRoot.appendChild(style.cloneNode(true));
        }

        self.style.visibility = '';
      });
    }
  };

}(window));
