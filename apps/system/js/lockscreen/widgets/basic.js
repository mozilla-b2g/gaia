/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * The basic widget provide a faster way to create a new
 * widget via extending this constructor.
 *
 * User should never instance this widget. This is a widget template
 * that others can inherit it to develop their widgets faster.
 */
(function(exports) {

  const DEBUG = true;

  /**
   * @constructor LockScreenBasicWidget
   * @param {LockScreenMediator} mediator
   */
  var LockScreenBasicWidget = function(mediator) {
    // Because this constructor would be applied on new object
    // to generate diverged instance, we can't use the keyword
    // 'this' to call methods inside this prototype. The 'this'
    // would become the object (prototype) it need to apply on.
    LockScreenBasicWidget.prototype.setup.call(this);
    this.mediator = mediator;

    // Don't call any method relied on 'this' here.
    // User must remember to register itself.
  };

  /**
   * Set up the prototype of this instance.
   *
   * @this {LockScreenBasicWidget}
   * @member LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.setup = function() {
    this.states = {
      activated: false
    };
    this.configs = {
      events: [],
      options: {},  // Some extra options for initialization.
      name: 'Basic' // Overwrite this when extending.
    };
    this.mediator = null;
  };

  /**
   * Overwrite this method to response the activation request.
   * The activation would be fired while the widget got launched and registered
   * by the factory. After the these steps, the mediator would call this method
   * to request to active the widget.
   *
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   * @public
   */
  LockScreenBasicWidget.prototype.activate =
  function lsbw_activate() {
    if (this.states.activated) {
      return;
    }
    this.states.activated = true;
  };

  /**
   * Overwrite this method to response the deactivation request.
   * The deactivation request would be fired while this widget got unregistered.
   *
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   * @public
   */
  LockScreenBasicWidget.prototype.deactivate =
  function lsbw_deactivate() {
    if (!this.states.activated) {
      return;
    }
    this.states.activated = false;
  };

  /**
   * Fire a request to register this widget. It's a wrappered method that
   * would ease the headache of create a request object manually.
   *
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.requestRegister =
  function lsbw_requestRegister() {
    var content = { 'widget': this,
                    'options': this.configs.options
                  };
    this.request('register-widget', content);
  };

  /**
   * Fire a request to unregister this widget. It's a wrappered method that
   * would ease the headache of create a request object manually.
   *
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.requestUnregister =
  function lsbw_requestUnregister() {
    this.request('unregister-widget');
  };

  /**
   * Fire a request to unregister this widget. It's a wrappered method that
   * would ease the headache of create a request object manually.
   *
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.requestUnlock =
  function lsbw_requestUnlock() {
    this.request('unlock');
  };

  /**
   * Fire a request to invoke another widget. It's a wrappered method that
   * would ease the headache of create a request object manually.
   *
   * @param {string} name - the registered widget name, see
   *                        LockScreenWidgetFactory#config.classes
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.requestInvokeWidget =
  function lsbw_requestInvokeWidget(name) {
    var content = { 'method': 'widget',
                    'detail': {'name': name}
                  };
    this.request('invoke', content);
  };

  /**
   * Fire a request to invoke an secure app. It's a wrappered method that
   * would ease the headache of create a request object manually.
   *
   * @param {string} url - the URL of the app
   * @param {string} manifestUrl - the URL of the manifest of the app
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.requestInvokeSecureApp =
  function lsbw_requestInvokeSecureApp(url, manifestUrl) {
    var content = {
      'method': 'secureapp',
      'detail': {
        'url': url,
        'manifestUrl': manifestUrl
      }
    };
    this.request('invoke', content);
  };

  /**
   * Fire a request to invoke an activity. It's a wrappered method that
   * would ease the headache of create a request object manually.
   *
   * This method follow the params that on the MDN page about the web activity:
   * https://developer.mozilla.org/en-US/docs/WebAPI/Web_Activities
   *
   * @param {object} activityContent - see activity introduction page to
   *                                   get more information.
   * @param {function} onerror
   * @param {function} onsuccess
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.requestInvokeActivity =
  function lsbw_requestInvokeActivity(activityContent,
      onerror = ()=>{},
      onsuccess = ()=>{}) {

    var content = {
      'method': 'activity',
      'detail': {
        'content': activityContent,
        'onerror': onerror,
        'onsuccess': onsuccess
      }
    };
    this.request('invoke', content);
  };

  /**
   * Fire a request to invoke an secure app. It's a wrappered method that
   * would ease the headache of create a request object manually.
   *
   * @param {string} method - 'id or 'css'; to declar that the selecting method
   *                          that would apply on the selector.
   * @param {string} selector - the selector like '#lockscreen' or 'lockscreen',
   *                            depends on what selecting method would be used
   * @param {function} response - when the canvas got selected, this callback
   *                              would receive it and can start to draw itself
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.requestCanvas =
  function lsbw_requestCanvas(method, selector, response)
  {
    var content = {
       'method': method,
       'selector': selector,
       'response': response
    };
    this.request('canvas', content);
  };

  /**
   * Wrap requests and pass it to the mediator.
   *
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.request =
  function lsbw_request(type, content = {}) {
    var request = {
      'type': type,
      'from': this.configs.name,
      'content': content
    };
    this.mediator.request(request);
  };

  /**
   * Overwrite this method to response notifications.
   * The mediator would call this method to notify the
   * states changed.
   *
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.notify =
  function lsbw_notify(message, channel) {
    this.debug('widget has been notified with:', message,
      ' via ', channel);
  };

  /**
   * Write message out through the mediator.
   *
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.post =
  function lsbw_post(message, channel) {
    this.mediator.post(message, channel);
  };

  /**
   * Provide a way to let other widgets can access methods of this
   * basic widet. If no `_this` provided, it would bind on the current 'this',
   * which usually be the caller of this method.
   *
   * This may be helpful if some widget need to overwrite the original method,
   * but still want to call it due to the new and basic methods may have
   * only slight differences.
   *
   * @param {string} name - the method name
   * @param {object} _this - (optional) the 'this'
   * @return {function} - the method
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.super =
  function lsbw_prototype(name, _this) {
    var method = LockScreenBasicWidget.prototype[name];
    if (!method) {
      throw new Error('called an undefined method of the basic widget: '+ name);
    }
    return method.bind(_this || this);
  };

  /**
   * Print out messsage if 'DEBUG=1' in this file.
   * Because the flag is in closure so every extended widgets would no need
   * and no way to set the flag.
   *
   * @param {any} - any paraments in any length
   * @this {LockScreenBasicWidget}
   * @memberof LockScreenBasicWidget
   */
  LockScreenBasicWidget.prototype.debug = function() {
    if (DEBUG) {
      console.log.apply(console, Array.prototype.slice.call(arguments, 0));
    }
  };

  /** @global LockScreenBasicWidget */
  exports.LockScreenBasicWidget = LockScreenBasicWidget;
})(window);
