/* global TrustedUIManager, sleepMenu, AppWindowManager, ScreenManager,
          permissionManager */

(function(exports) {
  'use strict';

  // The following keys are handled by state machine. If we prevent the
  // following keys, we may break the state machine. Before a total solution,
  // we do not use the following keys as a fallback trigger.
  var BLACK_LIST_KEYS = [
    'power', // power key will be handled by screen manager.
    'home', // home key will be handled by homescreen manager which sets focus
            // to correct place.
    'mozhomescreen',
    'volumeup',
    'volumedown'
  ];

  function FocusManager() {
  }

  var proto = FocusManager.prototype;

  proto.start = function ff_start() {
    this.startFallbackCatcher();
  };

  proto.stop = function ff_stop() {
    this.stopFallbackCatcher();
  };

  proto.focus = function ff_focus() {
    // We should get the object reference when we try to focus because smart
    // system has a lot of lazy load mechanism and we may get undefined when
    // they aren't lazy loaded.
    var systemUIList = [
      TrustedUIManager,
      sleepMenu,
      permissionManager
    ];
    // list all visible system UI
    var visible = systemUIList.filter(function(item) {
      return item && item.isVisible();
    });
    if (visible.length > 0) {
      // sort system UIs
      visible.sort(function(item1, item2) {
        return item2.getOrder() - item1.getOrder();
      });
      // focus top-most system UI
      visible[0].focus();
    } else {
      // no system UI, we set focus back to top-most AppWindow
      AppWindowManager.getActiveApp().focus();
    }

  };

  proto.startFallbackCatcher = function ff_startFallbackCatcher() {
    window.addEventListener('keydown', this, true);
    window.addEventListener('keyup', this, true);
    window.addEventListener('mozbrowserbeforekeydown', this, true);
    window.addEventListener('mozbrowserbeforekeyup', this, true);
  };

  proto.stopFallbackCatcher = function ff_stopFallbackCatcher() {
    window.removeEventListener('keydown', this, true);
    window.removeEventListener('keyup', this, true);
    window.removeEventListener('mozbrowserbeforekeydown', this, true);
    window.removeEventListener('mozbrowserbeforekeyup', this, true);
  };

  proto.isActiveElementVisible = function ff_isActiveElementVisible() {
    var active = document.activeElement;
    var style = active ? window.getComputedStyle(active) : null;
    var visible = true;
    // check its ancestor is all visible.
    while(active && active.tagName !== 'HTML') {
      style = window.getComputedStyle(active);
      // AFAIK, if ancestor's visibility is hidden and descendant's visibility
      // is visibile, the descendant is displayed at screen. But we should have
      // such cases in smart system app. So, we view this caes as invisible.
      if (style.display === 'none' || style.visibility === 'hidden') {
        visible = false;
        break;
      }
      active = active.parentNode;
    }
    // If style is not null, we found that an element whose display or
    // visibility is hidden.
    return visible;
  };

  proto.isWrongFocus = function ff_isWrongFocus() {
    // if active element is body or html, it is wrong focus.
    if (document.activeElement.tagName === 'BODY' ||
        document.activeElement.tagName === 'HTML') {
      return true;
    }
    // If one of ancestor of active element is invisible, we should view it as
    // in wrong focus
    if (!this.isActiveElementVisible()) {
      return true;
    }

    return false;
  };

  proto.handleEvent = function ff_handleEvent(e) {
    if (!ScreenManager.screenEnabled ||
        BLACK_LIST_KEYS.indexOf(e.key.toLowerCase()) > -1) {
      return;
    }
    var affected = this.isWrongFocus();
    if (!affected) {
      return;
    }
    // prevent evenything.
    switch(e.type) {
      case 'keydown':
      case 'keyup':
      case 'mozbrowserbeforekeydown':
      case 'mozbrowserbeforekeyup':
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        break;
    }
    // try to focus back to correct UI.
    this.focus();
  };

  exports.FocusManager = FocusManager;

})(window);
