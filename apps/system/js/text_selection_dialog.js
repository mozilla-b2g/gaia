/* global layoutManager */
'use strict';
(function(exports) {

  var _id = 0;

  /**
   * Text Selection Dialog of the AppWindow
   */

  var TextSelectionDialog = function (app) {
    if (app) {
      this.app = app;
      this.containerElement = app.element;
    } else {
      this.containerElement =
        document.getElementById('TextSelectionDialogRoot');
    }
    this.event = null;
    // One to one mapping
    this.instanceID = _id++;
    this._injected = false;
    if (app) {
      app.element.addEventListener('mozbrowsertextualmenu', this, false);
    } else {
      window.addEventListener('mozChromeEvent', this);
    }
  };

  TextSelectionDialog.prototype = Object.create(window.BaseUI.prototype);

  TextSelectionDialog.prototype.TEXTDIALOG_HEIGHT = 52;

  TextSelectionDialog.prototype.TEXTDIALOG_WIDTH = 52;
  
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

  TextSelectionDialog.prototype.CLASS_NAME = 'TextSelectionDialog';

  TextSelectionDialog.prototype.ELEMENT_PREFIX = 'textselection-dialog-';

  TextSelectionDialog.prototype.customID = function tsd_customID() {
    if (this.app) {
      return '[' + this.app.origin + ']';
    } else {
      return '';
    }
  };

  TextSelectionDialog.prototype.handleEvent = function tsd_handleEvent(evt) {
    if (evt.type === 'mozChromeEvent' && evt.detail.type != 'textualmenu') {
      return;
    }
    this.event = evt;
    evt.preventDefault();
    evt.stopPropagation();
    if (this.app) {
      this.textualmenuDetail = this.event.detail;
    } else {
      this.textualmenuDetail = this.event.detail.detail;
    }
    if (!this._injected) {
      this.render();
    }
    this.show();
    this._injected = true;
  };

  TextSelectionDialog.prototype._fetchElements = function tsd__fetchElements() {
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

  TextSelectionDialog.prototype.copyHandler =
    function tsd_copyHandler(evt) {
      this.textualmenuDetail.copyToClipboard();
      this.hide();
      evt.preventDefault();
  };

  TextSelectionDialog.prototype.cutHandler =
    function tsd_cutHandler(evt) {
      this.textualmenuDetail.cutToClipboard();
      this.hide();
      evt.preventDefault();
  };

  TextSelectionDialog.prototype.pasteHandler =
    function tsd_pasteHandler(evt) {
      this.textualmenuDetail.pasteFromClipboard();
      this.hide();
      evt.preventDefault();
  };

  TextSelectionDialog.prototype.selectallHandler =
    function tsd_selectallHandler(evt) {
      this.textualmenuDetail.selectall();
      this.hide();
      evt.preventDefault();
  };

  TextSelectionDialog.prototype.view = function tsd_view() {
    var temp = '<div class="textselection-dialog"' +
            ' id="' + this.CLASS_NAME + this.instanceID + '">' +
              '<div class="textselection-dialog-copy"></div>' +
              '<div class="textselection-dialog-cut"></div>' +
              '<div class="textselection-dialog-paste"></div>' +
              '<div class="textselection-dialog-selectall"></div>' +
            '</div>';
    return temp;
  };

  TextSelectionDialog.prototype.kill = function tsd_kill() {
    this.containerElement.removeChild(this.element);
  };

  TextSelectionDialog.prototype.show = function tsd_show() {
    if (!this.event) {
      return;
    }
    var evt = this.event;
    var detail = this.textualmenuDetail;

    var numOfSelectOptions = 0;
    var options = ['SelectAll' , 'Paste', 'Cut', 'Copy'];

    // Based on UI spec, we should have dividers ONLY between each select option
    // So, we use css to put divider in pseudo element and set the last visible
    // option without it.
    var lastVisibleOption;
    options.forEach(function(option) {
      if (detail['can' + option]) {
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
    this.element.style.top = pos.top + 'px';
    this.element.style.left = pos.left + 'px';

    this.element.classList.add('visible');
    evt.preventDefault();
  };

  TextSelectionDialog.prototype.calculateDialogPostion =
    function tsd_calculateDialogPostion(detail, numOfSelectOptions) {
      var frameHeight = layoutManager.height;
      var frameWidth = layoutManager.width;
      var selectOptionWidth = this.TEXTDIALOG_WIDTH;
      var selectOptionHeight = this.TEXTDIALOG_HEIGHT;

      var selectDialogTop = detail.top * (this.app ? 1 : detail.zoomFactor);
      var selectDialogBottom =
        detail.bottom * (this.app ? 1 : detail.zoomFactor);
      var selectDialogLeft = detail.left * (this.app ? 1 : detail.zoomFactor);
      var selectDialogRight =
        detail.right * (this.app ? 1 : detail.zoomFactor);
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
        top: posTop + (this.app ? 0 : detail.frameOffsetY),
        left: posLeft + (this.app ? 0 : detail.frameOffsetX)
      };
    };

  TextSelectionDialog.prototype.hide = function tsd_hide() {
    this.element.blur();
    this.element.classList.remove('visible');
    if (this.app && this.app.isActive()) {
      this.app.focus();
    }
    this.textualmenuDetail = null;
    this.event = null;
  };

  exports.TextSelectionDialog = TextSelectionDialog;
}(window));
