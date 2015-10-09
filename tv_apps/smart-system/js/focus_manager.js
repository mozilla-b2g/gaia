/* global AppWindowManager, ScreenManager, SettingsCache */

(function(exports) {
  'use strict';

  var SETTINGS_AUTO_FIXING = 'focusmanager.autofix.enabled';

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
    this._systemUIs = [];
  }

  var proto = FocusManager.prototype;

  proto.addUI = function ff_addUI(ui) {
    this._systemUIs.push(ui);
  };

  proto.removeUI = function ff_removeUI(ui) {
    var idx = this._systemUIs.indexOf(ui);
    if (idx > -1) {
      this._systemUIs.splice(idx, 1);
    }
  };

  proto.start = function ff_start() {
    window.addEventListener('screenchange', this);
    SettingsCache.get(SETTINGS_AUTO_FIXING, function(enabled) {
      if (enabled === true) {
        this._autoFixingEnabled = true;
        this.startFallbackCatcher();
      }
    }.bind(this));
  };

  proto.stop = function ff_stop() {
    window.removeEventListener('screenchange', this);
    if (this._autoFixingEnabled) {
      this.stopFallbackCatcher();
      this._autoFixingEnabled = false;
    }
  };

  proto._getAncestors = function ff__getAncestors(elem) {
    var ret = [elem];
    var node = elem.parentNode;

    while(node) {
      // We will return an array in top down order. So, we will add the
      // ancestors of elem in front of elem.
      ret.unshift(node);
      node = node.parentNode;
    }
    return ret;
  };

  /**
   * returns an array with nodes from the tree of a and b under the least common
   * ancestor. rules:
   *   1. If a === b or a.parent === b.parent, we will return a and b.
   *   2. If a is under b, we will return the direct child of b which is the
   *      ancestor of a and null.
   *   3. If b is under a, we will return null and the direct child of b which
   *      is the ancestor of b.
   *   4. If a and b do not have LCA, we will return null
   *   5. If everything is not above, we will find the nodes for a and b.
   *
  **/
  proto._getNodesUnderLeastCommonAncestor = function ff__getLCANodes(a, b) {
    if (a === b || a.parentNode === b.parentNode) {
      return { 'a': a, 'b': b };
    }
    var ancestorsA = this._getAncestors(a);
    var ancestorsB = this._getAncestors(b);
    var elemA;
    var elemB;
    var found = null;
    // We had check a === b. So, we will not have two the same array.
    // Pop them one by one to find the least common ancestor.
    while(!found && ancestorsA.length  > 0 && ancestorsB.length > 0) {
      elemA = ancestorsA.shift();
      elemB = ancestorsB.shift();
      if (elemA !== elemB) {
        // If element A is not the same as element B, we found the nodes under
        // Least Common Ancestor.
        found = { 'a': elemA, 'b': elemB };
      }
    }
    if (!found && (ancestorsA.length > 0 || ancestorsB.length > 0)) {
      // If one array is empty but the other is not empty, we can say that the
      // a is under b or b is under a.
      found = { 'a': ancestorsA.length > 0 ? ancestorsA.shift() : null,
                'b': ancestorsB.length > 0 ? ancestorsB.shift() : null };
    }
    return found;
  };

  proto._getElementZOrder = function ff__getElementZOrder(element) {
    var zIndex = window.getComputedStyle(element).zIndex;
    return zIndex === 'auto' ? 0 : parseInt(zIndex, 10);
  };

  proto._getElementIndex = function ff__getElementIndex(element) {
    var i = 0;
    var child = element;
    while((child = child.previousSibling) !== null) {
      i++;
    }
    return i;
  };

  proto._isUnderDOMTree = function ff__isUnderDOMTree(element) {
    var ancestors = this._getAncestors(element);
    return ancestors && ancestors.length > 0 &&
           ancestors[0].nodeName === '#document';
  };

  proto.focus = function ff_focus() {
    // According to gecko's implementation, we cannot change focus while
    // handling keyboard event. The way to bypass it is using setTimeout to lazy
    // to run the focus switching.
    //
    // There is another focusing rule in gecko: we cannot move focus across
    // domains, like moving focus from a button in a remote iframe to another
    // button in system app. The way to bypass it is using
    // 'document.activeElement.blur()'. But we don't call it at focus manager
    // because we cannot make sure if a module really wants to change focus.
    // If it wants, it should blur the activeElement and focus back to what it
    // wants.
    setTimeout(function() {
      // list all visible system UI
      var visible = this._systemUIs.filter(function(item) {
        return item && item.isFocusable() &&
               this._isUnderDOMTree(item.getElement()) &&
               this.isElementVisible(item.getElement());
      }.bind(this));
      if (visible.length > 0) {
        var topMost = null;
        // find the top most UI.
        visible.forEach(function(item) {
          if (!topMost) {
            topMost = item;
            return;
          }
          var nodes = this._getNodesUnderLeastCommonAncestor(
                                       topMost.getElement(), item.getElement());
          if (!nodes) {
            // they are not at the same tree
            console.warn('No LCA found, at least a UI is removed from UI but ' +
                         'not removed from focus manager.');
          } else if (nodes.a && !nodes.b) {
            console.warn('A UI is under another UI while focusing it.');
            // We view topMost as higher than item in this case.
          } else if (!nodes.a && nodes.b) {
            console.warn('A UI is under another UI while focusing it.');
            // We view item as higher than topMost in this case.
            topMost = item;
          } else {
            var zOrderA = this._getElementZOrder(nodes.a);
            var zOrderB = this._getElementZOrder(nodes.b);
            if (zOrderB > zOrderA) {
              topMost = item;
            } else if (zOrderA === zOrderB) {
              var domIndexA = this._getElementIndex(nodes.a);
              var domIndexB = this._getElementIndex(nodes.b);
              if (domIndexB > domIndexA) {
                topMost = item;
              }
            }
          }
        }.bind(this));
        // focus top-most system UI
        topMost.focus();
      } else if (AppWindowManager.getActiveApp()){
        // no system UI, we set focus back to top-most AppWindow
        AppWindowManager.getActiveApp().focus();
        // We will always have active app, except booting.
      }
    }.bind(this));
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

  proto.isElementVisible = function ff_isElementVisible(element) {
    var active = element;
    var style = active ? window.getComputedStyle(active) : null;
    var visible = true;
    // check its ancestor is all visible.
    while(active && active.tagName !== 'HTML') {
      style = window.getComputedStyle(active);
      // AFAIK, if ancestor's visibility is hidden and descendant's visibility
      // is visibile, the descendant is displayed at screen. But we should have
      // such cases in smart system app. So, we view this caes as invisible.
      if (style.display === 'none' || style.visibility === 'hidden' ||
          active.getAttribute('aria-hidden') === 'true') {
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
    if (!this.isElementVisible(document.activeElement)) {
      return true;
    }

    return false;
  };

  proto.handleEvent = function ff_handleEvent(e) {
    // prevent evenything.
    switch(e.type) {
      case 'keydown':
      case 'keyup':
      case 'mozbrowserbeforekeydown':
      case 'mozbrowserbeforekeyup':
        if (ScreenManager.screenEnabled &&
            BLACK_LIST_KEYS.indexOf(e.key.toLowerCase()) === -1 &&
            this.isWrongFocus()) {

          e.preventDefault();
          e.stopImmediatePropagation();
          e.stopPropagation();
          // try to focus back to correct UI.
          this.focus();
        }
        break;
      case 'screenchange':
        if (ScreenManager.screenEnabled) {
          // try to focus back to correct UI.
          this.focus();
        }
        break;
    }
  };

  exports.FocusManager = FocusManager;

  // We should create a instance for other modules as soon as possible.
  window.focusManager = new FocusManager();
  window.focusManager.start();
})(window);
