/* global SettingsListener, Service */
'use strict';
(function(exports) {
  var DEBUG = false;
  var _id = 0;
  var _globalStates = null;

  // Manipulate global states for app text selection dialog across all apps. All
  // states which are shared by apps should be put in this class.
  var AppTextSelectionDialogGlobalStates = function() {
    this._hasCutOrCopiedTimeoutId = null;
    this._isPrefOn = true;
    this.appTSDs = new Set();
    this.bindOnObservePrefChanged = this.onObservePrefChanged.bind(this);
    SettingsListener.observe('copypaste.enabled', true,
                             this.bindOnObservePrefChanged);
  };

  // If a user cuts or copies something, a paste shortcut will pop up every time
  // when single tapping on an editable field within this timeout.
  AppTextSelectionDialogGlobalStates.prototype.CUT_OR_COPIED_TIMEOUT_MS = 15000;

  AppTextSelectionDialogGlobalStates.prototype.hasCutOrCopied =
    function() {
      return !!this._hasCutOrCopiedTimeoutId;
    };

  AppTextSelectionDialogGlobalStates.prototype.launchHasCutOrCopiedTimer =
    function() {
      this._hasCutOrCopiedTimeoutId = window.setTimeout(() => {
        this._hasCutOrCopiedTimeoutId = null;
      }, this.CUT_OR_COPIED_TIMEOUT_MS);
    };

  AppTextSelectionDialogGlobalStates.prototype.cancelHasCutOrCopiedTimer =
    function() {
      window.clearTimeout(this._hasCutOrCopiedTimeoutId);
      this._hasCutOrCopiedTimeoutId = null;
    };

  AppTextSelectionDialogGlobalStates.prototype.resetAllStates =
    function() {
      this._hasCutOrCopiedTimeoutId = null;
      this._isPrefOn = true;
      this.appTSDs.clear();
    };

  AppTextSelectionDialogGlobalStates.prototype.onObservePrefChanged =
    function (value) {
      this._isPrefOn = value;
      this.appTSDs.forEach(appTSD => {
        this._isPrefOn ? appTSD.start() : appTSD.stop();
      });
    };

  // Text selection dialog per AppWindow.
  var AppTextSelectionDialog = function (app) {
    this.app = app;
    this.containerElement = (app && app.element) ? app.element :
      document.getElementById('text-selection-dialog-root');
    this.instanceID = _id++;
    this.event = null;
    this._enabled = false;
    this._injected = false;
    this._isCommandSendable = false;
    this._transitionState = 'closed';
    this._transitionStateOnPressCaret = null;
    this.textualmenuDetail = null;
    this.globalStates = _globalStates =
      _globalStates || new AppTextSelectionDialogGlobalStates();
    this.globalStates.appTSDs.add(this);
  };

  AppTextSelectionDialog.prototype = Object.create(window.BaseUI.prototype);

  AppTextSelectionDialog.prototype.TEXTDIALOG_HEIGHT = 52;

  AppTextSelectionDialog.prototype.TEXTDIALOG_WIDTH = 54;

  // Distance between selected area and the bottom of menu when menu show on
  // the top of selected area.
  // By UI spec, 12px from the top of dialog to utility menu.
  AppTextSelectionDialog.prototype.DISTANCE_FROM_MENUBOTTOM_TO_SELECTEDAREA =
    12;

  // Distance between selected area and the top of menu when menu show on
  // the bottom of selected area.
  // caret tile height is controlled by gecko, we estimate the height as
  // 22px. So 22px plus 12px which defined in UI spec, we get 34px from
  // the bottom of selected area to utility menu.
  AppTextSelectionDialog.prototype.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP = 43;

  // Minimum distance between bubble and boundary.
  AppTextSelectionDialog.prototype.DISTANCE_FROM_BOUNDARY = 5;

  AppTextSelectionDialog.prototype.ID_NAME = 'AppTextSelectionDialog';

  AppTextSelectionDialog.prototype.ELEMENT_PREFIX = 'textselection-dialog-';

  // Overwrite _unregisterEvents to remove this AppTextSelectionDialog
  // from global states when destroying this app.
  AppTextSelectionDialog.prototype._unregisterEvents =
    function tsd__unregisterEvents() {
      this.globalStates.appTSDs.delete(this);
    };

  AppTextSelectionDialog.prototype.start = function tsd_start() {
    if (this._enabled) {
      return;
    }
    this._enabled = true;
    if (this.app && this.app.element) {
      this.app.element.addEventListener('mozbrowsercaretstatechanged', this);
    } else {
      window.addEventListener('mozChromeEvent', this);
    }
  };

  AppTextSelectionDialog.prototype.stop = function tsd_stop() {
    if (!this._enabled) {
      return;
    }
    this._enabled = false;
    if (this.app && this.app.element) {
      this.app.element.removeEventListener('mozbrowsercaretstatechanged', this);
    } else {
      window.removeEventListener('mozChromeEvent', this);
    }
  };

  AppTextSelectionDialog.prototype.debug = function tsd_debug(msg) {
    if (DEBUG || this._DEBUG) {
      console.log(this.ID_NAME + '(' + this.CLASS_NAME + this.instanceID +
                  '): ' + msg);
    }
  };

  AppTextSelectionDialog.prototype.handleEvent = function tsd_handleEvent(evt) {
    switch (evt.type) {
      case 'mozbrowsercaretstatechanged':
        evt.preventDefault();
        evt.stopPropagation();
        this._handleCaretStateChanged(evt.detail);
        break;
      case 'mozChromeEvent':
        switch (evt.detail.type) {
          case 'caretstatechanged':
            evt.preventDefault();
            evt.stopPropagation();
            this._handleCaretStateChanged(evt.detail.detail);
            break;
        }
    }
  };

  AppTextSelectionDialog.prototype._handleCaretStateChanged =
    function tsd__handleCaretStateChanged(detail) {
      if (!detail) {
        return;
      }
      this.debug('on receive caret state change event');
      this.debug(JSON.stringify(detail));
      if (detail.reason === 'visibilitychange' && !detail.caretVisible) {
         this.hide();
         return;
      }
      if (detail.reason === 'presscaret') {
        this._transitionStateOnPressCaret = this._transitionState;
        this.hide();
        return;
      }
      if (!detail.selectionVisible) {
        this.hide();
        return;
      }
      if (detail.collapsed) {
        this._onCollapsedMode(detail);
      } else {
        this._onSelectionMode(detail);
      }
    };

  AppTextSelectionDialog.prototype._onCollapsedMode =
    function tsd__onCollapsedMode(detail) {
      var showDialog = false;

      switch (detail.reason) {
        case 'taponcaret':
        case 'longpressonemptycontent':
          // Always allow, do nothing here.
          showDialog = true;
          break;
        case 'updateposition':
          // Only allow when something had been cut or copied.
          if (this.globalStates.hasCutOrCopied()) {
            showDialog = true;
          }
          break;
        case 'releasecaret':
          // Show the dialog if it was shown when pressing the caret.
          if (this._transitionStateOnPressCaret === 'opened') {
            showDialog = true;
          }
          this._transitionStateOnPressCaret = null;
          break;
        default:
          // Not allow
          break;
      }

      if (showDialog) {
        detail.commands.canCut = false;
        detail.commands.canCopy = false;
        detail.commands.canSelectAll = false;
        this.show(detail);
      } else {
        this.hide();
      }
    };

  AppTextSelectionDialog.prototype._onSelectionMode =
    function tsd__onSelectionMode(detail) {
      // make sure cut command option is only shown on editable element
      detail.commands.canCut = detail.commands.canCut &&
                                 detail.selectionEditable;
      this.show(detail);
    };

  AppTextSelectionDialog.prototype._fetchElements =
    function tsd__fetchElements() {
      this.element = document.getElementById(this.CLASS_NAME + this.instanceID);
      this.elements = {};

      var toCamelCase = function toCamelCase(str) {
        return str.replace(/\-(.)/g, function replacer(str, p1) {
          return p1.toUpperCase();
        });
      };

      this.elementClasses = ['copy', 'cut', 'paste', 'selectall'];

      // Loop and add element with camel style name to Modal Dialog attribute.
      this.elementClasses.forEach(function createElementRef(name) {
        this.elements[toCamelCase(name)] =
          this.element.querySelector('.' + this.ELEMENT_PREFIX + name);
      }, this);
    };

  AppTextSelectionDialog.prototype._registerEvents =
    function tsd__registerEvents() {
      var elements = this.elements;
      for (var ele in elements) {
        elements[ele].addEventListener('mousedown',
          this._elementEventHandler.bind(this));

        // We should not send command to gecko if user move their finger out of
        // the original button.
        elements[ele].addEventListener('mouseout',
          this._elementEventHandler.bind(this));
        elements[ele].addEventListener('click',
          this._elementEventHandler.bind(this));
      }

      this.element.addEventListener('transitionend',
        this._elementEventHandler.bind(this));
    };

  AppTextSelectionDialog.prototype._elementEventHandler =
    function tsd__elementEventHandler(evt) {
      switch (evt.type) {
        case 'mousedown':
          this._isCommandSendable = true;
          evt.preventDefault();
          break;
        case 'transitionend':
          if (this._transitionState === 'closing') {
            this._changeTransitionState('closed');
          }
          break;
        case 'click':
          this[evt.target.dataset.action + 'Handler'] &&
            this[evt.target.dataset.action + 'Handler'](evt);
          break;
        case 'mouseout':
          this._isCommandSendable = false;
          break;
      }
    };

  AppTextSelectionDialog.prototype._changeTransitionState =
    function tsd__changeTransitionState(state) {
      if (!this.element) {
        return;
      }
      switch (state) {
        case 'opened':
          this.element.classList.add('active');
          this.element.classList.add('visible');
          break;
        case 'closing':
          this.element.classList.remove('visible');
          break;
        case 'closed':
          this.element.classList.remove('active');
          break;
      }

      this._transitionState = state;
    };

  AppTextSelectionDialog.prototype._doCommand =
    function tsd_doCommand(evt, cmd, closeDialog) {
      if (!this._isCommandSendable) {
        return;
      }
      if (this.app && this.app.element) {
        if (this.textualmenuDetail) {
          this.textualmenuDetail.sendDoCommandMsg(cmd);
        }
      } else {
        var props = {
          detail: {
            type: 'copypaste-do-command',
            cmd: cmd
          }
        };
        this.debug(JSON.stringify(props));

        window.dispatchEvent(
          new CustomEvent('mozContentEvent', props));
      }

      if (closeDialog) {
        this.close();
      }
      evt.preventDefault();
    };

  AppTextSelectionDialog.prototype.copyHandler =
    function tsd_copyHandler(evt) {
      this._doCommand(evt, 'copy', true);
      this.globalStates.launchHasCutOrCopiedTimer();
  };

  AppTextSelectionDialog.prototype.cutHandler =
    function tsd_cutHandler(evt) {
      this._doCommand(evt, 'cut', true);
      this.globalStates.launchHasCutOrCopiedTimer();
  };

  AppTextSelectionDialog.prototype.pasteHandler =
    function tsd_pasteHandler(evt) {
      this._doCommand(evt, 'paste', true);
      this.globalStates.cancelHasCutOrCopiedTimer();
  };

  AppTextSelectionDialog.prototype.selectallHandler =
    function tsd_selectallHandler(evt) {
      this._doCommand(evt, 'selectall', false);
  };

  AppTextSelectionDialog.prototype.view = function tsd_view() {
    var id = this.CLASS_NAME + this.instanceID;
    var temp = `<div class="textselection-dialog" id="${id}">
              <div data-action="selectall"
                class="textselection-dialog-selectall"></div>
              <div data-action="cut" class="textselection-dialog-cut"></div>
              <div data-action="copy" class="textselection-dialog-copy">
                </div>
              <div data-action="paste" class="textselection-dialog-paste">
                </div>
            </div>`;
    return temp;
  };

  AppTextSelectionDialog.prototype.show = function tsd_show(detail) {
    var numOfSelectOptions = 0;
    var options = [ 'Paste', 'Copy', 'Cut', 'SelectAll' ];

    // Check this._injected here to make sure this.elements is initialized.
    if (!this._injected) {
      this.render();
      this._injected = true;
    }

    // Based on UI spec, we should have dividers ONLY between each select option
    // So, we use css to put divider in pseudo element and set the last visible
    // option without it.
    var lastVisibleOption;
    options.forEach(function(option) {
      if (detail.commands['can' + option]) {
        numOfSelectOptions++;
        lastVisibleOption = this.elements[option.toLowerCase()];
        lastVisibleOption.classList.remove('hidden', 'last-option');
      } else {
        this.elements[option.toLowerCase()].classList.add('hidden');
      }
    }, this);

    this.numOfSelectOptions = numOfSelectOptions;
    this.textualmenuDetail = detail;
    // Add last-option class to the last item of options array;
    if (lastVisibleOption) {
      lastVisibleOption.classList.add('last-option');
    }

    this.updateDialogPosition();
  };

  AppTextSelectionDialog.prototype.updateDialogPosition =
    function tsd_updateDialogPosition() {
      var pos = this.calculateDialogPostion();
      this.debug(JSON.stringify(pos));
      this.element.style.top = pos.top + 'px';
      this.element.style.left = pos.left + 'px';
      this.element.style.height = this.TEXTDIALOG_HEIGHT + 'px';
      this._changeTransitionState('opened');
    };

  AppTextSelectionDialog.prototype.calculateDialogPostion =
    function tsd_calculateDialogPostion() {
      var numOfSelectOptions = this.numOfSelectOptions;
      var detail = this.textualmenuDetail;
      var frameHeight = Service.query('LayoutManager.height') ||
        window.innerHeight;
      var frameWidth = Service.query('LayoutManager.width') ||
        window.innerWidth;
      var selectOptionWidth = this.TEXTDIALOG_WIDTH;
      var selectOptionHeight = this.TEXTDIALOG_HEIGHT;

      var selectDialogTop = (detail.rect.top) *
        detail.zoomFactor;
      var selectDialogBottom =
        (detail.rect.bottom) * detail.zoomFactor;
      var selectDialogLeft = (detail.rect.left) *
        detail.zoomFactor;
      var selectDialogRight =
        (detail.rect.right) * detail.zoomFactor;
      var distanceFromBottom = this.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP;
      var distanceFromTop = this.DISTANCE_FROM_MENUBOTTOM_TO_SELECTEDAREA;

      var posTop = selectDialogTop - selectOptionHeight - distanceFromTop;
      // Dialog position align to the center of selected area.
      var posLeft = (selectDialogLeft + selectDialogRight -
        numOfSelectOptions * selectOptionWidth)/ 2;

      // Put dialog under selected area if it overlap statusbar.
      if (posTop < 0) {
        posTop = selectDialogBottom + distanceFromBottom;
      }

      // Put dialog in the center of selected area if it overlap keyboard.
      if (posTop >= (frameHeight - distanceFromBottom - selectOptionHeight)) {
        posTop = (((selectDialogTop >= 0) ? selectDialogTop : 0) +
          ((selectDialogBottom >= frameHeight) ? frameHeight :
            selectDialogBottom) - selectOptionHeight) / 2;
      }

      if (posLeft < this.DISTANCE_FROM_BOUNDARY) {
        posLeft = this.DISTANCE_FROM_BOUNDARY;
      }

      if ((posLeft + numOfSelectOptions * selectOptionWidth +
           this.DISTANCE_FROM_BOUNDARY) > frameWidth) {
        posLeft = frameWidth - numOfSelectOptions * selectOptionWidth -
          this.DISTANCE_FROM_BOUNDARY;
      }

      var offset = 0;
      if (this.app && this.app.appChrome) {
        offset = this.app.appChrome.isMaximized() ?
                 this.app.appChrome.height -
                   this.app.appChrome.scrollable.scrollTop :
                 Service.query('Statusbar.height');
      }

      return {
        top: posTop + offset,
        left: posLeft
      };
    };

  AppTextSelectionDialog.prototype.hide = function tsd_hide() {
    if (!this.element) {
      return;
    }
    this._changeTransitionState('closing');
  };

  AppTextSelectionDialog.prototype.close = function tsd_close() {
    if (this._transitionState !== 'opened') {
      return;
    }
    this.hide();
    this.element.blur();
    this.textualmenuDetail = null;
  };

  exports.AppTextSelectionDialog = AppTextSelectionDialog;
}(window));
