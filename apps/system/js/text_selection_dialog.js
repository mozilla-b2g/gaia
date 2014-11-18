/* global layoutManager */
'use strict';
(function(exports) {
  var DEBUG = false;
  /**
   * Text Selection Dialog of the AppWindow
   */

  var TextSelectionDialog = function () {
    this.containerElement =
      document.getElementById('text-selection-dialog-root');
    this.event = null;
    this._hideTimeout = null;
    this._injected = false;
    this._hasCutOrCopied = false;
    this._ignoreSelectionChange = false;
    this._isCommandSendable = false;
    this._transitionState = 'closed';
    this._scrolling = false;

    this._previousOffsetX = 0;
    this._previousOffsetY = 0;

    window.addEventListener('activeappchanged', this);
    window.addEventListener('home', this);
    window.addEventListener('mozChromeEvent', this);
    window.addEventListener('value-selector-shown', this);
    window.addEventListener('value-selector-hidden', this);
  };

  TextSelectionDialog.prototype = Object.create(window.BaseUI.prototype);

  TextSelectionDialog.prototype.TEXTDIALOG_HEIGHT = 52;

  TextSelectionDialog.prototype.TEXTDIALOG_WIDTH = 52;

  // Based on UX spec, there would be a temporary shortcut and only appears
  // after the action 'copy/cut'. In this use case, the utility bubble will be
  // time-out after 3 secs if no action is taken.
  TextSelectionDialog.prototype.SHORTCUT_TIMEOUT = 3000;

  // If text is not pasted immediately after copy/cut, the text will be viewed
  // as pasted after 15 seconds (count starting from the moment when there's no
  // action at all), and there will be no paste shortcut pop up when tapping on
  // edit field.
  TextSelectionDialog.prototype.RESET_CUT_OR_PASTE_TIMEOUT = 15000;

  // Distance between selected area and the bottom of menu when menu show on
  // the top of selected area.
  // By UI spec, 12px from the top of dialog to utility menu.
  TextSelectionDialog.prototype.DISTANCE_FROM_MENUBOTTOM_TO_SELECTEDAREA = 12;

  // Distance between selected area and the top of menu when menu show on
  // the bottom of selected area.
  // caret tile height is controlled by gecko, we estimate the height as
  // 22px. So 22px plus 12px which defined in UI spec, we get 34px from
  // the bottom of selected area to utility menu.
  TextSelectionDialog.prototype.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP = 34;

  TextSelectionDialog.prototype.ID_NAME = 'TextSelectionDialog';

  TextSelectionDialog.prototype.ELEMENT_PREFIX = 'textselection-dialog-';

  TextSelectionDialog.prototype.debug = function aw_debug(msg) {
    if (DEBUG || this._DEBUG) {
      console.log('[Dump: ' + this.ID_NAME + ']' +
        JSON.stringify(msg));
    }
  };

  TextSelectionDialog.prototype.handleEvent = function tsd_handleEvent(evt) {
    switch (evt.type) {
      case 'home':
      case 'activeappchanged':
        this.close();
        break;
      case 'value-selector-shown':
        this._ignoreSelectionChange = true;
        break;
      case 'value-selector-hidden':
        this._ignoreSelectionChange = false;
        break;
      case 'mozChromeEvent':
        switch (evt.detail.type) {
          case 'selectionstatechanged':
            this._onSelectionStateChanged(evt);
            break;
          case 'scrollviewchange':
            this.debug('scrollviewchange');
            this.debug(JSON.stringify(evt.detail.detail));
            if (evt.detail.detail.state === 'started' &&
                this._transitionState === 'opened') {
              this._previousOffsetX = evt.detail.detail.scrollX;
              this._previousOffsetY = evt.detail.detail.scrollY;
              this._changeTransitionState('closed');
              this._scrolling = true;
            } else if (evt.detail.detail.state === 'stopped' &&
                       this._scrolling === true) {
              this._scrolling = false;
              this.updateDialogPosition(
                evt.detail.detail.scrollX - this._previousOffsetX,
                evt.detail.detail.scrollY - this._previousOffsetY
              );
              this._previousOffsetX = 0;
              this._previousOffsetY = 0;
            }
            break;
          case 'touchcarettap':
            this.debug('touchcarettap');
            this.show(this.textualmenuDetail);
            this._triggerShortcutTimeout();
            break;
        }
    }
  };

  TextSelectionDialog.prototype._onSelectionStateChanged =
    function tsd__onSelectionStateChanged(evt) {
      if (this._ignoreSelectionChange) {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();

      var detail = evt.detail.detail;
      if (!detail) {
        return;
      }
      this.debug('on receive selection change event');
      this.debug(JSON.stringify(detail));
      var rect = detail.rect;
      var states = detail.states;
      var commands = detail.commands;
      var isCollapsed = detail.isCollapsed;
      var isTempShortcut = this._hasCutOrCopied && isCollapsed;
      var rectHeight = rect.top - rect.bottom;
      var rectWidth = rect.right - rect.left;

      // In collapsed mode, only paste option will be displaed if we have copied
      // or cut before.
      if (isCollapsed && states.indexOf('mouseup') !== -1) {
        this.textualmenuDetail = detail;
        commands.canSelectAll = false;
      }

      // If current element lost focus, we should hide the bubble.
      if (states.indexOf('blur') !== -1) {
        this.hide();
        return;
      }

      // We should hide the bubble when user call selection.collapseToEnd() by
      // script.
      if (states.indexOf('collapsetoend') !== -1) {
        this.hide();
        return;
      }

      if (states.indexOf('mouseup') !== -1 && rectHeight === 0 &&
          rectWidth === 0 && !isTempShortcut) {
        this.hide();
        return;
      }

      // We should not do anything if below cases happen.
      if (states.length === 0 || (
          rectHeight === 0 && rectWidth === 0 && !isTempShortcut) ||
          !(commands.canPaste || commands.canCut || commands.canSelectAll ||
            commands.canCopy)
        ) {
        return;
      }

      if (!this._injected) {
        this.render();
        this._injected = true;
      }

      if (states.indexOf('selectall') !== -1 ||
          states.indexOf('mouseup') !== -1) {
        if (!isTempShortcut && isCollapsed) {
          this.close();
          return;
        }

        this.show(detail);
        if (isTempShortcut) {
          this._triggerShortcutTimeout();
        }
        return;
      }
      this.hide();
    };

  TextSelectionDialog.prototype._triggerShortcutTimeout =
    function tsd__triggerShortcutTimeout() {
      window.clearTimeout(this._hideTimeout);
      this._hideTimeout = window.setTimeout(function() {
        this.close();
      }.bind(this), this.SHORTCUT_TIMEOUT);
    };

  TextSelectionDialog.prototype._fetchElements = function tsd__fetchElements() {
    this.element = document.getElementById(this.ID_NAME);
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

  TextSelectionDialog.prototype._registerEvents =
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

  TextSelectionDialog.prototype._elementEventHandler =
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

  TextSelectionDialog.prototype._changeTransitionState =
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

  TextSelectionDialog.prototype._doCommand =
    function tsd_doCommand(evt, cmd) {
      if (!this._isCommandSendable) {
        return;
      }
      var props = {
        detail: {
          type: 'do-command',
          cmd: cmd
        }
      };
      this.debug(JSON.stringify(props));

      window.dispatchEvent(
        new CustomEvent('mozContentEvent', props));
      this.close();
      evt.preventDefault();
    };

  TextSelectionDialog.prototype.copyHandler =
    function tsd_copyHandler(evt) {
      this._doCommand(evt, 'copy');
      this._resetCutOrCopiedTimer();
      this._hasCutOrCopied = true;
  };

  TextSelectionDialog.prototype.cutHandler =
    function tsd_cutHandler(evt) {
      this._doCommand(evt, 'cut');
      this._resetCutOrCopiedTimer();
      this._hasCutOrCopied = true;
  };

  TextSelectionDialog.prototype.pasteHandler =
    function tsd_pasteHandler(evt) {
      this._doCommand(evt, 'paste');
      this._hasCutOrCopied = false;
      window.clearTimeout(this._resetCutOrCopiedTimeout);
  };

  TextSelectionDialog.prototype.selectallHandler =
    function tsd_selectallHandler(evt) {
      this._doCommand(evt, 'selectall');
  };

  TextSelectionDialog.prototype.view = function tsd_view() {
    var temp = '<div class="textselection-dialog" id="' + this.ID_NAME + '">' +
              '<div data-action="selectall" ' +
                'class="textselection-dialog-selectall"></div>' +
              '<div data-action="cut" class="textselection-dialog-cut"></div>' +
              '<div data-action="copy" class="textselection-dialog-copy">' +
                '</div>' +
              '<div data-action="paste" class="textselection-dialog-paste">' +
                '</div>' +
            '</div>';
    return temp;
  };

  TextSelectionDialog.prototype._resetCutOrCopiedTimer =
    function tsd_resetCutOrCopiedTimer() {
      window.clearTimeout(this._resetCutOrCopiedTimeout);
      this._resetCutOrCopiedTimeout = window.setTimeout(function() {
        this._hasCutOrCopied = false;
      }.bind(this), this.RESET_CUT_OR_PASTE_TIMEOUT);
  };


  TextSelectionDialog.prototype.show = function tsd_show(detail) {

    clearTimeout(this._hideTimeout);
    var numOfSelectOptions = 0;
    var options = [ 'Paste', 'Copy', 'Cut', 'SelectAll' ];

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
    lastVisibleOption.classList.add('last-option');

    this.updateDialogPosition(0, 0);
  };

  TextSelectionDialog.prototype.updateDialogPosition =
    function tsd_updateDialogPosition(scrollOffsetW, scrollOffsetH) {
      var pos = this.calculateDialogPostion(scrollOffsetW, scrollOffsetH);
      this.debug(pos);
      this.element.style.top = pos.top + 'px';
      this.element.style.left = pos.left + 'px';
      this._changeTransitionState('opened');
    };

  TextSelectionDialog.prototype.calculateDialogPostion =
    function tsd_calculateDialogPostion(scrollOffsetW, scrollOffsetH) {
      var numOfSelectOptions = this.numOfSelectOptions;
      var detail = this.textualmenuDetail;
      var frameHeight = layoutManager.height;
      var frameWidth = layoutManager.width;
      var selectOptionWidth = this.TEXTDIALOG_WIDTH;
      var selectOptionHeight = this.TEXTDIALOG_HEIGHT;

      this.debug('scrollOffsetW  ' + scrollOffsetW + '; scrollOffsetH ' +
        scrollOffsetH);
      detail.rect.top -= scrollOffsetH;
      detail.rect.bottom -= scrollOffsetH;
      detail.rect.left -= scrollOffsetW;
      detail.rect.right -= scrollOffsetW;

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

      if (posLeft < 0) {
        posLeft = 0;
      }

      if ((posLeft + numOfSelectOptions * selectOptionWidth) > frameWidth) {
        posLeft = frameWidth - numOfSelectOptions * selectOptionWidth;
      }

      return {
        top: posTop + detail.offsetY,
        left: posLeft + detail.offsetX
      };
    };

  TextSelectionDialog.prototype.hide = function tsd_hide() {
    if (!this.element) {
      return;
    }
    this._changeTransitionState('closing');
  };

  TextSelectionDialog.prototype.close = function tsd_close() {
    if (this._transitionState !== 'opened') {
      return;
    }
    this.hide();
    this.element.blur();
    this.textualmenuDetail = null;
    clearTimeout(this._hideTimeout);
  };

  exports.TextSelectionDialog = TextSelectionDialog;
}(window));
