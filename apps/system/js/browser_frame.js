'use strict';

/**
 * Define a basic mozbrowser iframe class.
 * It creates a mozbrowser iframe,
 * and finally returns the DOM element it just created.
 *
 * The BrowserFrame instance has a 'element' field,
 * which is the mozbrowser iframe it generated or converted to.
 *
 * @param {Object} config
 *        The configuration object generated by BrowserConfig.
 * @param {DOMIFRAMEElement} [frame]
 *        The existing frame to be converted to mozbrowsr iframe.
 * @class  BrowserFrame
 */

(function(window) {
  var nextId = 0;
  window.BrowserFrame = function BrowserFrame() {
    this.element = null;
    this._id = nextId++;
    // All arguments are values to createFrame
    createFrame.apply(this, arguments);
    return this;
  };

  BrowserFrame.prototype.CLASS_NAME = 'browser';

  // These are helper functions and variables used by the methods above
  // They're not part of the public API of the module, but they're hidden
  // within this function scope so we don't have to define them as a
  // property of Browser or prefix them with underscores.
  function createFrame(config, frame) {
    var browser = frame || document.createElement('iframe');

    if (!config.isInputMethod) {
      browser.setAttribute('mozallowfullscreen', 'true');
    }

    // Most apps currently need to be hosted in a special 'mozbrowser' iframe.
    // They also need to be marked as 'mozapp' to be recognized as apps by the
    // platform.
    browser.setAttribute('mozbrowser', 'true');

    // Give a name to the frame for differentiating between main frame and
    // inline frame. With the name we can get frames of the same app using the
    // window.open method.
    browser.name = config.window_name || 'main';

    if (config.oop) {
      browser.setAttribute('remote', 'true');

      if (config.isInputMethod) {
        browser.setAttribute('ignoreuserfocus', 'true');
      }
    }

    if (config.manifestURL) {
      browser.setAttribute('mozapp', config.manifestURL);

      // Only app with manifest could get system message.
      if (config.isSystemMessage) {
        browser.setAttribute('expecting-system-message',
                             'expecting-system-message');
      }
    }

    if (config.parentApp) {
      browser.setAttribute('parentapp', config.parentApp);
    }

    if (config.useAsyncPanZoom) {
      // XXX: Move this dataset assignment into app window object.
      browser.dataset.useAsyncPanZoom = true;
      browser.setAttribute('mozasyncpanzoom', 'true');
    }

    if (config.isInputMethod) {
      browser.setAttribute('mozpasspointerevents', 'true');
    }

    setMozAppType(browser, config);

    if (config.url) {
      browser.src = config.url;
      // XXX: This one is for some failing python tests using
      // iframe[data-url*=XXX] to locate. But we shall change it later.
      browser.dataset.url = config.url;
    }

    browser.id = this.CLASS_NAME + this._id;

    browser.classList.add(this.CLASS_NAME);

    this.config = config;

    this.element = browser;
  };

  function setMozAppType(iframe, config) {
    // XXX: Those urls needs to be built dynamically.
    if (config.url.startsWith(window.location.protocol +
                              '//callscreen.gaiamobile.org') ||
        config.url.startsWith(window.location.protocol +
                              '//clock.gaiamobile.org')) {
      iframe.setAttribute('mozapptype', 'critical');
    } else if (config.isHomescreen) {
      /* If this frame corresponds to the homescreen, set mozapptype=homescreen
       * so we're less likely to kill this frame's process when we're running
       * low on memory.
       *
       * We must do this before we the appendChild() call below. Once
       * we add this frame to the document, we can't change its app type.
       */
      iframe.setAttribute('mozapptype', 'homescreen');
    } else if (config.isSearch) {
      /* If this frame corresponds to search, set mozapptype=search
       */
      iframe.setAttribute('mozapptype', 'search');
    } else if (config.isInputMethod) {
      iframe.setAttribute('mozapptype', 'inputmethod');
    }
  }
}(this));
