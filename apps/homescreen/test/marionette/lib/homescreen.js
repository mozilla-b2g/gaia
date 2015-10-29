'use strict';

/**
 * Abstraction around homescreen.
 * @constructor
 */
function Homescreen(client) {
  this.client = client;
  this.system = client.loader.getAppClass('system');
}

Homescreen.URL = 'app://homescreen.gaiamobile.org';

Homescreen.Selectors = {
  appsScrollable: '#apps-panel .scrollable',
  apps: '#apps',
  icon: '#apps gaia-app-icon',
  card: '#pages gaia-pin-card',
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
    return this.cards.filter(function(el) {
      return el.scriptWith(function(el) {
        return el.parentNode.style.display !== 'none';
      });
    });
  },

  get removeButton() {
    return this.client.findElement(Homescreen.Selectors.remove);
  },

  get renameButton() {
    return this.client.findElement(Homescreen.Selectors.rename);
  },

  get doneButton() {
    return this.client.findElement(Homescreen.Selectors.done);
  },

  get cancelDownloadDialog() {
    return this.client.findElement(Homescreen.Selectors.cancelDownload);
  },

  get resumeDownloadDialog() {
    return this.client.findElement(Homescreen.Selectors.resumeDownload);
  },

  /**
   * Waits for the homescreen to launch and switches to the frame.
   */
  waitForLaunch: function() {
    this.client.helper.waitForElement('body');
    this.client.apps.switchToApp(Homescreen.URL);
  },

  /**
   * Find and return every id for all the items on the grid... Each element
   * can be used with `.getIcon` to find the element for a given id.
   *
   * @return {Array[String]}
   */
  getIconIdentifiers: function() {
    return this.visibleIcons.map(function(el) {
      return this.getIconId(el);
    }, this);
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
    return this.client.findElement(
      Homescreen.Selectors.apps + ' [data-identifier*="' + identifier + '"]');
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
    var identifier =
      icon.scriptWith(function(el) { return el.dataset.identifier; });
    icon.tap();

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
