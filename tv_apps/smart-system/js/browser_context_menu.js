/* global MozActivity, IconsHelper, LazyLoader, applications */
/* global BookmarksDatabase, XScrollable, KeyNavigationAdapter, SharedUtils */

(function(window) {
  'use strict';

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

    this.keyNavigationAdapter = new KeyNavigationAdapter();
    this.keyNavigationAdapter.on('move', function(key) {
      this.scrollable.move(key);
    }.bind(this));
    this.keyNavigationAdapter.on('enter', function() {
      this.scrollable.currentItem.click();
    }.bind(this));
    this.keyNavigationAdapter.on('esc', this.hide.bind(this));

    return this;
  };

  BrowserContextMenu.prototype = Object.create(window.BaseUI.prototype);

  BrowserContextMenu.prototype.handleFocus = function(scrollable, elem) {
    if (elem.nodeName) {
      elem.classList.add('hover');
      elem.focus();
    }
  };

  BrowserContextMenu.prototype.handleUnfocus = function(scrollable, elem) {
    if (elem.nodeName) {
      elem.classList.remove('hover');
    }
  };

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

    this.elementClasses = ['header', 'list', 'list-frame'];

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
              '<div class="contextmenu-list-frame">' +
                '<menu class="contextmenu-list"></menu>' +
              '</div>' +
            '</form>';
  };

  BrowserContextMenu.prototype.kill = function() {
    this.keyNavigationAdapter.uninit();
    this.containerElement.removeChild(this.element);
  };

  BrowserContextMenu.prototype.show = function(evt) {
    var detail = evt.detail;

    this.keyNavigationAdapter.init();

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

    var items = this._listItems(detail);

    if (!items.length) {
      return;
    }

    // Notify the embedder we are handling the context menu
    evt.preventDefault();
    evt.stopPropagation();
    this.showMenu(items);
  };

  BrowserContextMenu.prototype.hasMenuVisible = function() {
    return this.element && this.element.classList.contains('visible');
  };

  BrowserContextMenu.prototype.focus = function() {
    document.activeElement.blur();
    this.scrollable.catchFocus();
  };

  BrowserContextMenu.prototype.showMenu = function(menu) {
    if (!this._injected) {
      this.render();
    }
    this._injected = true;
    this.buildMenu(menu);
    this.element.classList.add('visible');
    document.activeElement.blur();
    this.scrollable.catchFocus();
  },

  BrowserContextMenu.prototype.buildMenu = function(items) {
    var self = this;
    this.elements.list.innerHTML = '';
    items.forEach(function traveseItems(item) {
      var container = document.createElement('div');
      var action = document.createElement('button');
      var icon = document.createElement('div');
      action.dataset.id = item.id;
      action.dataset.value = item.value;
      var l10nPayload = item.labelL10nId ? item.labelL10nId : {raw: item.label};
      SharedUtils.localizeElement(item, l10nPayload);

      action.className = self.ELEMENT_PREFIX + 'button';

      if (item.icon) {
        icon.classList.add(item.iconClass || 'icon');
        icon.style.backgroundImage = 'url(' + item.icon + ')';
      }

      action.addEventListener('click', function(evt) {
        self.hide(evt);
        item.callback();
      });

      action.appendChild(icon);
      container.appendChild(action);
      this.elements.list.appendChild(container);
    }, this);

    this.elements.cancel.setAttribute('data-l10n-id', 'cancel');
    this.elements.list.appendChild(this.elements.cancel);

    this.scrollable = new XScrollable({
      frameElem: this.elements.listFrame,
      listElem: this.elements.list,
      itemClassName: self.ELEMENT_PREFIX + 'button',
      margin: 8.2
    });
    this.scrollable.on('focus', this.handleFocus.bind(this));
    this.scrollable.on('unfocus', this.handleUnfocus.bind(this));
  };

  BrowserContextMenu.prototype._listItems = function(detail) {
    var items = [];

    // contextmenu.items are specified by the web content via html5
    // context menu api
    if (detail.contextmenu && detail.contextmenu.items.length) {
      var that = this;
      detail.contextmenu.items.forEach(function(choice, index) {
        items.push({
          label: choice.label,
          icon: that.app.origin + '/' + choice.icon,
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

    this.keyNavigationAdapter.uninit();

    if (evt) {
      evt.preventDefault();
    }

    if (this.scrollable.currentItem) {
      this.scrollable.currentItem.blur();
    }
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

  BrowserContextMenu.prototype.bookmarkUrl = function(url, name) {
    var favicons = this.app.favicons;

    /*jshint -W031 */
    var data = {
      type: 'url',
      url: url,
      name: name,
      iconable: false
    };

    LazyLoader.load('shared/js/icons_helper.js', (() => {
      IconsHelper.getIcon(url, null, {icons: favicons}).then(icon => {
        if (icon) {
          data.icon = icon;
        }
        new MozActivity({
          name: 'save-bookmark',
          data: data
        });
      });
    }));
  };

  BrowserContextMenu.prototype.newWindow = function(manifest) {
    var newTabApp = applications.getByManifestURL(manifest);
    newTabApp.launch();
  };

  BrowserContextMenu.prototype.generateSystemMenuItem = function(item) {

    var nodeName = item.nodeName.toUpperCase();
    var uri = item.data.uri;
    var text = item.data.text;

    switch (nodeName) {
      case 'A':
        return [{
          id: 'open-in-new-window',
          labelL10nId: 'open-in-new-window',
          callback: this.openUrl.bind(this, uri)
        }, {
          id: 'bookmark-link',
          labelL10nId: 'add-link-to-home-screen',
          callback: this.bookmarkUrl.bind(this, uri, text)
        }, {
          id: 'save-link',
          labelL10nId: 'save-link',
          callback: this.app.browser.element.download.bind(this, uri)
        }, {
          id: 'share-link',
          labelL10nId: 'share-link',
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
          labelL10nId: 'save-' + type,
          callback: this.app.browser.element.download.bind(this, uri)
        }, {
          id: 'share-' + type,
          labelL10nId: 'share-' + type,
          callback: this.shareUrl.bind(this, uri)
        }];

      default:
        return [];
    }
  };

  BrowserContextMenu.prototype.showDefaultMenu = function(manifest, name) {
    return new Promise((resolve) => {
      var config = this.app.config;
      var menuData = [];

      menuData.push({
      });

      BookmarksDatabase.get(config.url).then((result) => {
        if (!result) {
          menuData.push({
            id: 'add-to-homescreen',
            labelL10nId: 'add-to-home-screen',
            callback: this.bookmarkUrl.bind(this, config.url, name)
          });
        }

        menuData.push({
          id: 'share',
          labelL10nId: 'share',
          callback: this.shareUrl.bind(this, config.url)
        });

        this.showMenu(menuData);
        resolve();
      });
    });
  };

}(window));
