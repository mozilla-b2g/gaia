/* global HomescreenWindow */

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
    return this;
  };

  LandingAppWindow.prototype = Object.create(HomescreenWindow.prototype);

  LandingAppWindow.prototype.CLASS_NAME = 'LandingAppWindow';

  LandingAppWindow.prototype.openAnimation = 'immediately';
  LandingAppWindow.prototype.closeAnimation = 'immediately';

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
      } else {
        // we add time as hash to tell app it is ensured and app can use it to
        // scroll to top, like vertical home.
        this.browser.element.src = this.browser_config.url.indexOf('#') > -1 ?
                                   this.browser_config.url + Date.now() :
                                   this.browser_config.url + '#' + Date.now();
      }
    }

    return this.element;
  };

  exports.LandingAppWindow = LandingAppWindow;
}(window));
