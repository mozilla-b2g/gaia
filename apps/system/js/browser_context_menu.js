/* global MozActivity */

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
    switch (evt.type) {
      case 'mozbrowsercontextmenu':
        this.show(evt);
        break;
    }
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
    cancel.id = 'ctx-cancel-button';
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

  BrowserContextMenu.prototype.show = function(evt) {
    var detail = evt.detail;

    var hasContextMenu = detail.contextmenu &&
      detail.contextmenu.items.length > 0;
    var hasSystemTargets = detail.systemTargets &&
      detail.systemTargets.length > 0;

    // Nothing to show
    if (!hasSystemTargets && !hasContextMenu) {
      return;
    }

    // context menus in certified apps that only have system targets are
    // currently disabled. https://bugzilla.mozilla.org/show_bug.cgi?id=1010160
    // is tracking reenabling
    if (!hasContextMenu && hasSystemTargets && this.app.isCertified()) {
      return;
    }

    // Notify the embedder we are handling the context menu
    evt.preventDefault();

    this.showMenu(this._listItems(detail));
  };

  BrowserContextMenu.prototype.showMenu = function(menu) {
    if (!this._injected) {
      this.render();
    }
    this._injected = true;
    this.buildMenu(menu);
    this.element.classList.add('visible');
  },

  BrowserContextMenu.prototype.buildMenu = function(items) {
    var self = this;
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
    if (!this.element) {
      return;
    }

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
    /*jshint -W031 */
    new MozActivity({
      name: 'view',
      data: {
        type: 'url',
        url: url
      }
    });
  };

  BrowserContextMenu.prototype.shareUrl = function(url) {
    /*jshint -W031 */
    new MozActivity({
      name: 'share',
      data: {
        type: 'url',
        url: url
      }
    });
  };

  BrowserContextMenu.prototype.bookmarkUrl = function(url, name, icon) {
    /*jshint -W031 */
    var data = {
      type: 'url',
      url: url,
      name: name
    };
    if (icon) {
      data.icon = icon;
    }
    console.log(JSON.stringify(data));
    new MozActivity({
      name: 'save-bookmark',
      data: data
    });
  };

  BrowserContextMenu.prototype.generateSystemMenuItem = function(item) {

    var nodeName = item.nodeName;
    var uri = item.data.uri;

    switch (nodeName) {
      case 'A':
        return [{
          id: 'open-in-new-tab',
          label: _('open-in-new-tab'),
          callback: this.openUrl.bind(this, uri)
        }, {
        // TODO: requires the text description from the link
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1009351
        //
        //   id: 'bookmark-link',
        //   label: _('add-link-to-home-screen'),
        //   callback: this.bookmarkUrl.bind(this, [item.data.uri])
        // }, {
          id: 'save-link',
          label: _('save-link'),
          callback: this.app.browser.element.download.bind(this, uri)
        }, {
          id: 'share-link',
          label: _('share-link'),
          callback: this.shareUrl.bind(this, uri)
        }];

      case 'IMG':
      case 'VIDEO':
      case 'AUDIO':
        var typeMap = {
          'IMG': 'image',
          'VIDEO': 'video',
          'AUDIO': 'audio'
        };
        var type = typeMap[nodeName];
        if (nodeName === 'VIDEO' && !item.data.hasVideo) {
          type = 'audio';
        }

        return [{
          id: 'save-' + type,
          label: _('save-' + type),
          callback: this.app.browser.element.download.bind(this, uri)
        }, {
          id: 'share-' + type,
          label: _('share-' + type),
          callback: this.shareUrl.bind(this, uri)
        }];

      default:
        return [];
    }
  };

  BrowserContextMenu.prototype.showDefaultMenu = function() {
    var config = this.app.config;
    var icon = ('favicon' in config) ? config.favicon.href : null;
    this.showMenu([{
      label: _('add-to-home-screen'),
      callback: this.bookmarkUrl.bind(this, config.url, this.app.title, icon)
    }, {
      label: _('share'),
      callback: this.shareUrl.bind(this, config.url)
    }]);
  };

}(this));
