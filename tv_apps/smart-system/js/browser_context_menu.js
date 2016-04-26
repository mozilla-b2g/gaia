/* global MozActivity, IconsHelper, LazyLoader, applications */
/* global BookmarksDatabase, focusManager, ModalDialog, SharedUtils */
/* global FTEWizard, Template, AppInstallManager, AppInstallDialogs */
/* global PreviewWindow, SystemBanner, ManifestHelper, BookmarkManager */

(function(window) {
  'use strict';

  var BUTTON_TYPE = 'contextmenu';

  // XXX: We use icon filename to determine if we have pin-to-card option
  // because no additional informations can be sent by mozbrowsercontextmenu for
  // now.
  // specifically for popping up FTE.
  var PIN_TO_CARD_ICON_NAME = 'ic_pin.png';
  var ADD_TO_APPS_ICON_PATH = '/style/icons/add_to_apps.png';
  var DELETE_FROM_APPS_ICON_PATH = '/style/icons/delete_from_apps.png';
  var LINK_ICON_PATH = '/style/icons/link.png';

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
    this.systemBanner = new SystemBanner();
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
      case 'modal-dialog-will-open':
        focusManager.focus();
        break;
      case 'modal-dialog-opened':
        this.app.publish('contextmenu-shown');
        // Check focus again in case we have FTE on top of modal dialog.
        focusManager.focus();
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
    this.modalDialog = SharedUtils.createSmartDialog('modal', this.element);
    this.fteWizard = new FTEWizard('systemContextMenuFTE');
  };

  BrowserContextMenu.prototype._registerEvents = function bcm__regEvents() {
    // listen the event bubbled from modal dialog to determine the state
    this.element.addEventListener('modal-dialog-will-open', this);
    this.element.addEventListener('modal-dialog-opened', this);
    this.element.addEventListener('modal-dialog-closed', this);
  };

  BrowserContextMenu.prototype.view = function() {
    return '<div id="' + this.CLASS_NAME + this.instanceID + '" ' +
                 'class="contextmenu"></div>';
  };

  BrowserContextMenu.prototype._destroy = function() {
    focusManager.removeUI(this);
  };

  BrowserContextMenu.prototype.show = function(evt) {
    var detail = evt.detail;

    var hasContextMenu = detail.contextmenu &&
      detail.contextmenu.items.length > 0;

    if (this.app instanceof PreviewWindow) {
      evt.preventDefault();
      evt.stopPropagation();

      var listItemTask;
      if (this.app.isAppLike) {
        listItemTask = this._listAddWebsiteToAppsItem(
          this.app.identity, this.app.features.name, this.app.features.iconUrl);
      } else {
        listItemTask = this._listAddAppToAppsItem(this.app.manifestURL);
      }

      listItemTask.then((items) => {
        this.showMenu(items);
      });

      return;
    } else if (hasContextMenu && AppInstallManager.isMarketplaceAppActive()) {
      // XXX: Since there's no proper API to handle "Add to Apps" and "Delete
      //      from Apps" within the Marketplace app, we ask it to set the label
      //      of the menuitem in a predefined format so the system app can
      //      override it and do the corresponding action.
      //
      // Format: Base on different content types:
      //         - App: '#app:<manifestURL>'
      //         - Website: '#website:<url>,<name>,<iconUrl>'
      var addToAppsChoice = detail.contextmenu.items.find((choice) => {
        return choice.label && choice.label.charAt(0) == '#';
      });

      if (addToAppsChoice) {
        evt.preventDefault();
        evt.stopPropagation();

        this._listAddToAppsItem(addToAppsChoice).then((items) => {
          this.showMenu(items);
        });

        return;
      }
    }

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
    if (this.fteWizard.running) {
      this.fteWizard.focus();
    } else {
      this.modalDialog.focus();
    }

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

    // Initialize FTE if necessary.
    if (!this.fteWizard.launched) {
      var hasPinIcon = menus.some((item) => {
        return item.menuIcon &&
          item.menuIcon.search(PIN_TO_CARD_ICON_NAME) !== -1;
      });

      if(hasPinIcon) {
        this.initFTE(this.modalDialog.element);
      }
    }

    this.element.classList.add('visible');
    this.modalDialog.open({ 'buttonSettings': menus,
      'onButtonRendered': function buttonRendered(button, item) {
        if (item.menuIcon) {
          //XXX: Bug 1252579
          // smart-button should always keep the l10n content on the child node
          // but for now, we'll just reassign it here when the icon is being
          // added.
          var span = document.createElement('span');
          if (button.hasAttribute('data-l10n-id')) {
            span.setAttribute('data-l10n-id',
              button.getAttribute('data-l10n-id'));
            button.removeAttribute('data-l10n-id');
          } else if (button.textContent) {
            span.textContent = button.textContent;
          }
          button.textContent = '';
          button.appendChild(span);
          var icon = document.createElement('div');
          icon.classList.add('icon');
          icon.style.backgroundImage = 'url(' + item.menuIcon + ')';
          button.appendChild(icon);
        }
      }
    });
  };

  BrowserContextMenu.prototype.initFTE = function(parent) {
    if (!this.fteWizard) {
      return;
    }

    if (!this.fteViewElem) {
      var template = new Template('fte_template');
      var fteViewElem = document.createElement('div');
      fteViewElem.className = 'ctxmenu-fte';
      fteViewElem.insertAdjacentHTML('beforeend', template.interpolate());
      parent.appendChild(fteViewElem);
      this.fteViewElem = fteViewElem;
    }

    this.fteWizard.init({
      container: this.fteViewElem,
      onfinish: () => {
        this.focus();
      }
    });
  };

  BrowserContextMenu.prototype._listItems = function(detail) {
    var items = [];

    // contextmenu.items are specified by the web content via html5
    // context menu api
    if (detail.contextmenu && detail.contextmenu.items.length) {
      var that = this;
      detail.contextmenu.items.forEach(function(choice) {
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

  BrowserContextMenu.prototype._listAddToAppsItem = function(choice) {
    //XXX: Please refer to the definition of the label's format mentioned above.
    if (choice.label.startsWith('#app:')) {
      var manifestURL = choice.label.substr('#app:'.length);
      return this._listAddAppToAppsItem(manifestURL);
    } else if (choice.label.startsWith('#website:')) {
      var data = choice.label.substr('#website:'.length).split(',')
        .map((value) => {
          return decodeURIComponent(value);
        });

      // Normalize the URL string.
      var url = new URL(data[0]).toString();
      return this._listAddWebsiteToAppsItem(url, data[1], data[2]);
    }

    return Promise.reject();
  };

  BrowserContextMenu.prototype._listAddAppToAppsItem = function(manifestURL) {
    return new Promise((resolve, reject) => {
      var menuData = [];

      if (!AppInstallManager.getAppAddedState(manifestURL)) {
        menuData.push({
          type: BUTTON_TYPE,
          textL10nId: 'add-to-apps',
          menuIcon: ADD_TO_APPS_ICON_PATH,
          onClick: () => {
            if (this.app instanceof PreviewWindow) {
              var app = applications.getByManifestURL(manifestURL);
              AppInstallManager.handleAddAppToApps(app);
            }
          }
        });
      } else {
        menuData.push({
          type: BUTTON_TYPE,
          textL10nId: 'delete-from-apps',
          menuIcon: DELETE_FROM_APPS_ICON_PATH,
          onClick: () => {
            var app = applications.getByManifestURL(manifestURL);
            var name =
              new ManifestHelper(app.manifest || app.updateManifest).name;
            navigator.mozApps.mgmt.uninstall(app).onsuccess = () => {
              if (this.app instanceof PreviewWindow) {
                this.app.close();
              }
              this.systemBanner.show({
                id: 'deleted-from-apps',
                args: {
                  appName: name
                }
              });
            };
          }
        });
      }

      menuData.push({
        type: BUTTON_TYPE,
        textL10nId: 'url',
        menuIcon: LINK_ICON_PATH,
        onClick: () => {
          ModalDialog.alert(null, {
            'id': 'show-url',
            'args': {
              'url': manifestURL
            }
          }, {});
        }
      });

      resolve(menuData);
    });
  };

  BrowserContextMenu.prototype._listAddWebsiteToAppsItem =
    function(url, name, iconUrl) {

    return new Promise((resolve, reject) => {
      BookmarkManager.get(url).then((bookmark) => {
        var menuData = [];

        if (!bookmark) {
          menuData.push({
            type: BUTTON_TYPE,
            textL10nId: 'add-to-apps',
            menuIcon: ADD_TO_APPS_ICON_PATH,
            onClick: () => {
              BookmarkManager.add({
                name: name,
                url: url,
                iconUrl: iconUrl
              }).then(() => {
                AppInstallManager.resetPreviewOpenedTimes(url);
                this.systemBanner.show({
                  id: 'added-to-apps',
                  args: {
                    appName: name
                  }
                });
              });
            }
          });
        } else {
          // We have 3 places that use the same type of dialog.
          // 1. removeing card in smart-home.
          // 2. uninstalling bookmark in app-deck.
          // 3. here.
          // If we need further changes on the behavior of confirmation, be sure
          // to check these 3 places.
          menuData.push({
            type: BUTTON_TYPE,
            textL10nId: 'delete-from-apps',
            menuIcon: DELETE_FROM_APPS_ICON_PATH,
            onClick: () => {
              AppInstallManager.appInstallDialogs.show(
                AppInstallDialogs.TYPES.UninstallDialog,
                {
                  manifest: {
                    name: bookmark.name
                  }
                }
              ).then(() => {
                BookmarkManager.remove(url).then(() => {
                  if (this.app instanceof PreviewWindow) {
                    this.app.close();
                  }
                  this.systemBanner.show({
                    id: 'deleted-from-apps',
                    args: {
                      appName: bookmark.name
                    }
                  });
                });
              });
            }
          });
        }

        menuData.push({
          type: BUTTON_TYPE,
          textL10nId: 'url',
          menuIcon: LINK_ICON_PATH,
          onClick: () => {
            ModalDialog.alert(null, {
              'id': 'show-url',
              'args': {
                'url': url
              }
            }, {});
          }
        });

        resolve(menuData);
      }).catch(reject);
    });
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
