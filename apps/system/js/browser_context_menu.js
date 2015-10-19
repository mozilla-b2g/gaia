/* global MozActivity, IconsHelper, LazyLoader */
/* global BaseModule, Service */

(function(window) {
  'use strict';

  var _ = navigator.mozL10n.get;
  const PINNING_PREF = 'dev.gaia.pinning_the_web';
  const SITE_ICON_SIZE = 72;

  /**
   * The ContextMenu of the AppWindow.
   *
   * @class BrowserContextMenu
   * @param {AppWindow} app The app window instance
   *                        where this dialog should popup.
   */
  function BrowserContextMenu(app) {
    this.app = app;
    this.containerElement = app.element;
    this.app.element.addEventListener('mozbrowsercontextmenu', this);
    return this;
  }

  BrowserContextMenu.SUB_MODULES = [
    'ContextMenuView',
    'PinPageSystemDialog'
  ];

  BaseModule.create(BrowserContextMenu, {
    name: 'BrowserContextMenu',

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'mozbrowsercontextmenu':
          if (!Service.query('isFtuRunning')) {
            this.show(evt);
          }
          break;
      }
    },

    show: function(evt) {
      var detail = evt.detail;

      var hasContextMenu = detail.contextmenu &&
        detail.contextmenu.items.length > 0 &&
        detail.contextmenu.customized;
      var hasSystemTargets = detail.systemTargets &&
        detail.systemTargets.length > 0;

      // Nothing to show
      if (!hasSystemTargets && !hasContextMenu) {
        return;
      }

      // context menus in certified apps that only have system targets are
      // currently disabled. https://bugzil.la/1010160 is tracking reenabling
      if (!hasContextMenu && hasSystemTargets && this.app.isCertified()) {
        return;
      }

      var items = this._listItems(detail);
      if (!items.length) {
        return;
      }

      evt.preventDefault();
      evt.stopPropagation();

      // This temporary check will be removed as soon as
      // Pinning the Web lands without a Setting. We won't need
      // the second call to _listItems anymore then.
      this._getPinningEnabled(function(value) {
        this.pinningEnabled = value;
        items = this._listItems(detail);

        // Notify the embedder we are handling the context menu
        this.contextMenuView.show(items);
      }.bind(this));
    },

    _listItems: function(detail) {

      var items = [];

      // contextmenu.items are specified by the web content via html5
      // context menu api and a specific system command, copy-image.
      if (detail.contextmenu && detail.contextmenu.items.length) {
        detail.contextmenu.items.forEach(function(choice, index) {
          var itemObj = null;
          switch (choice.id) {
            case 'copy-image':
            case 'copy-link':
              itemObj = {
                id: choice.id,
                label: _(choice.id),
              };
              break;

            default:
              // Customized menu items
              itemObj = {
                label: choice.label,
                icon: choice.icon,
              };
          }
          itemObj.callback = () => {
            detail.contextMenuItemSelected(choice.id);
          };
          items.push(itemObj);
        }, this);
      }

      if (detail.systemTargets) {
        detail.systemTargets.forEach(function(item) {
          this.generateSystemMenuItem(item).forEach(function(menuItem) {
            items.push(menuItem);
          });
        }, this);
      }

      return items;
    },

    _getPinningEnabled: function(callback) {
      var req = navigator.mozSettings.createLock().get(PINNING_PREF);
      req.onsuccess = () => {
        callback(req.result[PINNING_PREF]);
      };

      req.onerror = () => {
        callback(false);
      };
    },

    isShown: function() {
      return this.contextMenuView.isShown();
    },

    hide: function() {
      if (!this.contextMenuView.isShown()) {
        return;
      }

      this.contextMenuView.hide();
    },

    openUrl: function(url, isPrivate) {
      /* jshint nonew: false */
      new MozActivity({
        name: 'view',
        data: {
          type: 'url',
          url: url,
          isPrivate: isPrivate
        }
      });
    },

    shareUrl: function(url) {
      /* jshint nonew: false */
      new MozActivity({
        name: 'share',
        data: {
          type: 'url',
          url: url
        }
      });
    },

    _getSaveUrlItem: function(url, name) {
      if (this.pinningEnabled) {
        return {
          id: 'pin-to-home-screen',
          label: _('pin-to-home-screen'),
          callback: this.pinUrl.bind(this, url, name)
        };
      }

      return {
        id: 'add-to-homescreen',
        label: _('add-link-to-home-screen'),
        callback: this.bookmarkUrl.bind(this, url, name)
      };
    },

    bookmarkUrl: function(url, name) {
      var favicons = this.app.favicons;

      /* jshint nonew: false */
      var data = {
        type: 'url',
        url: url,
        name: name,
        iconable: false
      };

      if (this.app.webManifestURL) {
        data.manifestURL = this.app.webManifestURL;
      }

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
    },

    pinUrl: function(url, name) {
      var data = {
        name: name,
        type: 'url',
        url: url,
        iconable: false,
        title: this.app.title,
        themeColor: this.app.appChrome.themeColor
      };

      this.app.getScreenshot(function() {
        data.screenshot = this.app._screenshotBlob;
        this.app.getSiteIconUrl(SITE_ICON_SIZE)
        .then(iconObject => {
          if (iconObject) {
            data.icon = iconObject.blob;
          }
          this.pinPageSystemDialog.show(data);
        })
        .catch((err) => {
          this.app.debug('bookmarkUrl, error from getSiteIcon: %s', err);
          this.pinPageSystemDialog.show(data);
        });
      }.bind(this));
    },

    newWindow: function(manifest, isPrivate) {
      // For private windows we create an empty private app window.
      if (isPrivate) {
        window.dispatchEvent(new CustomEvent('new-private-window'));
      } else {
        window.dispatchEvent(new CustomEvent('new-non-private-window'));
      }
    },

    showWindows: function(manifest) {
      window.dispatchEvent(
        new CustomEvent('taskmanagershow',
                        { detail: { filter: 'browser-only' }})
      );
    },

    generateSystemMenuItem: function(item) {
      var nodeName = item.nodeName.toUpperCase();
      var documentURI = item.data.documentURI;
      var uri = item.data.uri;
      var text = item.data.text;

      switch (nodeName) {
        case 'A':
          return [{
            id: 'open-in-new-window',
            label: _('open-in-new-window'),
            callback: this.openUrl.bind(this, uri)
          }, {
            id: 'open-in-new-private-window',
            label: _('open-in-new-private-window'),
            callback: this.openUrl.bind(this, uri, true)
          },
            this._getSaveUrlItem(uri, text),
          {
            id: 'save-link',
            label: _('save-link'),
            callback: this.app.browser.element.download.bind(
              this.app.browser.element, uri, { referrer: documentURI })
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
            callback: this.app.browser.element.download.bind(
              this.app.browser.element, uri, { referrer: documentURI })
          }, {
            id: 'share-' + type,
            label: _('share-' + type),
            callback: this.shareUrl.bind(this, uri)
          }];

        default:
          return [];
      }
    },

    showDefaultMenu: function(manifest, name) {
      return new Promise((resolve) => {
        this._getPinningEnabled(function(value) {
          this.pinningEnabled = value;
          var config = this.app.config;
          var menuData = [];

          var finish = () => {
            this.contextMenuView.show(menuData);
            resolve();
          };

          menuData.push({
            id: 'new-window',
            label: _('new-window'),
            callback: this.newWindow.bind(this, manifest)
          });

          menuData.push({
            id: 'new-private-window',
            label: _('new-private-window'),
            callback: this.newWindow.bind(this, manifest, true)
          });

          menuData.push({
            id: 'show-windows',
            label: _('show-windows'),
            callback: this.showWindows.bind(this)
          });

          // Do not show the bookmark/share buttons if the url starts with app.
          // This is because in some cases we use the app chrome to view system
          // pages. E.g., private browsing.
          if (config.url.startsWith('app')) {
            finish();
            return;
          }

          menuData.push(this._getSaveUrlItem(config.url, name));

          menuData.push({
            id: 'share',
            label: _('share'),
            callback: this.shareUrl.bind(this, config.url)
          });

          finish();
        }.bind(this));
      });
    }
  });

  BrowserContextMenu.prototype.focus = function() {
    this.contextMenuView.focus();
  };

}(this));
