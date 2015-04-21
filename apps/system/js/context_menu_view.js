/* exported ContextMenuView */
/* global BaseUI, Service */
(function(exports) {
  'use strict';

  var _id = 0;
  /**
   * The ContextMenu UI for BrowserContextMenu.
   *
   * @class ContextMenuView
   * @param {AppWindow} app The app window instance
   *                        where this dialog should popup.
   * @extends BaseUI
   */
  function ContextMenuView(app) {
    this.app = app;
    this.containerElement = app.element;
    this.instanceID = _id++;
    this._injected = false;
  }

  ContextMenuView.prototype = Object.create(BaseUI.prototype);


  ContextMenuView.prototype.CLASS_NAME = 'BrowserContextMenu';

  ContextMenuView.prototype.ELEMENT_PREFIX = 'contextmenu-';

  ContextMenuView.prototype.customID = function am_customID() {
    return 'context-menu';
  };

  ContextMenuView.prototype._fetchElements = function bcm__fetchElements() {
    this.element = this.containerElement.querySelector('#' + this.CLASS_NAME +
                                                       this.instanceID);
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
    cancel.id = 'ctx-cancel-button';
    cancel.dataset.action = 'cancel';
    cancel.setAttribute('data-l10n-id', 'cancel');
    this.elements.cancel = cancel;
  };

  ContextMenuView.prototype._registerEvents = function() {
    this.elements.cancel.addEventListener('click', this.hide.bind(this));
  };

  ContextMenuView.prototype.view = function() {
    var id = this.CLASS_NAME + this.instanceID;
    var content = `<form class="contextmenu" role="dialog" tabindex="-1"
              data-type="action" id="${id}">
              <header class="contextmenu-header"></header>
              <menu class="contextmenu-list"></menu>
            </form>`;
    return content;
  };

  ContextMenuView.prototype.kill = function() {
    this.containerElement.removeChild(this.element);
  };


  ContextMenuView.prototype.show = function(menu) {
    if (!this._injected) {
      this.render();
      this._injected = true;
    }

    this.buildMenu(menu);
    this.element.classList.add('visible');
    // The focus switch should be after this module is already shown.
    Service.request('focus');
  };

  ContextMenuView.prototype.hide = function(evt) {
    if (!this.element) {
      return;
    }

    if (evt) {
      evt.preventDefault();
    }

    this.element.classList.remove('visible');
    // We should request focus after removing visible because others may check
    // if this view is visible.
    Service.request('focus');
  };

  ContextMenuView.prototype.buildMenu = function(items) {
    this.elements.list.innerHTML = '';
    items.forEach(function traveseItems(item) {
      var action = document.createElement('button');
      action.dataset.id = item.id;
      action.dataset.value = item.value;
      action.textContent = item.label;

      if (item.icon) {
        action.classList.add(item.iconClass || 'icon');
        action.style.backgroundImage = 'url(' + item.icon + ')';
      }

      action.addEventListener('click', function(evt) {
        this.hide(evt);
        item.callback();
      }.bind(this));

      this.elements.list.appendChild(action);
    }, this);

    this.elements.list.appendChild(this.elements.cancel);
  };

  ContextMenuView.prototype.focus = function() {
    setTimeout(function() {
      document.activeElement.blur();
      this.elements.cancel.focus();
    }.bind(this));
  };

  exports.ContextMenuView = ContextMenuView;

})(window);
