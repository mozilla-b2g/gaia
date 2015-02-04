/* global AppWindow, BrowserFrame, OrientationManager */
'use strict';

(function(exports) {
  var _id = 0;

  /**
   * ActivityWindow is the wrapper for the inline activity instances.
   * For window disposition activity, they are done in AppWindow.
   *
   * ##### Flow chart
   * ![ActivityWindow flow](http://i.imgur.com/4O1Frs3.png)
   *
   * @example
   * var app = new AppWindow({
   *   url: 'http://uitest.gaiamobile.org:8080/index.html',
   *   manifestURL: 'http://uitest.gaiamobile.org:8080/manifest.webapp'
   * });
   * var activity = new ActivityWindow({
   *   url: 'http://gallery.gaiamobile.org:8080/pick.html',
   *   manifestURL: 'http://gallery.gaiamobile.org:8080/manifest.webapp'
   * }, app);
   *
   * @class ActivityWindow
   * @param {Object} config The configuration object of this activity.
   * @param {AppWindow|ActivityWindow} caller The caller of this activity.
   */
  /**
   * Fired when the activity window is created.
   * @event ActivityWindow#activitycreated
   */
  /**
   * Fired when the activity window is removed.
   * @event ActivityWindow#activityterminated
   */
  /**
   * Fired when the activity window is opening.
   * @event ActivityWindow#activityopening
   */
  /**
   * Fired when the activity window is opened.
   * @event ActivityWindow#activityopen
   */
  /**
   * Fired when the activity window is cloing.
   * @event ActivityWindow#activityclosing
   */
  /**
   * Fired when the activity window is closed.
   * @event ActivityWindow#activityclose
   */
  /**
   * Fired before the activity window is rendered.
   * @event ActivityWindow#activitywillrender
   */
  /**
   * Fired when the activity window is rendered to the DOM tree.
   * @event ActivityWindow#activityrendered
   */
  /**
   * Fired when the page visibility of the activity window is
   * changed to foreground.
   * @event ActivityWindow#activityforeground
   */
  /**
   * Fired when the page visibility of the activity window is
   * changed to background.
   * @event ActivityWindow#activitybackground
   */
  var ActivityWindow = function ActivityWindow(config, caller) {
    this.config = config;
    for (var key in config) {
      this[key] = config[key];
    }

    if (caller) {
      caller.setFrontWindow(this);
      this.rearWindow = caller;
      if (caller.element) {
        this.containerElement = caller.element;
      }
    }

    this.publish('creating');
    this.render();
    this.publish('created');
  };

  ActivityWindow.prototype = Object.create(AppWindow.prototype);

  ActivityWindow.prototype.constructor = ActivityWindow;

  ActivityWindow.prototype.eventPrefix = 'activity';

  ActivityWindow.prototype.CLASS_NAME = 'ActivityWindow';

  /**
   * Turn on this flag to dump debugging messages for all activity windows.
   * @type {Boolean}
   */
  ActivityWindow.prototype._DEBUG = false;

  ActivityWindow.prototype.openAnimation = 'fade-in';
  ActivityWindow.prototype.closeAnimation = 'fade-out';

  /**
   * ActivityWindow's fullscreen state is copying from the caller
   * instead of reading manifest so we just overwrite the
   * isFullScreen method of AppWindow.
   *
   * @return {Boolean} The activity window is fullscreen or not.
   */
  ActivityWindow.prototype.isFullScreen = function acw_isFullScreen() {
    if (typeof(this._fullscreen) !== 'undefined') {
      return this._fullscreen;
    }

    this._fullscreen = (this.manifest && !!this.manifest.fullscreen) ?
                       !!this.manifest.fullscreen :
                       (this.rearWindow && this.rearWindow.isFullScreen) ?
                       this.rearWindow.isFullScreen() :
                       false;
    return this._fullscreen;
  };

  /**
   * Lock or unlock orientation for this activity.
   */
  ActivityWindow.prototype.lockOrientation =
    function acw_lockOrientation(noCapture) {
      if (this.isActive()) {
        var orientation1 = (this.manifest) ?
                            this.manifest.orientation : null;
        var orientation2 = (this.config.manifest) ?
                            this.config.manifest.orientation : null;
        var orientation3 = (this.rearWindow.manifest) ?
                            this.rearWindow.manifest.orientation : null;
        var orientation4 = OrientationManager.globalOrientation;

        var orientation = orientation1 ||
                          orientation2 ||
                          orientation3 ||
                          orientation4;

        if (orientation) {
          var rv = false;
          if ('lockOrientation' in screen) {
            rv = screen.lockOrientation(orientation);
          } else if ('mozLockOrientation' in screen) {
            rv = screen.mozLockOrientation(orientation);
          }
          if (rv === false) {
            console.warn('screen.mozLockOrientation() returned false for',
                         this.origin, 'orientation', orientation);
          }
        } else {  // If no orientation was requested, then let it rotate
          if ('unlockOrientation' in screen) {
            screen.unlockOrientation();
          } else if ('mozUnlockOrientation' in screen) {
            screen.mozUnlockOrientation();
          }
        }
      }
    };

  ActivityWindow.prototype.view = function acw_view() {
    this.instanceID = this.CLASS_NAME + '_' + _id;
    _id++;
    return `<div id="${this.instanceID}"
            class="appWindow activityWindow inline-activity">
            <div class="fade-overlay"></div>
            <div class="browser-container">
             <div class="screenshot-overlay"></div>
            </div>
            </div>`;
  };

  ActivityWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'valueSelector': window.ValueSelector,
    'authDialog': window.AppAuthenticationDialog,
    'childWindowFactory': window.ChildWindowFactory,
    'statusbar': window.AppStatusbar
  };

  ActivityWindow.SUB_MODULES = {
    'contextmenu': 'BrowserContextMenu'
  };

  ActivityWindow.REGISTERED_EVENTS = AppWindow.REGISTERED_EVENTS;

  ActivityWindow.prototype._handle_mozbrowseractivitydone =
    function aw__handle_mozbrowseractivitydone() {
      this.kill();
    };

  ActivityWindow.prototype.render = function acw_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    // TODO: Use BrowserConfigHelper.
    this.browser_config = {
      parentApp: this.parentApp,
      origin: this.origin,
      url: this.url,
      name: this.name,
      manifest: this.manifest,
      manifestURL: this.manifestURL,
      window_name: 'inline' + this.instanceID,
      oop: true
    };
    this.browser = new BrowserFrame(this.browser_config);
    this.element =
      document.getElementById(this.instanceID);

    this.browserContainer = this.element.querySelector('.browser-container');
    this.browserContainer.appendChild(this.browser.element);
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');
    this.fadeOverlay = this.element.querySelector('.fade-overlay');

    // Copy fullscreen state from caller.
    if (this.isFullScreen()) {
      this.element.classList.add('fullscreen-app');
    }

    this._registerEvents();
    this.installSubComponents();
    this.publish('rendered');
  };

  /**
   * ActivityWindow's default container is '#windows'.
   * However, we could dynamically change this in layout manager
   * after it recieves the activitywillrender event.
   */
  ActivityWindow.prototype.containerElement =
    document.getElementById('windows');

  /**
   * Bringing ourselves up. To do so we simply do
   * requestOpen() the original caller app window instance.
   * Note: this overrides AppWindow.prototype.requestOpen().
   */
  ActivityWindow.prototype.requestOpen = function acw_requestOpen() {
    if (this.rearWindow) {
      this.rearWindow.requestOpen();
    }
  };

  /**
   * Request to close. We don't need to reset the visibility of
   * the bottom window here so we simply close.
   * Note: this overrides AppWindow.prototype.requestClose().
   */
  ActivityWindow.prototype.requestClose = function acw_requestOpen() {
    this.close();
  };

  exports.ActivityWindow = ActivityWindow;

}(window));
