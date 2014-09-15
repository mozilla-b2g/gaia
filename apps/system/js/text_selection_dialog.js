/* global layoutManager */
'use strict';
(function(exports) {
  var DEBUG = false;
  /**
   * Text Selection Dialog of the AppWindow
   */

  var TextSelectionDialog = function () {
    this.containerElement =
      document.getElementById('TextSelectionDialogRoot');
    this.event = null;
    this._hideTimeout = null;
    this._injected = false;
    this._hasCutOrCopied = false;
    this._ignoreSelectionChange = false;
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
    switch(evt.type) {
      case 'value-selector-showed':
        this._ignoreSelectionChange = true;
        break;
      case 'value-selector-hidden':
        this._ignoreSelectionChange = false;
        break;
      case 'mozChromeEvent':
        if (evt.detail.type !== 'selectionchange' ||
            this._ignoreSelectionChange) {
          return;
        }
        this.event = evt;
        evt.preventDefault();
        evt.stopPropagation();
        this.textualmenuDetail = this.event.detail.detail;
        if (!this._injected) {
          this.render();
        }
        this.show();
        this._injected = true;
        break;
    }
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
      elements.copy.addEventListener('mousedown', this.copyHandler.bind(this));
      elements.cut.addEventListener('mousedown', this.cutHandler.bind(this));
      elements.paste.addEventListener('mousedown',
        this.pasteHandler.bind(this));
      elements.selectall.addEventListener('mousedown',
        this.selectallHandler.bind(this));
  };

  TextSelectionDialog.prototype._doCommand =
    function tsd_doCommand(evt, cmd) {
      var props = {
        detail: {
          type: 'do-command',
          cmd: cmd
        }
      };
      window.dispatchEvent(
        new CustomEvent('mozContentEvent', props));
      this.hide();
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
    var temp = '<div class="textselection-dialog"' +
            ' id="' + this.ID_NAME + '">' +
              '<div class="textselection-dialog-selectall"></div>' +
              '<div class="textselection-dialog-cut"></div>' +
              '<div class="textselection-dialog-copy"></div>' +
              '<div class="textselection-dialog-paste"></div>' +
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

  TextSelectionDialog.prototype.show = function tsd_show() {
    if (!this.event) {
      return;
    }
    var evt = this.event;
    var detail = this.textualmenuDetail;
    this.debug(JSON.stringify(detail));

    // When selectall and contents contains br frame, gecko will bubble up
    // a null reasons to filter it. We should ignore it in case hidding
    // the dialog.
    if (detail.reasons.length === 0) {
      return;
    }

    var isTempShortcut = this._hasCutOrCopied && detail.isCollapsed;

    // When selectall happened, gecko will first collapse the range then
    // select all. So we will receive two selection change events with
    // SELECTALL_REASON. We filter first event by check the length of
    // selectedText.
    if ((detail.reasons.indexOf('mouseup') === -1 &&
        (detail.reasons.indexOf('selectall') === -1 || detail.isCollapsed)) ||
        // In collapsed mode, only temp shortcut allowed.
        (detail.isCollapsed && !isTempShortcut)) {
      this.hide();
      return;
    }

    clearTimeout(this._hideTimeout);
    var numOfSelectOptions = 0;
    var options = [ 'Paste', 'Copy', 'Cut', 'SelectAll' ];

    // In collapsed mode, only paste option will be displaed if we have copied
    // or cut before.
    if (isTempShortcut) {
      detail.commands.canSelectAll = false;
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

    if (numOfSelectOptions === 0) {
      return;
    }

    // Add last-option class to the last item of options array;
    lastVisibleOption.classList.add('last-option');

    var pos = this.calculateDialogPostion(detail, numOfSelectOptions);
    this.debug(pos);
    this.element.style.top = pos.top + 'px';
    this.element.style.left = pos.left + 'px';

    this.element.classList.add('visible');

    if (isTempShortcut) {
      this._hideTimeout = window.setTimeout(function() {
        this.hide();
      }.bind(this), this.SHORTCUT_TIMEOUT);
    }

    evt.preventDefault();
  };

  TextSelectionDialog.prototype.calculateDialogPostion =
    function tsd_calculateDialogPostion(detail, numOfSelectOptions) {
      var frameHeight = layoutManager.height;
      var frameWidth = layoutManager.width;
      var selectOptionWidth = this.TEXTDIALOG_WIDTH;
      var selectOptionHeight = this.TEXTDIALOG_HEIGHT;

      var selectDialogTop = detail.rect.top * detail.zoomFactor;
      var selectDialogBottom =
        detail.rect.bottom * detail.zoomFactor;
      var selectDialogLeft = detail.rect.left * detail.zoomFactor;
      var selectDialogRight =
        detail.rect.right * detail.zoomFactor;
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
    this.element.blur();
    this.element.classList.remove('visible');
    this.textualmenuDetail = null;
    this.event = null;
    clearTimeout(this._hideTimeout);
  };

  exports.TextSelectionDialog = TextSelectionDialog;
}(window));
