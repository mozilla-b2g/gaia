'use strict';

/**
 * Abstraction around homescreen.
 * @constructor
 */
function Homescreen(client) {
  this.slowClient = client;
  this.client = client.scope({ searchTimeout: 250 });
  this.system = client.loader.getAppClass('system');
}

Homescreen.URL = 'chrome://gaia/content/homescreen';

Homescreen.Selectors = {
  appsScrollable: '#apps-panel .scrollable',
  apps: '#apps',
  pages: '#pages',
  icon: 'gaia-app-icon',
  group: 'homescreen-group',
  card: 'gaia-pin-card',
  bottomBar: '#bottombar',
  remove: '#remove',
  rename: '#rename',
  done: '#done',
  cancelDownload: '#cancel-download',
  resumeDownload: '#resume-download'
};

Homescreen.prototype = {

  URL: Homescreen.URL,
  Selectors: Homescreen.Selectors,

  get appsScrollable() {
    return this.client.findElement(Homescreen.Selectors.appsScrollable);
  },

  get container() {
    return this.client.findElement(Homescreen.Selectors.apps);
  },

  get icons() {
    return this.client.findElements(Homescreen.Selectors.icon);
  },

  get groups() {
    return this.client.findElements(Homescreen.Selectors.group);
  },

  get iconsAndGroups() {
    return this.client.findElements(Homescreen.Selectors.icon + ', ' +
                                    Homescreen.Selectors.group);
  },

  get cards() {
    return this.client.findElements(Homescreen.Selectors.card);
  },

  get visibleIcons() {
    return this.icons.filter(function(el) {
      return el.scriptWith(function(el) {
        return el.parentNode.style.display !== 'none';
      });
    });
  },

  get visibleCards() {
    return this.client.executeScript(function(selector) {
      var cards = document.body.querySelectorAll(selector);
      var visibles = [];
      for (var i = cards.length - 1; i >= 0; i--) {
        if (cards[i].parentNode.style.display !== 'none') {
          visibles.push(cards[i]);
        }
      }
      return visibles;
    }, [Homescreen.Selectors.card]);
  },

  get removeButton() {
    return this.client.helper.waitForElement(Homescreen.Selectors.remove);
  },

  get renameButton() {
    return this.client.helper.waitForElement(Homescreen.Selectors.rename);
  },

  get doneButton() {
    return this.client.helper.waitForElement(Homescreen.Selectors.done);
  },

  get cancelDownloadDialog() {
    return this.client.findElement(Homescreen.Selectors.cancelDownload);
  },

  get resumeDownloadDialog() {
    return this.client.findElement(Homescreen.Selectors.resumeDownload);
  },

  /**
   * Waits for the edit bar to fully appear.
   */
  waitForEditBar: function() {
    var body = this.client.findElement('body');
    var bar = this.client.helper.waitForElement(Homescreen.Selectors.bottomBar);
    this.client.waitFor(function() {
      var barRect = bar.rect();
      return barRect.y === (body.rect().height - barRect.height);
    });
  },

  _waitForElements: function(callback) {
    this.client.waitFor(function() {
      try {
        return callback();
      } catch(e) {
        if (e.type === 'StaleElementReference') {
          // As the elements are possibly expected to disappear, we may get
          // stale element reference exceptions. In this case, just try again.
          return false;
        }
        throw e;
      }
    });
  },

  /**
   * Waits for the number of visible icons to change to the given amount.
   *
   * @param {number} n Number of visible icons
   */
  waitForVisibleIcons: function(n) {
    this._waitForElements(function() {
      return this.visibleIcons.length === n;
    }.bind(this));
  },

  /**
   * Waits for the number of groups to change to the given amount.
   *
   * @param {number} n Number of groups
   */
  waitForGroups: function(n) {
    this._waitForElements(function() {
      return this.groups.length === n;
    }.bind(this));
  },

  /**
   * Find and return every id for all the items on the grid... Each element
   * can be used with `.getIcon` to find the element for a given id.
   *
   * @return {Array[String]}
   */
  getIconIdentifiers: function() {
    var ids = [];
    var elements = this.iconsAndGroups;
    elements.forEach(function(el) {
      if (el.tagName() === 'homescreen-group') {
        this.client.switchToShadowRoot(el);
        ids = ids.concat(this.getIconIdentifiers());
        this.client.switchToShadowRoot();
      } else {
        if (el.scriptWith(function(el) {
              return el.parentNode.style.display !== 'none';
            })) {
          ids.push(this.getIconId(el));
        }
      }
    }, this);
    return ids;
  },

  /**
   * Fetch an icon element on the homescreen by its identifier.
   * For apps, the identifier is the manifestURL, or its manifestURL,
   * followed by a '/' followed by its entry point. For bookmarks, the
   * identifier is the bookmarked URL.
   *
   * @param {String} identifier The identifier of the icon.
   * @return {Marionette.Element}
   */
  getIcon: function(identifier) {
    return this.slowClient.findElement(
      Homescreen.Selectors.apps + ' [data-identifier*="' + identifier + '"]');
  },

  /**
   * Fetch a card element on the homescreen by its identifier.
   * For apps, the identifier is the manifestURL, or its manifestURL,
   * followed by a '/' followed by its entry point. For pin, the
   * identifier is the pinned URL.
   */
  getCard: function(identifier) {
    return this.slowClient.findElement(
      Homescreen.Selectors.pages + ' [data-id="' + identifier + '"]');
  },

  /**
   * Fetch an icon element on the homescreen by its name.
   *
   * @param {String} name The name of the icon.
   * @return {Marionette.Element}
   */
  getIconByName: function(name) {
    function getName(icon) {
      return icon.shadowRoot.querySelector('#subtitle').textContent;
    }

    var icons = this.icons;
    for (var i = 0, iLen = icons.length; i < iLen; i++) {
      if (icons[i].scriptWith(getName) === name) {
        return icons[i];
      }
    }

    return null;
  },

  /**
   * Returns a homescreen icon element's identifier.
   *
   * @param {Marionette.Element} icon A homescreen icon element reference.
   */
  getIconId: function(icon) {
    return icon.scriptWith(function(el) {
      return el.dataset.identifier;
    });
  },

  /**
   * Returns a homescreen icon element's text.
   *
   * @param {Marionette.Element} icon A homescreen icon element reference.
   */
  getIconText: function(icon) {
    return icon.scriptWith(function(el) {
      return el.shadowRoot.querySelector('#subtitle').textContent;
    });
  },

  /**
   * Returns a data-url of the image element in a homescreen icon, if it exists.
   *
   * @param {Marionette.Element} icon A homescreen icon element reference.
   */
  getIconImage: function(icon) {
    return icon.scriptWith(function(el) {
      var image = el.shadowRoot.querySelector('#image-container img');
      if (!image) {
        return null;
      }

      var canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;

      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);

      return canvas.toDataURL();
    });
  },

  /**
   * Returns a homescreen icon element's image URL.
   *
   * @param {Marionette.Element} icon A homescreen icon element reference.
   */
  getIconImageUrl: function(icon) {
    return icon.scriptWith(function(el) {
      return el.dataset.testIconUrl;
    });
  },

  /**
   * Returns a homescreen card element's image URL.
   *
   * @param {Marionette.Element} card A homescreen card element reference.
   */
  getCardImageUrl: function(card) {
    return card.scriptWith(function(el) {
      var icon = el.shadowRoot.querySelector('.icon-container i');
      return icon.style.backgroundImage;
    });
  },

  /**
   * Waits for an icon's image URL to contain a certain value.
   *
   * @param {Marionette.Element} icon A homescreen icon element reference.
   * @0aram {String} string A string to search for in the image URL.
   */
  waitForIconImageUrl: function(icon, string) {
    this.client.waitFor(function() {
      var src = this.getIconImageUrl(icon);
      return src && src.indexOf(string) !== -1;
    }.bind(this));
  },

  /**
   * Returns true if a homescreen icon is in a loading state, false otherwise.
   *
   * @param {Marionette.Element} icon A homescreen icon element reference.
   */
  iconIsLoading: function(icon) {
    return icon.scriptWith(function(el) {
      return el.shadowRoot.querySelector('#image-container').
        classList.contains('downloading');
    });
  },

  /**
   * Launches an icon and switches to the corresponding application.
   *
   * @param {Marionette.Element} icon A homescreen icon element reference.
   */
  launchIcon: function(icon) {
    var identifier = this.getIconId(icon);
    icon.tap();
    this.client.switchToShadowRoot();

    var identifierWithoutEntryPoint = identifier.replace(/\/[^\/]*$/, '');
    var client = this.client.scope({ searchTimeout: 100 });
    var frame;

    client.waitFor(function() {
      // wait for the app to show up
      client.switchToFrame();
      try {
        frame = client.findElement('iframe[mozapp="' + identifier + '"]');
      } catch (e1) {
        try {
          frame = client.findElement(
            'iframe[mozapp="' + identifierWithoutEntryPoint + '"]');
        } catch(e2) {
          try {
            frame = client.findElement(
              'iframe[data-frame-origin*="' + identifier + '"]');
          } catch (e3) {
            // try again...
            client.switchToFrame(this.system.getHomescreenIframe());
            icon.tap();
            return false;
          }
        }
      }
      client.switchToFrame(frame);
      return true;
    }.bind(this));
  },

  /**
   * Opens a group, waits for it to fully open and switches to the group's
   * shadow root.
   *
   * @param {Marionette.Element} group A homescreen group element reference.
   */
  openGroup: function(group) {
    group.tap();
    this.client.waitFor(function() {
      return group.scriptWith(function(el) {
        return el.wrappedJSObject.state === 2;
      });
    });
    this.client.switchToShadowRoot(group);
  },

  /**
   * Waits for the saved icon order to reflect the current icon order.
   */
  waitForSavedOrder: function() {
    var ids = this.getIconIdentifiers(true);
    var numIcons = ids.length;
    var client = this.client;
    client.waitFor(function() {
      var order = client.executeAsyncScript(function() {
        window.wrappedJSObject.appWindow.apps.metadata.getAll().then(
          marionetteScriptFinished);
      });

      // The order array is stored in order, but also contains non-visible
      // icons, so just skip unknown entries.
      var correctlyPlacedIcons = 0;
      for (var i = 0, iLen = order.length; i < iLen; i++) {
        if (order[i].id.startsWith(ids[correctlyPlacedIcons])) {
          ++ correctlyPlacedIcons;
        }
      }
      return correctlyPlacedIcons === numIcons;
    });
  },

  /**
   * Scrolls the homescreen so that the given icon is located roughly in
   * the center of the screen, vertically.
   *
   * @param {Marionette.Element} icon A homescreen icon element reference.
   */
  scrollIconToCenter: function(icon) {
    this.client.executeScript(function(icon, scrollable, position) {
      var midPoint = scrollable.clientHeight / 2;
      scrollable.scrollTop = scrollable.scrollTop + (position - midPoint);
    }, [icon, this.appsScrollable, icon.location().y]);
  },

  /**
   * Restart the homescreen then refocus on it.
   */
  restart: function() {
    this.client.executeScript(function() {
      window.close();
    });

    // initialize our frames again since we killed the iframe
    this.client.switchToFrame();
    this.client.switchToFrame(this.system.getHomescreenIframe());

    // Wait for reload
    this.waitForLaunch();
  },

  /**
   * Perform an action in an action dialog.
   *
   * @param {Marionette.Element} dialog An action dialog element reference.
   * @param {String} action The data-l10n-id of the action to perform.
   */
  actionDialog: function(dialog, action) {
    var button = this.client.helper.waitForElement(
      'button[data-l10n-id="' + action + '"]');
    button.tap();
    this.client.helper.waitForElementToDisappear(button);
  },

  /**
   * Click confirm on a particular type of confirmation dialog.
   *
   * @param {String} type of dialog.
   * @param {String} selector of the button. Defaults to .confirm.
   */
  confirmDialog: function(type, button) {
    var selector = 'gaia-confirm[data-type="' + type + '"]';
    var dialog = this.client.helper.waitForElement(selector);

    var confirm;
    this.client.waitFor(function() {
     confirm = dialog.findElement(button || '.confirm');
     return confirm && confirm.displayed();
    });

    // XXX: Hack to use faster polling
    var quickly = this.client.scope({ searchTimeout: 50 });
    confirm.client = quickly;

    // tricky logic to ensure the dialog has been removed and clicked
    this.client.waitFor(function() {
      try {
        // click the dialog to dismiss it
        confirm.click();
        // ensure it is either hidden or hits the stale element ref
        return !confirm.displayed();
      } catch (e) {
        if (e.type === 'StaleElementReference') {
          // element was successfully removed
          return true;
        }
        throw e;
      }
    });
  },

  /**
   * Emulates pressing of the hardware home button.
   */
  pressHomeButton: function() {
    this.client.executeScript(function() {
      var home = new CustomEvent('home');
      window.dispatchEvent(home);
    });
    this.client.apps.switchToApp(Homescreen.URL);
  },

  /**
   * Gets a localized application name from a manifest.
   * @param {String} app to open
   * @param {String} entryPoint to open
   * @param {String} locale
   */
  localizedAppName: function(app, entryPoint, locale) {
    if (!locale) {
      locale = entryPoint;
      entryPoint = null;
    }

    var file = 'app://' + app + '.gaiamobile.org/manifest.webapp';
    // use a chrome-scoped Marionette client for the cross-domain XHR
    var chromeClient = this.client.scope({context: 'chrome'});
    var manifest = chromeClient.executeAsyncScript(function(file) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', file, true);
      xhr.onload = function(o) {
        var data = JSON.parse(xhr.response);
        marionetteScriptFinished(data);
      };
      xhr.send(null);
    }, [file]);

    var locales;
    if (entryPoint) {
      locales = manifest.entry_points[entryPoint].locales;
    } else {
      locales = manifest.locales;
    }

    if (!locales) {
      return false;
    }

    if (locale.indexOf('-x-ps') > -1) {
      return this.client.executeScript(function(locale, name) {
        var mozL10n = window.wrappedJSObject.navigator.mozL10n;
        return mozL10n.qps[locale].translate(name);
      }, [locale, locales['en-US'].name]);
    }

    return locales[locale].name;
  },

  /**
   * Returns a localized string from a properties file.
   * @param {String} key of the string to lookup.
   */
  l10n: function(key) {
    var string = this.client.executeScript(function(key) {
      return window.wrappedJSObject.navigator.mozL10n.get(key);
    }, [key]);

    return string;
  }
};

module.exports = Homescreen;
