/* global MozActivity, IconsHelper, LazyLoader, applications */
/* global BookmarksDatabase, focusManager, SmartModalDialog */

(function(window) {
  'use strict';

  var BUTTON_TYPE = 'contextmenu';

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

  BrowserContextMenu.prototype.handleFocus = function(scrollable, elem) {
    if (elem.nodeName) {
      elem.focus();
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
      case 'modal-dialog-opened':
        focusManager.focus();
        this.app.publish('contextmenu-shown');
        break;
      case 'modal-dialog-closed':
        this.element.classList.remove('visible');
        focusManager.focus();
        this.app.publish('contextmenu-hidden');
        break;
    }
  };

  BrowserContextMenu.prototype._fetchElements = function bcm__fetchElements() {
    var id = this.CLASS_NAME + this.instanceID;
    this.element = document.getElementById(id);
    this.modalDialog = new SmartModalDialog(this.element);
  };

  BrowserContextMenu.prototype._registerEvents = function bcm__regEvents() {
    // listen the event bubbled from modal dialog to determine the state
    this.element.addEventListener('modal-dialog-opened', this);
    this.element.addEventListener('modal-dialog-closed', this);
  };

  BrowserContextMenu.prototype.view = function() {
    return '<div id="' + this.CLASS_NAME + this.instanceID + '" ' +
                 'class="contextmenu"></div>';
  };

  BrowserContextMenu.prototype.kill = function() {
    focusManager.removeUI(this);
    this.element.removeChild(this.modalDialog.element);
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

    var items = this._listItems(detail);

    if (!items.length) {
      return;
    }

    // Notify the embedder we are handling the context menu
    evt.preventDefault();
    evt.stopPropagation();
    this.showMenu(items);
  };

  BrowserContextMenu.prototype.isFocusable = function() {
    return this.modalDialog &&
           this.modalDialog.element.classList.contains('visible');
  };

  BrowserContextMenu.prototype.focus = function() {
    document.activeElement.blur();
    this.modalDialog.focus();
  };

  BrowserContextMenu.prototype.getElement = function() {
    return this.element;
  };

  BrowserContextMenu.prototype.showMenu = function(menus) {
    if (!this._injected) {
      focusManager.addUI(this);
      this.render();
      this._injected = true;
    }
    this.element.classList.add('visible');
    this.modalDialog.open({ 'buttonSettings': menus,
      'onButtonRendered': function buttonRendered(button, item) {
        if (item.menuIcon) {
          var icon = document.createElement('div');
          icon.classList.add('icon');
          icon.style.backgroundImage = 'url(' + item.menuIcon + ')';
          button.appendChild(icon);
        }
      }
    });
  },

  BrowserContextMenu.prototype._listItems = function(detail) {
    var items = [];

    // contextmenu.items are specified by the web content via html5
    // context menu api
    if (detail.contextmenu && detail.contextmenu.items.length) {
      var that = this;
      detail.contextmenu.items.forEach(function(choice, index) {
        items.push({
          type: BUTTON_TYPE,
          textRaw: choice.label,
          menuIcon: that.app.origin + '/' + choice.icon,
          onClick: function() {
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

    if (items.length > 0) {
      items[0].defaultFocus = true;
    }

    return items;
  };

  BrowserContextMenu.prototype.hide = function() {
    if (!this.element) {
      return false;
    }

    this.modalDialog.element.close();
    return true;
  };

  BrowserContextMenu.prototype.openUrl = function(url) {
    /* jshint nonew: false */
    new MozActivity({
      name: 'view',
      data: {
        type: 'url',
        url: url
      }
    });
  };

  BrowserContextMenu.prototype.shareUrl = function(url) {
    /* jshint nonew: false */
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

    /* jshint nonew: false */
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
    var documentURI = item.data.documentURI;
    var uri = item.data.uri;
    var text = item.data.text;

    switch (nodeName) {
      case 'A':
        return [{
          id: 'open-in-new-window',
          type: BUTTON_TYPE,
          textL10nId: 'open-in-new-window',
          onClick: this.openUrl.bind(this, uri)
        }, {
          id: 'bookmark-link',
          type: BUTTON_TYPE,
          textL10nId: 'add-link-to-home-screen',
          onClick: this.bookmarkUrl.bind(this, uri, text)
        }, {
          id: 'save-link',
          type: BUTTON_TYPE,
          textL10nId: 'save-link',
          onClick: this.app.browser.element.download.bind(
            this.app.browser.element, uri, { referrer: documentURI })
        }, {
          id: 'share-link',
          type: BUTTON_TYPE,
          textL10nId: 'share-link',
          onClick: this.shareUrl.bind(this, uri)
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
          type: BUTTON_TYPE,
          textL10nId: 'save-' + type,
          onClick: this.app.browser.element.download.bind(
            this.app.browser.element, uri, { referrer: documentURI })
        }, {
          id: 'share-' + type,
          type: BUTTON_TYPE,
          textL10nId: 'share-' + type,
          onClick: this.shareUrl.bind(this, uri)
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
            type: BUTTON_TYPE,
            textL10nId: 'add-to-home-screen',
            onClick: this.bookmarkUrl.bind(this, config.url, name)
          });
        }

        menuData.push({
          id: 'share',
          type: BUTTON_TYPE,
          textL10nId: 'share',
          onClick: this.shareUrl.bind(this, config.url)
        });

        this.showMenu(menuData);
        resolve();
      });
    });
  };

}(window));
