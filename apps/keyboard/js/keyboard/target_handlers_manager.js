'use strict';

/* global ActiveTargetsManager, KeyEvent,
          DefaultTargetHandler, NullTargetHandler, SpaceKeyTargetHandler,
          CandidateSelectionTargetHandler, CompositeTargetHandler,
          PageSwitchingTargetHandler, CapsLockTargetHandler,
          SwitchKeyboardTargetHandler, ToggleCandidatePanelTargetHandler,
          DismissSuggestionsTargetHandler, BackspaceTargetHandler */

(function(exports) {

var TargetHandlersManager = function(app) {
  this.handlers = undefined;
  this.activeTargetsManager = null;
  this.app = app;
};

TargetHandlersManager.prototype.start = function() {
  this.app.console.log('TargetHandlersManager.start()');

  this.handlers = new WeakMap();

  var activeTargetsManager = this.activeTargetsManager =
    new ActiveTargetsManager(this.app);

  // Create partial functions and hook to the callback properties,
  // see http://mdn.io/bind#Partial_Functions
  activeTargetsManager.ontargetactivated =
    this._callTargetAction.bind(this, 'activate', true, false);
  activeTargetsManager.ontargetlongpressed =
    this._callTargetAction.bind(this, 'longPress', false, false);
  activeTargetsManager.ontargetmovedout =
    this._callTargetAction.bind(this, 'moveOut', false, true);
  activeTargetsManager.ontargetmovedin =
    this._callTargetAction.bind(this, 'moveIn', true, false);
  activeTargetsManager.ontargetcommitted =
    this._callTargetAction.bind(this, 'commit', false, true);
  activeTargetsManager.ontargetcancelled =
    this._callTargetAction.bind(this, 'cancel', false, true);
  activeTargetsManager.ontargetdoubletapped =
    this._callTargetAction.bind(this, 'doubleTap', false, true);
  activeTargetsManager.start();
};

TargetHandlersManager.prototype.stop = function() {
  this.app.console.log('TargetHandlersManager.stop()');

  this.handlers = null;
  this.activeTargetsManager.stop();
  this.activeTargetsManager = null;
};

// This method is the scaffold of our partical functions:
// The first 3 arguments are instructions set with bind() on how the function
// should process the target (put/delete the handler instance in the handers
// map, and call the named action method), and the fourth argument is the actual
// active target to handle.
//
// An active target and it's handler enjoys a life cycle that beginning with
// "activate" or "moveIn", and end with "commit", "cancel", or "moveout".
// "longpress" is noticeably an optional step during the life cycle and does
// not start or end the handler/active target, so it was not mentioned in the
// above list.
//
// Please note that since we are using target (the DOM element) as the
// identifier of handlers, we do not assign new handler if there are two touches
// on the same element. Currently that cannot happen because of what done in
// bug 985855, however in the future that will change (and these handlers needs
// to) to adopt bug 985853 (Combo key).
TargetHandlersManager.prototype._callTargetAction = function(action,
                                                             setHandler,
                                                             deleteHandler,
                                                             target) {
  this.app.console.log('TargetHandlersManager._callTargetAction()',
    action, setHandler, deleteHandler, target);

  var handler;
  if (this.handlers.has(target)) {
    handler = this.handlers.get(target);
    if (setHandler) {
      console.warn('TargetHandlersManager: ' +
        'calling targetHandler.' + action + '() on existing handler.');
    }
    if (deleteHandler) {
      this.handlers.delete(target);
    }
  } else {
    handler = this._createHandlerForTarget(target);
    if (!setHandler) {
      console.warn('TargetHandlersManager: ' +
        'calling targetHandler.' + action + '() on non-existing handler.');
    }
    if (!deleteHandler) {
      this.handlers.set(target, handler);
    }
  }

  handler[action]();
};

// This method decide which of the TargetHandler is the right one to
// handle the active target. It decide the TargetHandler to use and create
// and instance of it, and return the instance.
TargetHandlersManager.prototype._createHandlerForTarget = function(target) {
  this.app.console.log('TargetHandlersManager._createHandlerForTarget()');

  var handler;

  // This is unfortunately very complex but this is essentially what's already
  // specified in keyboard.js.
  // We will need to normalize the identifier for each targets in the future.
  if (target.classList.contains('dismiss-suggestions-button')) {
    handler = new DismissSuggestionsTargetHandler(target, this.app);
  } else if ('selection' in target.dataset) {
    handler = new CandidateSelectionTargetHandler(target, this.app);
  } else if ('compositeKey' in target.dataset) {
    handler = new CompositeTargetHandler(target, this.app);
  } else if ('keycode' in target.dataset) {
    var keyCode = parseInt(target.dataset.keycode, 10);
    switch (keyCode) {
      // Delete is a special key, it reacts when pressed not released
      case KeyEvent.DOM_VK_BACK_SPACE:
        handler = new BackspaceTargetHandler(target, this.app);
        break;

      case KeyEvent.DOM_VK_SPACE:
        handler = new SpaceKeyTargetHandler(target, this.app);
        break;

      case this.app.layoutManager.KEYCODE_BASIC_LAYOUT:
      case this.app.layoutManager.KEYCODE_ALTERNATE_LAYOUT:
      case this.app.layoutManager.KEYCODE_SYMBOL_LAYOUT:
      case KeyEvent.DOM_VK_ALT:
        handler = new PageSwitchingTargetHandler(target, this.app);
        break;

      case this.app.layoutManager.KEYCODE_SWITCH_KEYBOARD:
        handler = new SwitchKeyboardTargetHandler(target, this.app);
        break;

      case this.app.layoutManager.KEYCODE_TOGGLE_CANDIDATE_PANEL:
        handler = new ToggleCandidatePanelTargetHandler(target, this.app);
        break;

      case KeyEvent.DOM_VK_CAPS_LOCK:
        handler = new CapsLockTargetHandler(target, this.app);
        break;

      default:
        handler = new DefaultTargetHandler(target, this.app);
        break;
    }
  } else {
    handler = new NullTargetHandler(target, this.app);
  }

  return handler;
};

exports.TargetHandlersManager = TargetHandlersManager;

})(window);
