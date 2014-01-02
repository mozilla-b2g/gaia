'use strict';

var hasRunCommands = {};

exports.joinPath = function() {
	var args = Array.prototype.slice.call(arguments);
		return args.join('/');
	};
exports.Commander = function(type) {
	hasRunCommands[type] = [];
	this.run = function(cmds) {
		hasRunCommands[type].push(cmds.join(' '));
	};
	this.initPath = function() {
	};
};

exports.hasRunCommands = hasRunCommands;

exports.psParser = function(content) {
	return content;
};

exports.getEnvPath = function() {
};
