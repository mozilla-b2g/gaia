/**
 * MultipleValueSelector creates a list of options, and a dialog with ok/cancel
 * buttons.
 * The template is shown below:
 *   <fxos-tv-dialog class="modal-dialog multiple-value-selector">
 *     <div class="outer-container">
 *       <div class="container">
 *         <ul class="selector-list-container">
 *           <li class="selector-list-item checked">Item 1</li>
 *           <li class="selector-list-item focused">Item 2</li>
 *           <li class="selector-list-item">Item 3</li>
 *         </ul>
 *         <div class="modal-dialog-button-group">
 *           <fxos-tv-button></fxos-tv-button>
 *           ...
 *           <fxos-tv-button></fxos-tv-button>
 *         </div>
 *       </div>
 *     </div>
 *   </fxos-tv-dialog>
 *
 *  options for open method:
 *    {
 *      list: [... array of items ...]
 *      buttonSettings: { // if we don't have button settings, we use Ok and
 *        l10n: {         // Cancel as text content.
 *          ok: 'l10n-ok',
 *          cancel: 'l10n-cancel'
 *        }
 *      },
 *      onSelected: function() {} // called while user press ok
 *      onCancel: function() {} // called while user press esc or cancel
 *    }
 *
 *  list item:
 *    {
 *      checked: false, // if checked by default, default value is false.
 *      textRaw: 'raw text',
 *      textL10nId: 'text or object for l10n',
 *      defaultFocus: true // the default focus item
 *    }
 *
 */

(function(exports) {
  'use strict';

  var NORMAL_LIST_ITEM_SIZE = 136;
  var SELECTED_LIST_ITEM_SIZE = 164;

  function MultipleValueSelector(container) {
    // call constructor of fxos-tv modal dialog.
    BaseModalDialog.call(this, container);
  }
  // extend from fxos-tv modal dialog
  var proto = Object.create(BaseModalDialog.prototype);

  var NAVIGATION_INDEX = Object.freeze({
    'LIST': 0,
    'CANCEL': 1,
    'OK': 2
  });

  proto._init = function() {
    this._selectedItems = [];
    this._clickedButton = null;
    // listContainer has scroll bar, value selector will calculate the
    // scroll top while focus it.
    this.listContainer = document.createElement('ul');
    this.listContainer.setAttribute('role', 'list');
    this.listContainer.tabIndex = 0;
    this.listContainer.classList.add('selector-list-container');
    this.innerContainer.appendChild(this.listContainer);

    // render button group
    this.buttonGroup = document.createElement('div');
    this.buttonGroup.classList.add('modal-dialog-button-group');
    this.buttonGroup.setAttribute('fxos-tv-bubbles', 'true');

    this.innerContainer.appendChild(this.buttonGroup);

    this.fxosTvBubble = document.createElement('fxos-tv-bubbles');
    this.element.classList.add('multiple-value-selector');

    this._initEventListeners();

    this._listFocus = 0;
    this._moduleFocus = NAVIGATION_INDEX.LIST;
  };

  proto._initEventListeners = function() {
    this.element.addEventListener('will-open', this);
    this.element.addEventListener('will-close', this);
    this.element.addEventListener('opened', this);
    this.element.addEventListener('closed', this);
    this.fxosTvBubble.addEventListener('all-items-bubbled', this);
  };

  proto._render = function() {
    this._renderList();
    this._renderButtons();
  };

  proto._renderList = function() {
    this.listContainer.innerHTML = '';
    this._options.list.forEach(function(item, index) {
      var li = document.createElement('li');
      li.setAttribute('role', 'listitem');
      li.classList.add('selector-list-item');
      if (item.checked) {
        li.classList.add('checked');
      }
      if (item.textRaw) {
        li.textContent = item.textRaw;
      } else if (item.textL10nId) {
        this._setL10n(li, item.textL10nId);
      }
      if (item.defaultFocus) {
        this._defaultListFocus = index;
      }
      this.listContainer.appendChild(li);
    }.bind(this));
  };

  proto._renderButtons = function() {
    this.buttonGroup.innerHTML = '';
    var buttonSettings = this._options.buttonSettings;

    var okButton = document.createElement('fxos-tv-button');
    okButton.setAttribute('type', 'circle-text');
    if (buttonSettings && buttonSettings.l10n && buttonSettings.l10n.ok) {
      this._setL10n(okButton, buttonSettings.l10n.ok);
    } else {
      okButton.textContent = 'Ok';
    }
    okButton.classList.add('primary');
    okButton.addEventListener('click', this);

    var cancelButton = document.createElement('fxos-tv-button');
    cancelButton.setAttribute('type', 'circle-text');
    if (buttonSettings && buttonSettings.l10n && buttonSettings.l10n.cancel) {
      this._setL10n(cancelButton, buttonSettings.l10n.cancel);
    } else {
      cancelButton.textContent = 'cancel';
    }
    cancelButton.addEventListener('click', this);

    this.buttonGroup.appendChild(cancelButton);
    this.buttonGroup.appendChild(okButton);
    this.okButton = okButton;
    this.cancelButton = cancelButton;
  };

  proto.handleEvent = function (e) {

    if (e.type === 'keydown') {
      this._handleKeyDownEvent(e);
    } else if (e.type === 'keyup') {
      this._handleKeyUpEvent(e);
    } else if (e.type === 'click') {
      this._clickedButton = e.target;
      this.element.close();
      this.element.focus();
    } else {
      switch(e.target) {
        case this.element:
          if (e.type === 'will-open' || e.type === 'will-close') {
            this.fireEvent('modal-dialog-' + e.type);
          } else if (e.type === 'opened') {
            this.scrollToIndex(this._listFocus);
            // Play bubble animation when the fxos-tv-dialog is opened
            this.fxosTvBubble.play([this.cancelButton, this.okButton]);
          } else if (e.type === 'closed') {
            // Do click actions when the fxos-tv-dialog is closed
            this.element.classList.remove('visible');
            if (this._clickedButton === this.okButton && this._onSelected) {
              this._onSelected(this._selectedItems);
            } else if (this.onCancel) {
              // ESC key enter
              this.onCancel();
            }
            this.isOpened = false;
            this.stopKeyNavigation();
            this.element.classList.remove('modal-dialog-opened');
            this.fireEvent('modal-dialog-closed');
          }
          break;
        case this.fxosTvBubble:
          // all items bubbled
          this.element.classList.add('modal-dialog-opened');
          this.startKeyNavigation();
          this.focus();
          this.fireEvent('modal-dialog-opened');
          break;
      }
    }
  };

  proto.startKeyNavigation = function() {
    this.element.addEventListener('keydown', this);
    this.element.addEventListener('keyup', this);
    this.focus();
  };

  proto.stopKeyNavigation = function() {
    this.element.removeEventListener('keyup', this);
  };

  proto._handleKeyDownEvent = function(e) {
    if (e.keyCode === KeyEvent.DOM_VK_UP) {
      this.moveUp(e);
    } else if (e.keyCode === KeyEvent.DOM_VK_DOWN) {
      this.moveDown(e);
    } else if (e.keyCode === KeyEvent.DOM_VK_LEFT) {
      this.moveLeft(e);
    } else if (e.keyCode === KeyEvent.DOM_VK_RIGHT) {
      this.moveRight(e);
    } else if (e.keyCode == KeyEvent.DOM_VK_TAB) {
      e.preventDefault();
      if (this._moduleFocus === 2) {
        this._moduleFocus = 0;
      } else {
        this._moduleFocus = this._moduleFocus === 2 ? 0 : this._moduleFocus + 1;
      }

      this.focus();
    }
  };

  proto._handleKeyUpEvent = function(e) {
    if (e.keyCode === KeyEvent.DOM_VK_RETURN && this._focusedListItem) {
      this._focusedListItem.classList.toggle('checked');
      if (this._focusedListItem.classList.contains('checked')) {
        this._selectedItems.push(this._itemList[this._listFocus]);
      } else {
        var idx = this._selectedItems.indexOf(this._itemList[this._listFocus]);
        if (idx > -1) {
          this._selectedItems.splice(idx, 1);
        }
      }
    }
  };

  // handle list focus
  proto.moveUp = function(e) {
    if (this._moduleFocus !== NAVIGATION_INDEX.LIST ||
        this._listFocus < 1) {
      return;
    }

    this._listFocus--;
    this.focus();
    e.preventDefault();
  };

  proto.moveDown = function(e) {
    if (this._moduleFocus !== NAVIGATION_INDEX.LIST ||
        this._listFocus > this._itemList.length - 2) {
      return;
    }

    this._listFocus++;
    this.focus();
    e.preventDefault();
  };

  // handle module focus
  proto.moveLeft = function(e) {
    if (this._moduleFocus < 1) {
      return;
    }

    this._moduleFocus--;
    this.focus();
  };

  proto.moveRight = function(e) {
    // we only have three modules: list, cancel, and ok
    if (this._moduleFocus > 1) {
      // Do nothing when focus index is at the last element
      return;
    }

    this._moduleFocus++;
    this.focus();
  };

  proto.scrollToIndex = function(index) {
    var top = this.listContainer.scrollTop;
    var bottom = top + this.listContainer.clientHeight;

    var itemTop = NORMAL_LIST_ITEM_SIZE * index;
    var itemBottom = itemTop + SELECTED_LIST_ITEM_SIZE;

    if (top > itemTop) {
      // item is at top
      this.listContainer.scrollTop = itemTop;
    } else if (bottom < itemBottom) {
      // item is at bottom
      this.listContainer.scrollTop += (itemBottom - bottom);
    }
  };

  proto._focusContent = function() {
    if (this._focusedListItem) {
      this._focusedListItem.classList.remove('focused');
      this._focusedListItem = null;
      this.listContainer.classList.remove('focused');
    }

    switch(this._moduleFocus) {
      case NAVIGATION_INDEX.LIST:
        this._focusedListItem = this.listContainer.children[this._listFocus];
        this._focusedListItem.classList.add('focused');
        this.listContainer.classList.add('focused');
        this.scrollToIndex(this._listFocus);
        this.listContainer.focus();
        break;
      case NAVIGATION_INDEX.CANCEL:
        this.cancelButton.focus();
        break;
      case NAVIGATION_INDEX.OK:
        this.okButton.focus();
        break;
    }
  };

  proto._open = function(options) {
    this._options = options;
    this._itemList = options.list;
    this._render();
    this._listFocus = this._defaultListFocus || 0;
    this._moduleFocus = NAVIGATION_INDEX.LIST;

    this._onSelected = this._options.onSelected;

    BaseModalDialog.prototype._open.call(this, options);
  };

  MultipleValueSelector.prototype = proto;
  exports.MultipleValueSelector = MultipleValueSelector;

})(window);
