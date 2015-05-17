/* global SystemDialog */

'use strict';

(function(exports) {
  /**
   * @class ActionMenu
   * @param {options} object for attributes `onShow`, `onHide` callback.
   * @extends SystemDialog
   */

  var ActionMenu = function(controller) {
    this.instanceID = 'action-menu';
    this.controller = controller;
    this.onselected = controller.successCb || function() {};
    this.oncancel = controller.cancelCb || function() {};
    this.options = {};

    /**
     * render the dialog
     */
    this.render();
    this.publish('created');
  };

  ActionMenu.prototype = Object.create(SystemDialog.prototype);

  ActionMenu.prototype.customID = 'action-menu';

  ActionMenu.prototype.DEBUG = false;

  ActionMenu.prototype.name = 'ActionMenu';

  ActionMenu.prototype.EVENT_PREFIX = 'actionmenu';

  ActionMenu.prototype.view = function spd_view() {
    return `<div id="action-menu" hidden>
              <form id="action-menu-form" data-z-index-level="action-menu"
                role="dialog" data-type="action">
                <header id="action-menu-header" data-l10n-id=""></header>
                <menu id="action-menu-list">
                </menu>
              </form>
            </div>`;
  };

  ActionMenu.prototype._fetchElements = function() {
    this.menu = document.getElementById('action-menu-list');
    this.header = document.getElementById('action-menu-header');
    this.form = document.getElementById('action-menu-form');
  };

  ActionMenu.prototype.show = function(items, titleId, defChoice) {
    this.listItems = items;
    if (titleId) {
      this.header.setAttribute('data-l10n-id', titleId);
    }
    this.askForDefaultChoice = defChoice;
    this._buildMenu(items);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        this.form.classList.add('visible');
        this.active = true;
      });
    });
    SystemDialog.prototype.show.apply(this);
  };

  ActionMenu.prototype.hide = function() {
    var self = this;
    this.form.addEventListener('transitionend', function doHide(e) {
      self.form.removeEventListener('transitionend', doHide);
      SystemDialog.prototype.hide.apply(self);
    });
    this.form.classList.remove('visible');
    this.active = false;
  };

  ActionMenu.prototype._buildMenu = function(items) {
    this.menu.innerHTML = '';
    items.forEach(function traveseItems(item) {
      var action = document.createElement('button');
      action.dataset.value = item.value;
      action.dataset.manifest = item.manifest;
      action.textContent = item.label;

      action.addEventListener('click', function(evt) {
        this.onItemSelected(evt);
      }.bind(this));

      if (item.icon) {
        action.classList.add(item.iconClass || 'icon');
        action.style.backgroundImage = 'url(' + item.icon + ')';
      }
      this.menu.appendChild(action);
    }, this);

    if (this.askForDefaultChoice) {
      this._appendDefault();
    }

    this._appendCancelButton();
  };

  ActionMenu.prototype.onItemSelected = function(evt) {
    evt.preventDefault();
    var target = evt.target;
    var defaultSelected = false;
    if (this.askForDefaultChoice) {
      defaultSelected = !!this.defaultChoiceInput.getAttribute('checked');
    }

    var value = target.dataset.value;
    if (!value) {
      return;
    }
    value = parseInt(value);
    this.hide();
    this.onselected(value, defaultSelected);
  };

  ActionMenu.prototype._appendDefault = function() {
    var defaultChoice = document.createElement('label');
    defaultChoice.setAttribute('class', 'pack-checkbox');
    defaultChoice.setAttribute('data-action', 'set-default-action');

    this.defaultChoiceInput = document.createElement('input');
    this.defaultChoiceInput.setAttribute('type', 'checkbox');

    var defaultChoiceSpan = document.createElement('span');
    defaultChoiceSpan.setAttribute('data-l10n-id',
                                        'set-default-action');
    defaultChoice.appendChild(this.defaultChoiceInput);
    defaultChoice.appendChild(defaultChoiceSpan);

    defaultChoice.addEventListener('click', function(evt) {
      evt.preventDefault();
      this.toggleSetDefaultAction();
    }.bind(this));
    this.menu.appendChild(defaultChoice);
  };

  ActionMenu.prototype._appendCancelButton = function() {
    var button = document.createElement('button');
    button.dataset.action = 'cancel';
    button.dataset.l10nId = 'cancel';
    button.addEventListener('click', function(evt) {
      evt.preventDefault();
      this.hide();
      this.oncancel();
    }.bind(this));
    this.menu.appendChild(button);
  };

  /**
   * This changes the input to be checked or unchecked
   * @memberof ActionMenu.prototype
   */
  ActionMenu.prototype.toggleSetDefaultAction = function() {
    if (!this.defaultChoiceInput) {
      return;
    }

    var checked = this.defaultChoiceInput.checked;
    if (checked) {
      this.defaultChoiceInput.removeAttribute('checked');
    } else {
      this.defaultChoiceInput.setAttribute('checked', true);
    }
  };

  exports.ActionMenu = ActionMenu;
}(window));
