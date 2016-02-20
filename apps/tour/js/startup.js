/* global URLSearchParams, eventSafety, Tutorial, TutorialUtils */
(function startup() {
  'use strict';
  console.log('tour/startup');

  function whenEvent(target, name, timeoutMs) {
    return new Promise((resolve, reject) => {
      eventSafety(target, name, resolve, timeoutMs || 1000);
    });
  }

  /**
   * @class AppStarter
   * @returns {AppStarter}
   */
  function AppStarter(launchContext={}) {
    // device characteristics
    // paths to tour resources
    // properties to assemble the tour from possible screens
    // panel/tourids which we can check off as seen
    this.launchContext = launchContext;
    // upgradeFrom, upgradeTo, assetPath|deviceType
  }

  AppStarter.prototype = {
    splashTimeout: 1025,
    _started: false,

    /**
     * Returns the initial panel id based on the pending system message. If
     * there is no system message available, it returns 'root'.
     *
     * @access private
     * @memberOf AppStarter.prototype
     * @returns {Promise.<String>}
     */
    ready: function as_ready() {
      if (this._readyPromise) {
        return this._readyPromise;
      }

      var promises = [
        document.l10n.ready
      ];

      if (navigator.mozHasPendingMessage('activity')) {
        promises.push(new Promise((resolve) => {
          navigator.mozSetMessageHandler('activity', (activity) => {
            this._currentActivity = activity;
            console.log('activity message handler, got source: ',
                        activity.source);
            var params = activity.source.data;
            if (params) {
              if (params.upgradeFrom) {
                this.launchContext.upgradeFrom = params.upgradeFrom;
              }
              if (params.upgradeTo) {
                this.launchContext.upgradeTo = params.upgradeTo;
              }
            }
            resolve();
          });
        }));
      } else {
        promises.push(Promise.resolve('root'));
      }
      return (this._readyPromise = Promise.all(promises));
    },

    /**
     * Load all config data and resources, and start the tutorial
     *
     * @access public
     * @memberOf AppStarter.prototype
     */
    start: function as_start() {
      if (this._started) {
        return;
      } else {
        this._started = true;
      }
      console.log('tour/startup, start');
      var splashScreen = document.getElementById('splash-screen');
      var tutorialScreen = document.getElementById('tutorial');
      tutorialScreen.classList.add('show');
      splashScreen.classList.remove('show');
      var splashScreenHidden = whenEvent(splashScreen,
                                         'transitionend',
                                         this.splashTimeout).then(() => {
        // container.removeAttribute('aria-hidden');
        console.log('splashScreen transitionend');
        window.performance.mark('visuallyLoaded');
      });

      Promise.all([
        TutorialUtils.loadConfig(),
        this.ready(),
        splashScreenHidden
      ]).then((results) => {
        var tourData = results[0];
        console.log('got tourData: ', JSON.stringify(tourData));
        var tutorial = new Tutorial();
        console.log('tutorial instance created, passing launchContext:',
                    JSON.stringify(this.launchContext));
        tutorial.init(this.launchContext, tourData);
        tutorial.start();
        console.log('/tutorial.start');
      });
    }
  };

  var launchContext = {
    deviceType: '',
    upgradeTo: '',
    upgradeFrom: ''
  };

  if (window.location.search) {
    var searchParams = new URLSearchParams(window.location.search.substr(1));
    Object.keys(launchContext).forEach(key => {
      if (searchParams.has(key)) {
        launchContext[key] = searchParams.get(key);
      }
    });
  }

  var appStarter = new AppStarter(launchContext);
  appStarter.start();

})();
