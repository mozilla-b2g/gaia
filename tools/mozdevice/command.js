var exec = require('child_process').exec;
var Promise = require('promise');
var debug = require('debug')('mozdevice:command');

var ADB_HOST = process.env.ADB_HOST;
var ADB_PORT = process.env.ADB_PORT;

/**
 * API for building up and executing shell commands
 * @param {string} [initialCommand] An optional first command
 * @constructor
 */
var Command = function(initialCommand) {
  this.builder = initialCommand ? [initialCommand] : [];
};

/**
 * Append content to the command builder
 * @param {string} content
 * @returns {Command}
 */
Command.prototype.append = function(content) {
  this.builder.push(content);
  return this;
};

/**
 * Append a command to be run against `adb <command>`
 * @param {string} command
 * @returns {Command}
 */
Command.prototype.adb = function(command) {
  var commandBuilder = ['adb'];

  if (ADB_HOST) {
    commandBuilder.push('-H ' + ADB_HOST);
  }

  if (ADB_PORT) {
    commandBuilder.push('-P ' + ADB_PORT);
  }

  commandBuilder.push(command);
  this.builder.push(commandBuilder.join(' '));

  return this;
};

/**
 * Append a command to be run against `adb shell <command>`
 * @param {string} command
 * @returns {Command}
 */
Command.prototype.adbShell = function(command) {
  return this.adb("shell '" + command + "'");
};

/**
 * Append an AND (&&) to the builder with an optional AND-ed command
 * @param {string} [command]
 * @returns {Command}
 */
Command.prototype.and = function (command) {
  this.builder.push('&&');
  if (command) {
    this.builder.push(command);
  }
  return this;
};

/**
 * Append a PIPE (|) to the builder with an optional PIPE-ed command
 * @param {string} [command]
 * @returns {Command}
 */
Command.prototype.pipe = function(command) {
  this.builder.push('|');
  if (command) {
    this.builder.push(command);
  }
  return this;
};

/**
 * Get the stringified value of the current command build
 * @returns {string}
 */
Command.prototype.value = function() {
  return this.builder.join(' ');
};

/**
 * Append a command to be run against `echo <command>`
 * @param {string} command
 * @returns {Command}
 */
Command.prototype.echo = function(command) {
  this.builder.push('echo ' + command);
  return this;
};

/**
 * Append an environment variable to be run as `<name>=<command>`
 * @param {string} name Environment variable name
 * @param {string} command Environment variable value
 * @returns {Command}
 */
Command.prototype.env = function(name, command) {
  this.builder.push(name + '=' + command);
  return this;
};

/**
 * Execute the built command in a child process
 * @returns {Promise}
 */
Command.prototype.exec = function() {
  var command = this.value();
  debug('[Executing] %s', command);
  return new Promise(function(resolve, reject) {
    exec(command, function(err, stdout, stderr) {
      if (err) {
        return reject(err, stderr);
      }

      resolve(stdout);
    });
  });
};

module.exports = Command;
