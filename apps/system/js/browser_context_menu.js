/* global MozActivity, IconsHelper, LazyLoader */
/* global applications, BaseModule */

(function(window) {
  'use strict';

  var _ = navigator.mozL10n.get;
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
    'ContextMenuView'
  ];

  BaseModule.create(BrowserContextMenu, {
    name: 'BrowserContextMenu',

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'mozbrowsercontextmenu':
          this.show(evt);
          break;
      }
    },

    show: function(evt) {
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
      // currently disabled. https://bugzil.la/1010160 is tracking reenabling
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
      this.contextMenuView.show(items);
    },

    _listItems: function(detail) {

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
      /*jshint -W031 */
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
      /*jshint -W031 */
      new MozActivity({
        name: 'share',
        data: {
          type: 'url',
          url: url
        }
      });
    },

    bookmarkUrl: function(url, name) {
      var favicons = this.app.favicons;

      /*jshint -W031 */
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

    newWindow: function(manifest, isPrivate) {
      // For private windows we create an empty private app window.
      if (isPrivate) {
        window.dispatchEvent(new CustomEvent('new-private-window'));
        return;
      }

      // Else we open up the browser.
      var newTabApp = applications.getByManifestURL(manifest);
      newTabApp.launch();
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
          }, {
            id: 'bookmark-link',
            label: _('add-link-to-home-screen'),
            callback: this.bookmarkUrl.bind(this, uri, text)
          }, {
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

        menuData.push({
          id: 'add-to-homescreen',
          label: _('add-to-home-screen'),
          callback: this.bookmarkUrl.bind(this, config.url, name)
        });

        menuData.push({
          id: 'share',
          label: _('share'),
          callback: this.shareUrl.bind(this, config.url)
        });

        finish();
      });
    }
  });

}(this));
