(function(window) {

  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  var Sandbox = window.TestAgent.Sandbox = function Sandbox(url) {
    TestAgent.Responder.call(this);
    this.url = url;
  };

  Sandbox.prototype = {
    __proto__: TestAgent.Responder.prototype,

    _element: null,

    /**
     * @type Boolean
     *
     * True when sandbox is ready
     */
    ready: false,

    /**
     * URL for the iframe sandbox.
     *
     * @type String
     */
    url: null,

    /**
     * Returns iframe element.
     *
     *
     * @type DOMElement
     */
    getElement: function getElement() {
      var iframe;
      if (!this._element) {
        iframe = this._element = window.document.createElement('iframe');
        iframe.src = this.url + '?time=' + String(Date.now());
      }
      return this._element;
    },

    _insertIframe: function() {

      var element = this.getElement();
      var iframeWindow;
      var self = this;
      var src = element.src;

      window.document.body.appendChild(element);
      iframeWindow = element.contentWindow;

      // GECKO (Firefox, B2G) has a problem
      // with the caching of iframes this sometimes
      // causes the onerror event not to fire
      // when we boot up the iframe setting
      // the source here ensures the cached
      // version is never used.
      iframeWindow.location.href = src;

      return iframeWindow;
    },

    run: function(callback) {
      this.destroy();

      var iframeWindow = this._insertIframe();
      var self = this;

      iframeWindow.onerror = function(message, file, line) {
        self.emit('error', {
          message: message,
          //remove cache busting string
          filename: file.split('?time=')[0],
          lineno: line
        });
      };

      iframeWindow.addEventListener('DOMContentLoaded', function() {
        self.ready = true;
        self.emit('ready', this);
        callback.call(this);
      });

      return iframeWindow;
    },

    destroy: function destroy() {
      var el;

      if (!this.ready) {
        return false;
      }

      this.ready = false;

      el = this.getElement();
      el.parentNode.removeChild(el);


      return true;
    },

    getWindow: function getWindow() {
      if (!this.ready) {
        return false;
      }

      return this.getElement().contentWindow;
    }

  };

}(this));
