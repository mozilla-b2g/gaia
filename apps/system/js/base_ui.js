'use strict';

(function(window) {
  var DEBUG = true;
  var _id = 0;

  /**
   * The virtual class inherited by all UI in system which has
   * the similar behavior.
   *
   * @class BaseUI
   */
  window.BaseUI = function BaseUI() {
  };

  BaseUI.prototype.EVENT_PREFIX = 'base-';

  /**
   * Operations to render UI
   * Overwrite `view` to provide HTML interface.
   * Overwrite `_fetchElements` to provide elements reference.
   * Overwrite `_registerEvents` to register event handler.
   */
  BaseUI.prototype.render = function bu_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this._fetchElements();
    this._registerEvents();
    this.publish('rendered');
  };

  /**
   * Get nessesary elements reference when inited
   */
  BaseUI.prototype._fetchElements = function bu__fetchElements() {

  };

  /**
   * Register event handler
   */
  BaseUI.prototype._registerEvents = function bu__registerEvents() {

  };

  /**
   * Modal Dialog html view
   */
  BaseUI.prototype.view = function bu_view() {
    return '<div class="' + this.CLASS_NAME + '"></div>';
  };

  BaseUI.prototype.show = function bu_show(ele) {
    ele = ele || this.element;
    ele.classList.add('visible');
  };

  BaseUI.prototype.hide = function bu_hide(ele) {
    ele = ele || this.element;
    ele.classList.remove('visible');
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

  /**
   * Overwrite me if you need to unregister event handlers.
   */
  BaseUI.prototype._unregisterEvents = function bu__unregisterEvents() {

  };

  BaseUI.prototype.destroy = function bu_destroy() {
    this.publish('willdestroy');
    this._unregisterEvents();
    if (this.element) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
    this.publish('destroyed');
  };

  BaseUI.prototype.debug = function bu_debug(msg) {
    if (DEBUG && ('DEBUG' in this.constructor && this.constructor.DEBUG)) {
      console.log('[' + this.CLASS_NAME + '][' + this.customID() + ']' +
        '[' + System.currentTime() + ']' +
        Array.slice(arguments).concat());
    }
  };
}(this));
