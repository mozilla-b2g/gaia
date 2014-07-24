'use strict';
/* global Rocketbar, AppWindowManager */

(function(exports) {

  /**
   * HomeSearchbar is a temporary file to bridge Rocketbar search with the
   * homescreen for the 2.0 release. It handles message passing between the two
   * and can be removed when we have the full rocketbar.
   * @class HomeSearchbar
   */
  function HomeSearchbar() {
    Rocketbar.call(this);
  }

  HomeSearchbar.prototype = Object.create(Rocketbar.prototype);

  /**
   * We stop listening to events when Rocketbar is enabled.
   * @memberof HomeSearchbar.prototype
   */
  HomeSearchbar.prototype.start = function() {
    this.removeEventListeners();
    this.body.classList.remove('homesearch-enabled');
    this.enabled = false;
  };

  /**
   * We start listening to events when Rocketbar is disabled.
   * @memberof HomeSearchbar.prototype
   */
  HomeSearchbar.prototype.stop = function() {
    this.addEventListeners();
    this.body.classList.add('homesearch-enabled');
    this.enabled = true;
  };

  /**
   * Add event listeners. Called when Rocketbar is disabled, but homesearch
   * is enabled. Only adds listeners that the home search feature needs.
   * @memberof Rocketbar.prototype
   */
  HomeSearchbar.prototype.addEventListeners = function() {
    // Listen for events from window manager
    window.addEventListener('apploading', this);
    window.addEventListener('appforeground', this);
    window.addEventListener('apptitlechange', this);
    window.addEventListener('home', this);
    window.addEventListener('lockscreen-appopened', this);
    window.addEventListener('appopened', this);
    window.addEventListener('launchactivity', this, true);
    window.addEventListener('searchterminated', this);
    window.addEventListener('permissiondialoghide', this);
    window.addEventListener('attentionscreenshow', this);
    window.addEventListener('status-inactive', this);
    window.addEventListener('global-search-request', this);

    // Listen for events from Rocketbar
    this.input.addEventListener('focus', this);
    this.input.addEventListener('blur', this);
    this.input.addEventListener('input', this);
    this.cancel.addEventListener('click', this);
    this.clearBtn.addEventListener('click', this);
    this.form.addEventListener('submit', this);
    this.backdrop.addEventListener('click', this);

    // Listen for messages from search app
    window.addEventListener('iac-search-results', this);
  };


  /**
   * General event handler interface.
   * Only dispatches necessary events for the HomeSearchbar.
   * Ignores events that would be necessary for the full Rocketbar.
   * @param {Event} e Event.
   * @memberof HomeSearchbar.prototype
   */
  HomeSearchbar.prototype.handleEvent = function(e) {
    switch(e.type) {
      case 'apploading':
      case 'appforeground':
      case 'appopened':
      case 'attentionscreenshow':
      case 'status-inactive':
        this.rocketbar.classList.remove('expanded');
        this.screen.classList.remove('rocketbar-expanded');
        this.exitHome();
        this.hideResults();
        this.deactivate();
        break;
      case 'home':
        this.handleHome(e);
        break;
      case 'lockscreen-appopened':
        this.handleLock(e);
        break;
      case 'focus':
        this.handleFocus(e);
        break;
      case 'blur':
        this.handleBlur(e);
        break;
      case 'input':
        this.handleInput(e);
        break;
      case 'click':
        if (e.target == this.cancel) {
          this.handleCancel(e);
        } else if (e.target == this.clearBtn) {
          this.clear();
        } else if (e.target == this.backdrop) {
          this.deactivate();
        }
        break;
      case 'launchactivity':
        this.handleActivity(e);
        break;
      case 'searchterminated':
        this.handleSearchTerminated(e);
        break;
      case 'submit':
        this.handleSubmit(e);
        break;
      case 'iac-search-results':
        this.handleSearchMessage(e);
        break;
      case 'permissiondialoghide':
        if (this.active) {
          this.focus();
        }
        break;
      case 'global-search-request':
        var app = AppWindowManager.getActiveApp();
        if (app && app.titleBar) {
          app.titleBar.expand(function() {
            this.activate(setTimeout.bind(null, this.focus.bind(this)));
          }.bind(this));
        } else {
          this.activate(setTimeout.bind(null, this.focus.bind(this)));
        }
        break;
    }
  };

  // Preventing the RocketBar implementation from triggering a background
  // scale change before getting stuck because of the lack of transitionend.
  HomeSearchbar.prototype.enterHome = function() {};

  // Prevent the rocketbar input from being manually shown
  HomeSearchbar.prototype.show = function() { };

  exports.HomeSearchbar = HomeSearchbar;

}(window));
