'use strict';

var utils = require('utils');
var Makefile = require('./configure/makefile');

var PRE_APP_BUILD_STEPS = [
  'clean-stage-app',
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

var POST_APP_BUILD_STEPS = [
  'media-resolution',
  'post-manifest',
  'multilocale',
  'copy-build-stage-data',
  'webapp-optimize',
  'webapp-zip'
];

/**
 * AppConfigureStep would generate all the data for Buildbackend, ideally it
 * should only manage the steps relating to app itself, like app's own
 * buildscript and POST_APP_BUILD_STEPS.
 *
 * @param {object} options - build_config from main Makefile.
 * @param {string} appDir - the app's source dir path.
 * @constructor
 */
var AppConfigureStep = function(options, appDir) {
  this.appDir = appDir;
  this.webapp = utils.getWebapp(appDir, options);
  this.name = this.webapp.sourceDirectoryName;
  this.options = options;
};

AppConfigureStep.prototype = {
  /**
   * Configure start from here.
   *
   * @param {[string]} previousSteps - the steps we should finish before app's
   *                                   building steps.
   */
  start: function(previousSteps) {
    var options = this.options;
    this._preSteps = previousSteps;
    this.appDirFile = utils.getFile(this.appDir);
    this.xpcshell = utils.getEnv('XPCSHELLSDK');

    // we'll execute our current modules with stringified options.
    this.appOptions = utils.cloneJSON(options);

    this.appOptions.APP_DIR = this.appDir,
    this.appOptions.STAGE_APP_DIR = utils.joinPath(this.options.STAGE_DIR,
      this.appDirFile.leafName);
    this.appOptions.webapp = this.webapp;
    // We may encouter error while stringify manifest , put it to command line
    // and parse it back to json object, so we simply delete these since the
    // following steps don't need these attributes.
    delete this.appOptions.webapp.manifest;
    delete this.appOptions.webapp.metaData;

    utils.ensureFolderExists(utils.getFile(utils.joinPath(
      this.options.STAGE_DIR, 'mks')));
    // Create app's own makefile and store in build_stage/mks.
    this.appMkPath = utils.joinPath(this.options.STAGE_DIR, 'mks',
      this.webapp.sourceDirectoryName + '.mk');
    this.mainMake = new Makefile(this.appMkPath);

    this.genAppConfig();
    this.mainMake.genMakefile();
  },

  get appConfigData() {
    return JSON.stringify(this.appOptions)
      .replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  },
  /**
   * In order to run buildscript under each app, we need to use below command.
   * XXX: we should try to fix it in xpcshell-commonjs.js.
   *
   * @param {string} moduleName - the module we would like to execute.
   */
  templateCommand: function(moduleName) {
    return '@' + this.xpcshell + ' -f ' + this.options.GAIA_DIR +
      '/build/xpcshell-commonjs.js -e "run(\'' + moduleName + '\',\'' +
      this.appConfigData + '\');"';
  },

  // Get the last building steps of the app.
  get lastSteps() {
    return this._preSteps;
  },

  /**
   * Generate app's own config data for buildbackend.
   */
  genAppConfig: function() {
    var buildFile = utils.getFile(this.appDir, 'build', 'build.js');
    if (buildFile.exists()) {
      // execute app's build.js if it has.
      this.mainMake.insertTask(
        'phony',
        this.webapp.sourceDirectoryName + '_build',
        this._preSteps,
        this.templateCommand('build-app')
      );
    } else {
      // if no app's build.js, we only copy the folder to build_stage.
      this.mainMake.insertTask(
        'phony',
        this.webapp.sourceDirectoryName + '_build',
        this._preSteps,
        '@cp -r ' + this.appDir + ' ' + this.options.STAGE_DIR
      );
    }

    this._preSteps = [this.webapp.sourceDirectoryName + '_build'];
    POST_APP_BUILD_STEPS.forEach(function(step) {
      if (this.options.DEBUG !== '0' && step === 'webapp-zip') {
        return;
      }
      var cmd = this.templateCommand(step);
      step = this.webapp.sourceDirectoryName + '_' + step;
      this.mainMake.insertTask(
        'phony',
        step,
        this._preSteps,
        cmd
      );
      this._preSteps = [step];
    }, this);
  }
};

/**
 * ConfigureStep would generate all the data for Buildbackend. Currently would
 * contain PRE_APP_BUILD_STEPS and each app's steps.
 * @param {object} options - build_config from main Makefile.
 * @constructor
 */

var ConfigureStep = function(options) {
  this.options = options;
};

ConfigureStep.prototype = {
  /**
   * Configure start from here.
   */
  start: function() {
    var commonMkPath = utils.joinPath(this.options.GAIA_DIR, 'all.mk');
    this.mainMake = new Makefile(commonMkPath);

    // TODO: we should be able to detect whether to regenerate makefile.
    this.preAppConfig();
    this.postAppConfig();
    this.mainMake.genMakefile();

    // Execute build_profile directly.
    this.mainMake.executeMakefile('build_' + this.options.PROFILE_FOLDER,
      (parseInt(this.options.P) > 0 ? 8 : 1));
  },

  /**
   * Generate config data from PRE_APP_BUILD_STEPS.
   */
  preAppConfig: function() {
    this._stepIndex = this.options.STAGE_DIR;
    PRE_APP_BUILD_STEPS.forEach(function(step) {
      if (this.options.BUILD_APP_NAME !== '*' && step === 'settings') {
        return;
      }
      this.mainMake.insertTask(
        'phony',
        'build_' + step,
        [this._stepIndex],
        '@$(call $(BUILD_RUNNER),' + step + ')'
      );
      this._stepIndex = 'build_' + step;
    }, this);
  },

  /**
   * Check whether the app should be reconfig or not.
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
      'pre_stage',
      [this._stepIndex]
    );

    this.mainMake.insertTask(
      'phony',
      'pre_profile'
    );

    this.options.GAIA_APPDIRS.split(' ').forEach(function(app) {
      if (!this.shouldBuild(app)) {
        return;
      }
      var appBuild = new AppConfigureStep(this.options, app);
      if (appBuild.name === 'callscreen') {
        // A workaround for bug 1093267 as well.
        appBuild.start(['communications_app_build', 'pre_stage']);
      } else {
        appBuild.start(['pre_stage']);        
      }
      this.mainMake.insertTask(
        'include',
        'include ' + appBuild.appMkPath
      );
      this.mainMake.insertTask(
        'phony',
        appBuild.name + '_app_build',
        appBuild.lastSteps,
        '@echo Building ' + appBuild.name
      );
      this.mainMake.insertDep(
        'pre_profile',
        appBuild.name + '_app_build'
      );
    }, this);

    this.mainMake.insertTask(
      'phony',
      'build_' + this.options.PROFILE_FOLDER,
      [
        'pre_profile'
      ]
    );
  }
};

function execute(options) {
  var configStep = new ConfigureStep(options);
  configStep.start();
}

exports.execute = execute;
