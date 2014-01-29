
(function(window) {
  'use strict';

  var _ = navigator.mozL10n.get;
  var _id = 0;
  /**
   * The ContextMenu of the AppWindow.
   *
   * @class BrowserContextMenu
   * @param {AppWindow} app The app window instance
   *                        where this dialog should popup.
   * @extends BaseUI
   */
  var BrowserContextMenu = window.BrowserContextMenu =
    function BrowserContextMenu(app) {
      this.app = app;
      this.containerElement = app.element;
      this.event = null;
      // One to one mapping.
      this.instanceID = _id++;
      this._injected = false;
      try {
        app.element.addEventListener('mozbrowsercontextmenu', this);
      } catch (e) {
        app._dump();
      }
      return this;
  };

  BrowserContextMenu.prototype.__proto__ = window.BaseUI.prototype;
  BrowserContextMenu.prototype.CLASS_NAME = 'BrowserContextMenu';

  BrowserContextMenu.prototype.ELEMENT_PREFIX = 'contextmenu-';

  BrowserContextMenu.prototype.customID = function am_customID() {
    if (this.app) {
      return '[' + this.app.origin + ']';
    } else {
      return '';
    }
  };

  BrowserContextMenu.prototype.handleEvent = function bcm_handleEvent(evt) {
    evt.preventDefault();
    this.event = evt;
    if (!this._injected) {
      this.render();
    }
    this.show();
    this._injected = true;
  };

  BrowserContextMenu.prototype._fetchElements = function bcm__fetchElements() {
    this.element = document.getElementById(this.CLASS_NAME + this.instanceID);
    this.elements = {};

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    this.elementClasses = ['header', 'list'];

    // Loop and add element with camel style name to Modal Dialog attribute.
    this.elementClasses.forEach(function createElementRef(name) {
      this.elements[toCamelCase(name)] =
        this.element.querySelector('.' + this.ELEMENT_PREFIX + name);
    }, this);
    var cancel = document.createElement('button');
    cancel.dataset.action = 'cancel';
    cancel.dataset.l10nId = 'cancel';
    this.elements.cancel = cancel;
  };

  BrowserContextMenu.prototype._registerEvents =
    function bcm__registerEvents() {
      var elements = this.elements;
      elements.list.addEventListener('click', this.selectedHandler.bind(this));
  };

  BrowserContextMenu.prototype.selectedHandler =
    function bcm_selectedHandler(evt) {
      evt.preventDefault();
      var target = evt.target;
      var action = target.dataset.action;
      if (action && action === 'cancel') {
        this.hide();
        return;
      }

      var value = target.dataset.value;
      if (!value) {
        return;
      }
      value = parseInt(value, 10);
      this.hide();

      this.event.contextMenuItemSelected &&
        this.event.contextMenuItemSelected(value);
  };

  BrowserContextMenu.prototype.view = function bcm_view() {
    return '<form class="contextmenu" role="dialog" tabindex="-1"' +
              ' data-type="action" ' +
              'id="' + this.CLASS_NAME + this.instanceID + '">' +
              '<header class="contextmenu-header"></header>' +
              '<menu class="contextmenu-list"></menu>' +
            '</form>';
  };

  BrowserContextMenu.prototype.kill = function bcm_kill() {
    this.containerElement.removeChild(this.element);
  };

  BrowserContextMenu.prototype.show = function bcm_show() {
    if (!this.event) {
      return;
    }
    var evt = this.event;
    var detail = evt.detail;
    if (!detail.contextmenu || detail.contextmenu.items.length === 0) {
      return;
    }
    var choices = detail.contextmenu.items;
    this.buildMenu(this._listItems(choices));
    this.element.classList.add('visible');
    evt.preventDefault();
  };

  BrowserContextMenu.prototype.buildMenu = function bcm_show(items) {
    this.elements.list.innerHTML = '';
    items.forEach(function traveseItems(item) {
      var action = document.createElement('button');
      action.dataset.value = item.value;
      action.textContent = item.label;
      if (item.icon) {
        action.classList.add(item.iconClass || 'icon');
        action.style.backgroundImage = 'url(' + item.icon + ')';
      }
      this.elements.list.appendChild(action);
    }, this);

    this.elements.cancel.textContent = _('cancel');
    this.elements.list.appendChild(this.elements.cancel);
  };

  BrowserContextMenu.prototype._listItems = function bcm__listItems(choices) {
    var items = [];

    choices.forEach(function(choice, index) {
      items.push({
        label: choice.label,
        icon: choice.icon,
        value: index
      });
    });
    return items;
  };

  BrowserContextMenu.prototype.hide = function bcm_hide() {
    this.element.blur();
    this.element.classList.remove('visible');
    if (this.app) {
      this.app.focus();
    }
  };
}(this));
