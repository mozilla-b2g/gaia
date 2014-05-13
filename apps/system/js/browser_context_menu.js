/* global MozActivity, AppWindow */

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
  var BrowserContextMenu = window.BrowserContextMenu = function(app) {
    this.app = app;
    this.containerElement = app.element;
    this.event = null;
    // One to one mapping.
    this.instanceID = _id++;
    this._injected = false;
    this.app.element.addEventListener('mozbrowsercontextmenu', this);
    return this;
  };

  BrowserContextMenu.prototype = Object.create(window.BaseUI.prototype);
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

  BrowserContextMenu.prototype._registerEvents = function() {
    this.elements.cancel.addEventListener('click', this.hide.bind(this));
  };

  BrowserContextMenu.prototype.view = function() {
    return '<form class="contextmenu" role="dialog" tabindex="-1"' +
              ' data-type="action" ' +
              'id="' + this.CLASS_NAME + this.instanceID + '">' +
              '<header class="contextmenu-header"></header>' +
              '<menu class="contextmenu-list"></menu>' +
            '</form>';
  };

  BrowserContextMenu.prototype.kill = function() {
    this.containerElement.removeChild(this.element);
  };

  BrowserContextMenu.prototype.show = function() {
    var evt = this.event;
    var detail = evt.detail;

    var hasContextMenu = detail.contextmenu &&
      detail.contextmenu.items.length > 0;
    var hasSystemTargets = detail.systemTargets &&
      detail.systemTargets.length > 0;

    // systemTargets are currently disabled for non browsing contexts
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1010160
    if (!(hasContextMenu || (hasSystemTargets && this.app.isBrowser()))) {
      return;
    }

    // Notify the embedder we are handling the context menu
    evt.preventDefault();

    this.buildMenu(this._listItems(detail));
    this.element.classList.add('visible');
  };

  BrowserContextMenu.prototype.buildMenu = function(items) {
    var self = this;
    this.elements.list.innerHTML = '';
    items.forEach(function traveseItems(item) {
      var action = document.createElement('button');
      action.dataset.value = item.value;
      action.textContent = item.label;

      if (item.icon) {
        action.classList.add(item.iconClass || 'icon');
        action.style.backgroundImage = 'url(' + item.icon + ')';
      }

      action.addEventListener('click', function(evt) {
        self.hide(evt);
        item.callback();
      });

      this.elements.list.appendChild(action);
    }, this);

    this.elements.cancel.textContent = _('cancel');
    this.elements.list.appendChild(this.elements.cancel);
  };

  BrowserContextMenu.prototype._listItems = function(detail) {

    var items = [];

    // contextmenu.items are specified by the web content via html5
    // context menu api
    if (detail.contextmenu && detail.contextmenu.items.length) {
      detail.contextmenu.items.forEach(function(choice, index) {
        items.push({
          label: choice.label,
          icon: choice.icon,
          callback: function() {
            detail.contextMenuItemSelected(choice.id);
          }
        });
      });
    }

    if (detail.systemTargets) {
      detail.systemTargets.forEach(function(item) {
        this.generateSystemMenuItem(item).forEach(function(menuItem) {
          items.push(menuItem);
        });
      }, this);
    }

    return items;
  };

  BrowserContextMenu.prototype.hide = function(evt) {
    if (evt) {
      evt.preventDefault();
    }
    this.element.blur();
    this.element.classList.remove('visible');
    if (this.app) {
      this.app.focus();
    }
  };

  BrowserContextMenu.prototype.openUrl = function(url) {
    // We dont use an activity as that will open the url
    // in this frame, we want to ensure a new window is opened
    var app = new AppWindow({
      oop: true,
      useAsyncPanZoom: true,
      url: url
    });
    app.requestOpen();
  };

  BrowserContextMenu.prototype.shareUrl = function(url) {
    var activity = new MozActivity({
      name: 'share',
      data: {type: 'url', url: url}
    });
    activity.onsuccess = function() {};
  };

  BrowserContextMenu.prototype.bookmarkUrl = function(url) {
    var activity = new MozActivity({
      name: 'save-bookmark',
      data: {type: 'url', url: url}
    });
    activity.onsuccess = function() {};
  };

  BrowserContextMenu.prototype.generateSystemMenuItem = function(item) {
    switch (item.nodeName) {
      case 'A':
        return [{
          id: 'open-in-new-tab',
          label: _('open-in-new-tab'),
          callback: this.openUrl.bind(this, item.data.uri)
        }, {
        // TODO: requires the text description from the link
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1009351
        //
        //   id: 'bookmark-link',
        //   label: _('add-to-home-screen'),
        //   callback: this.bookmarkUrl.bind(this, [item.data.uri])
        // }, {
          id: 'share-link',
          label: _('share-link'),
          callback: this.shareUrl.bind(this, item.data.uri)
        }];
      default:
        return [];
    }
  };

}(this));
