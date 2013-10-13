'use strict';

(function(window) {
  var DEBUG = true;
  var _id = 0;
  window.BaseUI = function BaseUI() {
  };

  BaseUI.prototype.EVENT_PREFIX = 'base-';

  BaseUI.prototype.render = function bu_render() {
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this._fetchElements();
    this._registerEvents();
  };

  BaseUI.prototype._registerEvents = function bu__registerEvents() {

  };

  // Override me.
  BaseUI.prototype.view = function bu_view() {
    return '<div class="' + this.CLASS_NAME + '"></div>';
  };

  BaseUI.prototype.show = function bu_show() {
    this.element.classList.add('visible');
  };

  BaseUI.prototype.hide = function bu_hide() {
    this.element.classList.remove('visible');
  };

  BaseUI.prototype.publish = function bu_publish(event, detail) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(this.EVENT_PREFIX + event,
                        true, false, detail || this);

    this.debug('publish: ' + event);
    window.dispatchEvent(evt);
  };

  // Override me.
  BaseUI.prototype.CLASS_NAME = 'BaseUI';

  // Override me. Human readable ID.
  BaseUI.prototype.customID = function bu_customID() {
    return '';
  };

  BaseUI.prototype.debug = function bu_debug(msg) {
    if (DEBUG && ('DEBUG' in this.constructor && this.constructor.DEBUG)) {
      console.log('[' + this.CLASS_NAME + '][' + this.customID() + ']' +
        '[' + new Date().getTime() / 1000 + ']' +
        Array.slice(arguments).concat());
    }
  };
}(this));
