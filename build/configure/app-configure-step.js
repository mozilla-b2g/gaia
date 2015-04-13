'use strict';

var utils = require('./../utils');

var DependencyGraph = require('./dependency-graph');
var BuildConfig = require('./build-config');

// Default building steps before app's default building steps.
// TODO: We should have a module to map these steps with different app's own
//       config data, so that app could easily to add/remove/reorder steps for
//       different situations.
const POST_APP_BUILD_STEPS = [
  'media-resolution',
  'post-manifest',
  'multilocale',
  'copy-build-stage-data',
  'webapp-optimize',
  'webapp-zip'
];

/**
 * AppConfigureStep would generate all the data for build back-end, ideally it
 * should only manage the steps relating to app itself, like app's own
 * buildscript and POST_APP_BUILD_STEPS.
 *
 * @param {object} options - BUILD_CONFIG from main Makefile.
 * @param {string} appDir - the app's source dir path.
 * @constructor
 */
var AppConfigureStep = function(options, appDir) {
  this.appDir = appDir;
  this.webapp = utils.getWebapp(appDir, options);
  this.name = this.webapp.sourceDirectoryName;
  this.options = options;
  this.buildConfig = new BuildConfig();
  this._preSteps = [];
};

AppConfigureStep.prototype = {
  /**
   * Configure start from here.
   */
  start: function() {
    var options = this.options;
    this.appDirFile = utils.getFile(this.appDir);

    // we'll execute our current modules with stringified options.
    this.appOptions = utils.cloneJSON(options);

    this.appOptions.APP_DIR = this.appDir,
    this.appOptions.STAGE_APP_DIR = utils.joinPath(this.options.STAGE_DIR,
      this.appDirFile.leafName);
    this.appOptions.webapp = this.webapp;
    // We may encounter error while stringify manifest , put it to command line
    // and parse it back to json object, so we simply delete these since the
    // following steps don't need these attributes.
    delete this.appOptions.webapp.manifest;
    delete this.appOptions.webapp.metaData;

    utils.ensureFolderExists(utils.getFile(this.appOptions.STAGE_APP_DIR));

    this.buildConfig.addConfig('APP_OPTIONS', this.appOptions);

    // We have to rewrite below two ENV since they're using abspath and CURDIR.
    this.buildConfig.addConfig('GAIA_DIR',
      options.GAIA_DIR);
    this.buildConfig.addConfig('XPCSHELLSDK',
      options.XPCSHELLSDK);
    this.buildConfig.addConfig('XULRUNNERSDK',
      options.XULRUNNERSDK);

    // Create app's own makefile and store in STAGE_APP_DIR/app.mk.
    this.appMkPath = utils.joinPath(this.appOptions.STAGE_APP_DIR, 'Makefile');
    this.mainMake = new DependencyGraph(this.appMkPath);
    this.mainMake.insertTask(null, 'all',
      [this.options.PROFILE_DIR]);
    this.mainMake.insertTask(null,
      this.options.PROFILE_DIR,
      [
        this.appMkPath,
        utils.joinPath(this.options.GAIA_DIR, 'build', 'configure')

      ], [
        // We use EXECUTE_BY_SCRIPT flag to identify the makefile is executed
        // by script or user.
        '@if [[ "$(EXECUTE_BY_SCRIPT)" == "" ]] ; then \\',
        '  echo "STOP! $($?) has been changed!";\\',
        '  echo "Please rerun Makefile under gaia folder.";\\',
        '  echo "To ignore this message, touch ' +
          this.options.PROFILE_DIR + ',";\\',
        '  echo "but your build might not succeed.";\\',
        '  exit 1;\\',
        'fi'
      ] 
    );
    this.genAppConfig();

    this.mainMake.genBackend(this.buildConfig.getOutput('makefile'));
  },

  get makeCommand() {
    return '@make -C ' + this.appOptions.STAGE_APP_DIR +
      ' EXECUTE_BY_SCRIPT=1';
  },

  /**
   * In order to run buildscript under each app, we need to use below command.
   * XXX: we should try to fix it in xpcshell-commonjs.js.
   *
   * @param {string} moduleName - the module we would like to execute.
   */
  templateCommand: function(moduleName) {
    return '@$(XULRUNNERSDK) $(XPCSHELLSDK) -f ' +
      '$(GAIA_DIR)/build/xpcshell-commonjs.js ' +
      '-e "run(\'' + moduleName + '\',$(APP_OPTIONS));"';
  },

  /**
   * Generate app's own config data for build back-end.
   */
  genAppConfig: function() {
    var buildFile = utils.getFile(this.appDir, 'build', 'build.js');
    this.mainMake.insertTask(
      'phony',
      this.webapp.sourceDirectoryName + '-build',
      this._preSteps,
      [
        '@echo building ' + this.webapp.sourceDirectoryName + '\n\t',
        buildFile.exists() ?
          // execute app's build.js if it has.
          (this.templateCommand(this.webapp.sourceDirectoryName + '/build')) :
          // if app has no build.js, we only copy the folder to build_stage.
          ('@cp -r ' + this.appDir + ' ' + this.options.STAGE_DIR)
      ]
    );

    this._preSteps = [this.webapp.sourceDirectoryName + '-build'];
    POST_APP_BUILD_STEPS.forEach(function(step) {
      if (this.options.DEBUG !== '0' && step === 'webapp-zip') {
        return;
      }
      var cmd = this.templateCommand(step);
      step = this.webapp.sourceDirectoryName + '-' + step;
      this.mainMake.insertTask(
        'phony',
        step,
        this._preSteps,
        [cmd]
      );
      this._preSteps = [step];
    }, this);
    this._preSteps.forEach(function(step) {
      this.mainMake.insertDep('all', step);
    }, this);
  }
};

module.exports = AppConfigureStep;
