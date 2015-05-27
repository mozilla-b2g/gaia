'use strict';

var utils = require('./../utils');
var DependencyGraph = require('./dependency-graph');
var AppConfigureStep = require('./app-configure-step');
var BuildConfig = require('./build-config');

// Default building steps before app's own building steps.
// TODO: We should have a module to map these steps with different ENV variable,
//       so that we could easily to add/remove/reorder steps for different
//       situations. For example, we dont need settings step while building
//       single app.
const PRE_APP_BUILD_STEPS = [
  'svoperapps',
  'webapp-manifests',
  'contacts-import-services',
  'search-provider',
  'keyboard-layouts',
  'preferences',
  'settings',
  'webapp-shared',
  'copy-common-files'
];

/**
 * ConfigureStep would generate all the data for build back-end. Currently would
 * contain PRE_APP_BUILD_STEPS and each app's steps.
 * @param {object} options - BUILD_CONFIG from build-config.in.
 * @constructor
 */
var ConfigureStep = function() {
  try {
    this.options = JSON.parse(utils.getEnv('BUILD_CONFIG'));
  } catch (e) {
    throw 'Cannot parse BUILD_CONFIG data';
  }
  this.buildConfig = new BuildConfig();
};

ConfigureStep.prototype = {
  /**
   * Configure start from here.
   */
  start: function() {
    var commonMkPath = utils.joinPath(this.options.STAGE_DIR, 'Makefile');
    this.mainMake = new DependencyGraph(commonMkPath);

    this.buildConfig.addConfig('BUILD_CONFIG',
      JSON.stringify(this.options).replace(/\\/g, '\\\\').replace(/"/g, '\\"'));
    this.buildConfig.addConfig('GAIA_DIR',
      this.options.GAIA_DIR);
    this.buildConfig.addConfig('XPCSHELLSDK',
      this.options.XPCSHELLSDK);
    this.buildConfig.addConfig('XULRUNNERSDK',
      this.options.XULRUNNERSDK);

    this.mainMake.insertTask(null, 'all');
    // TODO: we should be able to detect whether to regenerate makefile.
    this.preAppConfig();
    this.postAppConfig();
    // build-config.in has contained all necessary ENV data for the generated
    // makefile.
    this.mainMake.genBackend(this.buildConfig.getOutput('makefile'));

    // Execute the generated makefile directly.
    this.mainMake.executeBackend(this.options.CPU_NUM);
  },

  /**
   * Generate config data from PRE_APP_BUILD_STEPS.
   */
  preAppConfig: function() {
    this._stepIndex = this.options.STAGE_DIR;
    PRE_APP_BUILD_STEPS.forEach(function(step) {
      // We don't generate setting.js if only build one app.
      // TODO: We should have a module to map these steps with different ENV
      //       variable.
      if (this.options.BUILD_APP_NAME !== '*' && step === 'settings') {
        return;
      }
      this.mainMake.insertTask(
        'phony',
        'build-' + step,
        [this._stepIndex],
        [
          '@$(XULRUNNERSDK) $(XPCSHELLSDK) -f ' +
          '$(GAIA_DIR)/build/xpcshell-commonjs.js -e "run(\'' + step + '\',' +
          '$(BUILD_CONFIG));"'
        ]
      );
      this._stepIndex = 'build-' + step;
    }, this);
  },

  /**
   * Check whether the app should be reconfig or not. currently we only use it
   * to filter appDir by BUILD_APP_NAME.
   * @param {string} appDir - the app folder path.
   */
  shouldBuild: function(appDir) {
    var buildAppName = this.options.BUILD_APP_NAME;
    if (buildAppName === '*') {
      return true;
    } else if (buildAppName === 'callscreen' &&
               appDir.indexOf('communications') !== -1) {
    // A workaround for bug 1093267 in order to handle callscreen's l10n
    // broken. Callscreen will generate incorrect multilocale strings if
    // build_stage/communications/dialer/locales is removed by
    // webapp-optimize. After bug 1093267 has been resolved, we're going to
    // get rid of this.
      return true;
    } else {
      return utils.getAppNameRegex(this.options.BUILD_APP_NAME).test(appDir);
    }
  },
  /**
   * Generate config data from app's AppConfigureStep and set it depends on
   * build_profile.
   */
  postAppConfig: function() {
    this.mainMake.insertTask(
      'phony',
      'pre-stage',
      [this._stepIndex]
    );

    this.options.GAIA_APPDIRS.split(' ').forEach(function(app) {
      if (!this.shouldBuild(app)) {
        return;
      }
      // TODO: App should be able to trigger AppConfigureStep by itself, so that
      //       app can easily customize their own config steps.
      var appBuild = new AppConfigureStep(this.options, app);
      appBuild.start();
      this.mainMake.insertTask(
        'phony',
        appBuild.name + '-app-build',
        ['pre-stage'],
        [appBuild.makeCommand]
      );

      if (appBuild.name === 'callscreen') {
      // A workaround for bug 1093267 in order to handle callscreen's l10n
      // broken. Callscreen will generate incorrect multilocale strings if
      // build_stage/communications/dialer/locales is removed by
      // webapp-optimize. After bug 1093267 has been resolved, we're going to
      // get rid of this.
        this.mainMake.insertDep(appBuild.name + '-app-build',
          'communications-app-build');
      }

      this.mainMake.insertDep(
        'all',
        appBuild.name + '-app-build'
      );
    }, this);
  }
};

var configStep = new ConfigureStep();
configStep.start();
