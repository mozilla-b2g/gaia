'use strict';

var hasRunCommands = {};
var gaiaOriginURL = function(name, scheme, domain, port) {
  return scheme + name + '.' + domain + (port ? port : '');
};

exports.Q = require('q');

exports.joinPath = function() {
	var args = Array.prototype.slice.call(arguments);
		return args.join('/');
	};
exports.Commander = function(type) {
	hasRunCommands[type] = [];
	this.run = function(cmds, callback) {
		hasRunCommands[type].push(cmds.join(' '));
		callback && callback();
	};
	this.initPath = function() {
	};
};

exports.killAppByPid = function(appName) {
	hasRunCommands['sh'].push('-c adb shell kill ' + appName);
};

exports.hasRunCommands = hasRunCommands;

exports.psParser = function(content) {
	return content;
};

exports.getEnvPath = function() {
};

exports.processEvents = function() {
};

exports.getJSON = function() {
};

exports.gaiaOriginURL = gaiaOriginURL;

exports.gaiaManifestURL = function(name, scheme, domain, port) {
  return gaiaOriginURL(name, scheme, domain, port) + '/manifest.webapp';
}
