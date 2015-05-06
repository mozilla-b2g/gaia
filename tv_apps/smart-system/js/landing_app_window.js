/* global HomescreenWindow, focusManager */

'use strict';
(function(exports) {
  /**
   * LandingAppWindow creates a instance of landing app by give manifestURL.
   *
   * @class LandingAppWindow
   * @param {String} manifestURL The manifestURL of the landing app app.
   * @extends HomescreenWindow
   */
  var LandingAppWindow = function LandingAppWindow(manifestURL) {
    this.instanceID = 'landing-app';
    this.setBrowserConfig(manifestURL);
    this.render();
    this.publish('created');
    this.createdTime = this.launchTime = Date.now();
    focusManager.addUI(this);
    return this;
  };

  LandingAppWindow.prototype = Object.create(HomescreenWindow.prototype);

  LandingAppWindow.prototype.CLASS_NAME = 'LandingAppWindow';

  LandingAppWindow.prototype.openAnimation = 'invoked';
  LandingAppWindow.prototype.closeAnimation = 'immediate';

  LandingAppWindow.prototype.view = function hw_view() {
    return '<div class="appWindow homescreen landing-app" id="landing-app">' +
              '<div class="titlebar">' +
              ' <div class="notifications-shadow"></div>' +
              '</div>' +
              '<div class="fade-overlay"></div>' +
              '<div class="browser-container"></div>' +
           '</div>';
  };

  LandingAppWindow.prototype.ensure = function hw_ensure(reset) {
    this.debug('ensuring homescreen...', this.frontWindow);
    if (!this.element) {
      this.render();
    } else if (reset) {
      if (this.frontWindow) {
        // Just kill front window but not switch to the first page.
        this.frontWindow.kill();
      }
    }

    return this.element;
  };

  exports.LandingAppWindow = LandingAppWindow;
}(window));
