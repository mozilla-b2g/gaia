/*
 * global asyncStorage
 */
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
    },

    /**
     * Read color code from the specified image blob. Please note that the blob
     * should be downloaded from System XHR or within the same domain.
     * Otherwise, this function returns SecurityError
     *
     * @param {Blob} blob the image blob.
     * @param {float} x read color from position x (0~1). If the value is 0.5,
                        it reads the center.
     * @param {float} y read color from position y (0~1). If the value is 0.5,
                        it reads the center.
     * @param {Function} callback the callback function whose signature is:
     *   void callback(color in rgba array, error);
     * @memberof SharedUtils
    **/
    readColorCode: function su_readColorCode(blob, x, y, callback) {
      if (!callback) {
        // Callback is not optional. We don't have use case without callback.
        return;
      }
      var offscreenUrl = URL.createObjectURL(blob);
      var offscreenImg = new Image();
      offscreenImg.onload = function() {
        URL.revokeObjectURL(offscreenUrl);
        var canvas = document.createElement('canvas');
        // We only need one pixel.
        canvas.width = 1;
        canvas.height = 1;
        var ctx = canvas.getContext('2d');
        try {
          // Let's draw image x, y with 1x1 at canvas position(0, 0).
          ctx.drawImage(offscreenImg, offscreenImg.naturalWidth * x,
                        offscreenImg.naturalHeight * y, 1, 1, 0, 0, 1, 1);
          var data = ctx.getImageData(0, 0, 1, 1).data;
          // Note the data is in Uint8ClampedArray. We need to convert it to
          // array.
          callback([data[0], data[1], data[2], data[3]]);
        } catch(ex) {
          // drawImage may throw decoding error
          // getImageData may throw security error.
          callback(null, ex);
        }
      };

      offscreenImg.onerror = function() {
        URL.revokeObjectURL(offscreenUrl);
        console.error('read color code from ' + blob);
        callback(null, new Error('read color code from ' + blob));
      };
      // Let's load the image
      offscreenImg.src = offscreenUrl;
    },

    /**
     * Localize html element from payload, support l10n-id, l10n-args, or
     * plain string format. See http://mzl.la/1yoNtZ1 for l10n refernce.
     * @param  {HtmlElement} element target html element to be localized
     * @param  {Object} payload l10n payload
     * @memberof SharedUtils
     */
    localizeElement: function su_localizeElement(element, payload) {
      // payload could be:
      // 1. string -> l10nId
      // 2. object -> {id: l10nId, args: l10nArgs}
      // 3. object -> {raw: string}
      // It could be HTML fragment but currently we don't have it yet.
      if (typeof payload === 'string') {
        element.setAttribute('data-l10n-id', payload);
        return;
      }

      if (typeof payload === 'object') {
        if (payload.id) {
          navigator.mozL10n.setAttributes(element, payload.id, payload.args);
          return;
        } else if (payload.raw) {
          element.removeAttribute('data-l10n-id');
          element.textContent = payload.raw;
          return;
        }
      }
    }
  };

}(window));
