'use strict';

var utils = require('../utils');
var DependencyGraph = require('./dependency-graph');
var AppConfigureStep = require('./app-configure-step');
var BuildConfig = require('./build-config');

/**
 * ConfigureStep would generate all the data for build back-end.
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
   * Generate pre-app config data
   */
  preAppConfig: function() {
    var targetName;
    var depStep = this.options.STAGE_DIR;

    function templateCommand(step) {
      return '@$(XULRUNNERSDK) $(XPCSHELLSDK) -f $(GAIA_DIR)/build/xpcshell-commonjs.js -e ' +
        '"run(\'' + step + '\',$(BUILD_CONFIG));"';
    }

    // Include sub-configures
    require('../webapp-shared').execute(this.options);

    // Add sub-makefile task
    targetName = 'svoperapps';
    this.mainMake.insertTask(
      'phony',
      targetName,
      [depStep],
      [templateCommand(targetName)]
    );
    depStep = targetName;

    targetName = 'webapp-manifests';
    this.mainMake.insertTask(
      'phony',
      targetName,
      [depStep],
      [templateCommand(targetName)]
    );
    depStep = targetName;

    targetName = 'contacts-import-services';
    this.mainMake.insertTask(
      'phony',
      targetName,
      [depStep],
      [templateCommand(targetName)]
    );
    depStep = targetName;

    targetName = 'search-provider';
    this.mainMake.insertTask(
      'phony',
      targetName,
      [depStep],
      [templateCommand(targetName)]
    );
    depStep = targetName;

    targetName = 'keyboard-layouts';
    this.mainMake.insertTask(
      'phony',
      targetName,
      [depStep],
      [templateCommand(targetName)]
    );
    depStep = targetName;

    targetName = 'preferences';
    this.mainMake.insertTask(
      'phony',
      targetName,
      [depStep],
      [templateCommand(targetName)]
    );
    depStep = targetName;

    targetName = 'settings';
    this.mainMake.insertTask(
      'phony',
      targetName,
      [depStep],
      [templateCommand(targetName)]
    );
    depStep = targetName;

    targetName = 'webapp-shared';
    this.mainMake.insertTask(
      'phony',
      targetName,
      [depStep],
      ['@make -f ' + utils.joinPath(this.options.STAGE_DIR, 'Makefiles/',
        targetName + '.mk')]
    );
    depStep = targetName;

    targetName = 'copy-common-files';
    this.mainMake.insertTask(
      'phony',
      targetName,
      [depStep],
      [templateCommand(targetName)]
    );
    depStep = targetName;
    this._stepIndex = depStep;
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
