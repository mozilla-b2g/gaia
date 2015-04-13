'use strict';
var utils = require('utils');

/**
 * Makefile module can help you to generate new makefile, you can add new task,
 * add task dependency anytime, create .mk file and execute it.
 * The output file type should be able to replace with any backend like gulpfile
 * in the future.
 *
 * @param {string} filename - assign the filename of the makeifle
 * @constructor
 */
var Makefile = function(filename) {
  this.tasks = [];
  this.filename = filename || this.FILENAME;
  this.env = utils.getEnv('BUILD_CONFIG');
};

Makefile.prototype = {
  FILENAME: 'output.mk',
  /**
   * Insert new task target.
   * @param {string} type - type can be 'phony', 'include' and others. if we
   *                        assigh others it will generate as below:
   *                        |target|: |deps|
   *                          |commands|
   *
   *                        if we assign 'include', we assume you won't set deps
   *                        and commands and generate like below:
   *                        include |target|
   *
   *                        if we assign 'phony', it will generate as below:
   *                        .PHONY: |target|
   *                        |target|: |deps|
   *                          |commands|
   * @param {string} target - the target name of the task
   * @param {[string]} deps - all the dependency, they should be targets name we
   *                          already inserted.
   * @param {string} commands - the command to execute in this target.
   */
  insertTask: function(type, target, deps, commands) {
    this.tasks.unshift({
      type: type,
      target: target,
      deps: deps || [],
      commands: commands || ''
    });
  },

  /**
   * Insert dep to previous target.
   * @param {string} target - the target should already be inserted, or we will
   *                          create a new phony target.
   * @param {string} dep - the new dependency to add.
   */
  insertDep: function(target, dep) {
    var task;
    for (var id in this.tasks) {
      task = this.tasks[id];
      if (task.target === target) {
        break;
      }
    }
    if (!task) {
      this.insertTask('phony', target, [dep]);
    } else if (task.deps.indexOf(dep) === -1) {
      task.deps.push(dep);
    }
  },

  /**
   * Generate new makefile.
   */
  genMakefile: function() {
    var result = '';
    var outputFile = utils.getFile(this.filename);
    this.tasks.forEach(function(task) {
      if (task.type === 'include') {
        result += task.target + '\n\n';
        return;
      }
      if (task.type === 'phony') {
        result += '.PHONY: ' + task.target + '\n';
      }
      var depsContent = '';
      task.deps.forEach(function(dep) {
        depsContent += ' ' + dep;
      }, this);
      result += '' + task.target + ':' + depsContent +
        '\n\t' + task.commands + '\n\n';

    }, this);
    utils.writeContent(outputFile, result);
  },

  /**
   * Execute this makefile.
   * @param {string} target - 'make |target|'.
   *
   * XXX: currently we cannot execute the makefile directly since all the ENV
   *      parsing exists in main Makeifle. We should finish augumentManager
   *      module before execute it directly.
   */
  executeMakefile: function(target, parallelNum) {
    var envArray = [target];
    var envs = {};
    // Since we'll execute make by the makefile we generated, we need to make
    // sure previous ENV has been parsed to it.
    try {
      envs = JSON.parse(this.env);
    } catch (e) {}
    for (var env in envs) {
      envArray.push(env + '=' + envs[env]);
    }
    envArray.push('-j' + parallelNum);

    // XXX: this is a workaround as above. We should be able to execute this
    //      makefile directly like 'make -c output.mk'.
    var make = new utils.Commander('make');
    make.initPath(utils.getEnvPath());
    make.run(envArray, function(exitCode) {
      if (exitCode !== 0) {
        throw 'error';
      }
    });
  }
};

module.exports = Makefile;
