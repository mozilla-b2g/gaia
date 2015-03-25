/* global Service */
'use strict';
(function(exports) {
  var DEBUG = false;

  /**
   * The virtual class inherited by all UI in system which has
   * the similar behavior.
   *
   * @class BaseUI
   */
  var BaseUI = function BaseUI() {
  };

  BaseUI.prototype.EVENT_PREFIX = 'base-';

  /**
   * Operations to render UI
   * Overwrite `view` to provide HTML interface.
   * Overwrite `_fetchElements` to provide elements reference.
   * Overwrite `_registerEvents` to register event handler.
   */
  BaseUI.prototype.render = function bu_render() {
    if (this.element) {
      return;
    }
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('afterbegin', this.view());
    this._fetchElements();
    this._registerEvents();
    if (this.element) {
      // Force a style flush so that if the UI is immediately shown, any
      // transition associated with the visible class will play.
      this.element.clientTop;
    }
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

  BaseUI.prototype.isShown = function bu_isShown(ele) {
    ele = ele || this.element;
    return ele && ele.classList.contains('visible');
  };

  BaseUI.prototype.hide = function bu_hide(ele) {
    ele = ele || this.element;
    ele.classList.remove('visible');
  };

  BaseUI.prototype.broadcast = function bu_broadcast(event, detail) {
    if (this.element) {
      var internalEvent = new CustomEvent('_' + event, {
        bubbles: false,
        detail: detail || this
      });

      this.debug(' publishing internal event: ' + event);
      this.element.dispatchEvent(internalEvent);
    }
  };

  BaseUI.prototype.publish = function bu_publish(event, detail) {
    // Dispatch internal event before external events.
    this.broadcast(event, detail);
    var evt = new CustomEvent(this.EVENT_PREFIX + event, {
      bubbles: true,
      cancelable: false,
      detail: detail || this
    });

    this.debug(' publishing external event: ' + event);
    // Publish external event.
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
    if (DEBUG || this.DEBUG) {
      console.log('[' + (this.name || this.CLASS_NAME) + ']' +
        '[' + (this.customID() || (this.index + 1) || this.instanceID) + ']' +
        '[' + Service.currentTime() + ']' +
        Array.slice(arguments).concat());
    }
  };

  exports.BaseUI = BaseUI;
}(window));
