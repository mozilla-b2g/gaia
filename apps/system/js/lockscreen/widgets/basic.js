/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * The basic widget provide a faster way to create a new
 * widget via extending this constructor.
 */
(function(exports) {

  var LockScreenBasicWidget = function() {};
  LockScreenBasicWidget.prototype = {
    states: {
      activated: false
    },
    configs: {
      events: [],
      name: 'Basic' // Overwrite this when extending.
    }
  };

  LockScreenBasicWidget.prototype.handleEvent =
  function lsbw_activate() {};

  LockScreenBasicWidget.prototype.activate =
  function lsbw_activate() {
    if (this.states.activated) {
      return;
    }
    this.listenEvents();
    this.states.activated = true;
  };

  LockScreenBasicWidget.prototype.deactivate =
  function lsbw_deactivate() {
    if (!this.states.activated) {
      return;
    }
    this.suspendEvents();
    this.states.activated = false;
  };

  LockScreenBasicWidget.prototype.listenEvents =
  function lssw_suspendEvents() {
    this.configs.events.forEach((ename)=> {
      window.addEventListener(ename, this);
    });
  };

  LockScreenBasicWidget.prototype.suspendEvents =
  function lssw_suspendEvents() {
    this.configs.events.forEach((ename)=> {
      window.removeEventListener(ename, this);
    });
  };

  LockScreenBasicWidget.prototype.requestUnlock =
  function lsbw_requestUnlock() {
    this.publish('lockscreen-request-unlock');
  };

  LockScreenBasicWidget.prototype.requestInvokeWidget =
  function lsbw_requestInvokeWidget(name) {
    var request = { 'method': 'widget',
                    'detail': {'name': name}
                  };
    this.publish('lockscreen-request-invoke',
      { 'request': request });
  };

  LockScreenBasicWidget.prototype.requestInvokeSecureApp =
  function lsbw_requestInvokeSecureApp(url, manifestUrl) {
    var request = {
      'method': 'secureapp',
      'detail': {
        'url': url,
        'manifestUrl': manifestUrl
      }
    };
    this.publish('lockscreen-request-invoke',
      { 'request': request });
  };

  LockScreenBasicWidget.prototype.requestInvokeActivity =
  function lsbw_requestInvokeActivity(content,
      onerror = ()=>{},
      onsuccess = ()=>{}) {

    var request = {
      'method': 'activity',
      'detail': {
        'content': content,
        'onerror': onerror,
        'onsuccess': onsuccess
      }
    };
    this.publish('lockscreen-request-invoke',
      { 'request': request });
  };

  LockScreenBasicWidget.prototype.requestCanvas =
  function lsbw_requestCanvas(method, selector, response)
  {
    var request = {
       'method': method,
       'selector': selector,
       'response': response
    };
    this.publish('lockscreen-request-canvas',
      {'request': request});
  };

  LockScreenBasicWidget.prototype.publish =
  function lsbw_publish(type, detail = {}) {
    if (!detail.name) {
      detail.name = this.configs.name;
    }
    window.dispatchEvent(new CustomEvent(type,
      {'detail': detail}));
  };

  LockScreenBasicWidget.prototype.super =
  function lsbw_prototype() {
    return LockScreenBasicWidget.prototype;
  };

  /** @global LockScreenBasicWidget */
  exports.LockScreenBasicWidget = LockScreenBasicWidget;

})(window);
