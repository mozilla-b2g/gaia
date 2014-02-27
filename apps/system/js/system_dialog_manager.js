/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global System */
'use strict';

(function(exports) {
  var DEBUG = false;

  /**
   * A manager for each SystemDialog `show` and `hide`.
   * Show a dialog - the dialog publish `show` event from SystemDialog.
   * Hide a dialog - the dialog publish `hide` event from SystemDialog.
   *               - a new active dialog publish 'system-dialog-show' event,
   *                 then hide the previous active dialog.
   *               - received 'home', 'holdhome' event from the home button.
   *                 And pass the event type to be the argument
   *                 for options `onHide` attribute.
   *
   * @class SystemDialogManager
   * @requires module:System
   */
  var SystemDialogManager = function SystemDialogManager() {
    this.init();
  };

  SystemDialogManager.prototype = {

    /**
     * System app is made of a top-level `<div ="screen"></div>` DOM element
     * which contain all possible screens displayed by the app.
     * Multiple screens can be displayed at a time.
     * We store the list of currently
     * visible screens into this DOM element class attribute.
     *
     * @memberof SystemDialogManager
     * @prop {DOMElement} windows - the `#windows` element, which is the same
     *                              element that the would AppWindowManager use.
     * @prop {DOMElement} screen - the `#screen` element.
     */
    elements: {
      windows: null,
      screen: null
    },

    /**
     * @memberof SystemDialogManager#
     *
     */
    states: {
      activeDialog: null,
      runningDialogs: {}
    },

    /**
     * @memberof SystemDialogManager#
     */
    configs: {
      listens: ['system-dialog-created',
                'system-dialog-show',
                'system-dialog-hide',
                'system-resize',
                'home',
                'holdhome']
    }
  };

  /**
   * @listens system-dialog-created - when a system dialog got created,
   *                                  it would fire this event.
   * @listens system-dialog-show - when a system dialog got show request,
   *                               it would fire this event.
   * @listens system-dialog-hide - when a system dialog got hide request,
   *                               it would fire this event.
   * @listens system-resize - when the size of LayoutManager is changed,
   *                          LayoutManager would send system-resize event.
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
  SystemDialogManager.prototype.handleEvent = function sdm_handleEvent(evt) {
    var dialog = null;
    switch (evt.type) {
      case 'system-dialog-created':
        dialog = evt.detail;
        this.registerDialog(dialog);
        break;
      case 'system-dialog-show':
        dialog = evt.detail;
        this.activateDialog(dialog);
        break;
      case 'system-dialog-hide':
        dialog = evt.detail;
        this.deactivateDialog(dialog);
        break;
      case 'system-resize':
        if (this.states.activeDialog) {
          this.states.activeDialog.resize();
        }
        break;
      case 'home':
      case 'holdhome':
        // Automatically hide the dialog on home button press
        if (this.states.activeDialog) {
          // Deactivate the dialog and pass the event type in the two cases
          this.deactivateDialog(this.states.activeDialog, evt.type);
        }
        break;
    }
  };

  SystemDialogManager.prototype.init = function sdm_init() {
    this.initElements();
    this.start();
    this.debug('init:');
  };

  /**
   * @private
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
  SystemDialogManager.prototype.initElements = function sdm_initElements() {
    var selectors = { windows: 'windows', screen: 'screen'};
    for (var name in selectors) {
      var id = selectors[name];
      this.elements[name] = document.getElementById(id);
    }
  };

/**
   * Hook listeners of events this manager interested in.
   *
   * @private
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
  SystemDialogManager.prototype.start = function sdm_start() {
    this.configs.listens.forEach((function _initEvent(type) {
      self.addEventListener(type, this);
    }).bind(this));
  };

  /**
   * @private
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
  SystemDialogManager.prototype.registerDialog =
    function sdm_registerDialog(dialog) {
      this.states.runningDialogs[dialog.instanceID] = dialog;
    };

  /**
   * @private
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
  SystemDialogManager.prototype.unregisterDialog =
    function sdm_unregisterDialog(dialog) {
      delete this.states.runningDialogs[dialog.instanceID];
    };

  /**
   * Set an dialog as the active dialog.
   *
   * @private
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
    SystemDialogManager.prototype.activateDialog =
    function sdm_activateDialog(dialog) {
      this.debug('activateDialog: dialog.instanceID = ' + dialog.instanceID);
      // Hide the previous active dialog.
      if (this.states.activeDialog &&
          dialog.instanceID != this.states.activeDialog.instanceID) {
        // Means other dialog interrupted.
        // Then, have to hide the previous active dialog.
        this.states.activeDialog.hide('interrupted');
      }

      // Record new active dialog.
      this.states.activeDialog = dialog;

      // Activate dialog on screen element.
      this.elements.screen.classList.add('dialog');
    };

  /**
   * Deactivate the current active dialog.
   *
   * @private
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
  SystemDialogManager.prototype.deactivateDialog =
    function sdm_deactivateDialog(dialog, reason) {
      this.debug('deactivateDialog: dialog.instanceID = ' + dialog.instanceID);
      if (dialog.instanceID == this.states.activeDialog.instanceID) {
        // Hide itself
        if (reason) { // The request is coming from SystemDialogManager.
          this.states.activeDialog.hide(reason);
        } else {
          // Do nothing since the dialog is hidden already.
        }

        // Deactivate dialog on screen element
        this.elements.screen.classList.remove('dialog');

        // Clear activeDialog
        this.states.activeDialog = null;
      } else { // The request must be coming from dialog controller.
        // Just hide itself, no need to disturb showing dialog.
        // Since the dialog is hidden already, do nothing here.
      }
    };

  SystemDialogManager.prototype.debug = function sd_debug() {
    if (DEBUG) {
      console.log('[SystemDialogManager]' +
        '[' + System.currentTime() + ']' +
        '[' + Array.slice(arguments).concat() + ']');
    }
  };

  exports.SystemDialogManager = SystemDialogManager;

}(window));
