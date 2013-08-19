(function(window) {

  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  var Sandbox = window.TestAgent.Sandbox = function Sandbox(url) {
    TestAgent.Responder.call(this);
    this.url = url;
  };

  var proto = Sandbox.prototype = Object.create(
    TestAgent.Responder.prototype
  );

  proto._element = null;

  /**
   * @type Boolean
   *
   * True when sandbox is ready
   */
  proto.ready = false;

  /**
   * URL for the iframe sandbox.
   *
   * @type String
   */
  proto.url = null;

  /**
   * Returns iframe element.
   *
   *
   * @type DOMElement
   */
  proto.getElement = function getElement() {
    var iframe;
    if (!this._element) {
      iframe = this._element = window.document.createElement('iframe');
      iframe.src = this.url + '?time=' + String(Date.now());
    }
    return this._element;
  };

  proto.run = function run(callback) {
    //cleanup old sandboxes
    this.destroy();

    var element = this.getElement(),
        iframeWindow,
        self = this;

    //this must come before the listener
    window.document.body.appendChild(element);
    iframeWindow = element.contentWindow;

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
  };

  proto.destroy = function destroy() {
    var el;

    if (!this.ready) {
      return false;
    }

    this.ready = false;

    el = this.getElement();
    el.parentNode.removeChild(el);


    return true;
  };

  proto.getWindow = function getWindow() {
    if (!this.ready) {
      return false;
    }

    return this.getElement().contentWindow;
  };


}(this));

