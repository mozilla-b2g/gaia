'use strict';

const { Cc, Ci, Cr, Cu } = require('chrome');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/Downloads.jsm');
Cu.import('resource://gre/modules/Promise.jsm');

Cu.import("resource://gre/modules/osfile.jsm");

var utils = require('./utils');
var path;
var tmpPaths = {};
var tmpFiles = {};
var config = {};
function logLine(msg) {
  utils.log('status', msg);
}

function installGaia() {
	try {
		if (config.REMOTE_PATH === '/system/b2g')
			installGaiaSlow();
		else
			installGaiaFast();
	} catch(e) {
		installGaiaSlow();
	}
	installPreloadData();
}

function install_gaia_slow() {
	var webapps_path = config.REMOTE_PATH + '/webapps';
	runCmd('adb', ['shell', 'rm', '-r', webapps_path]);
	runCmd('adb', ['shell', 'rm', '/data/local/user.js']);
	runCmd('adb', ['push', config.PROFILE_FOLDER + '/webapps', webapps_path]);
	runCmd('adb', ['push', config.PROFILE_FOLDER + '/user.js', '/data/local']);

}

function installGaiaFast() {

}

function installPreloadData() {
	logLine('true ? ' + runCmd('adb', ['shell', 'ls']));
	runCmd('adb', ['shell', 'ls']);
	runCmd('adb', ['shell', 'ls']);
}

// run command
// adb

// rm files

// tar command

// file access

function launchProcess(file, args) {
	var process;
	try {
    process = Cc["@mozilla.org/process/util;1"]
        			.createInstance(Ci.nsIProcess);
        			    logLine('process file ' + file);

    process.init(file);
  	process.run(true, args, args.length);
  	return true;
  } catch (e) {
  	return false;
  }
}

function runCmd(cmd, args) {

	var file;
	if (tmpPaths[cmd]) {
		file = locateFile(cmd, tmpPaths[cmd]);
	} else {
		for (var p in path) {
			var result = locateFile(cmd, path[p]);
			if (result) {
				file = result;
				break;
			}
		}
	}
	return launchProcess(file, args);
}

function locateFile(cmd, localPath) {
	var file;
	var p;
	file = new FileUtils.File(localPath);
	file.append(cmd);

	if (file.exists()) {
		tmpPaths[cmd] = localPath;
		logLine('file exist');
		return file;
	} else {
		return null;
	}
}

function getPath() {
	var env = Cc["@mozilla.org/process/environment;1"].
            getService(Ci.nsIEnvironment);
  var p = env.get('PATH');
  logLine('path is ' + p);
  if (config.SYS.indexOf("WIN")!== -1)
  	path = p.split(';');
  else
  	path = p.split(':');
}

function computeLocalHashesInDir(dir, hashes) {
	var folders = utils.ls(dir, false);
	for (folder in folders) {
		computeLocalHash(folder.leafName, folders[folder]);
	}
}

function computeLocalHash(filename, hashes) {

}


function execute(options) {
	config.ADB = options.ADB || 'adb';
	config.SYS = options.SYS || 'Darwin';
	config.REMOTE_PATH =
		(options.MSYS_FIX && options.GAIA_INSTALL_PARENT) ?
		(options.MSYS_FIX + options.GAIA_INSTALL_PARENT) :
		'/data/local/webapps';

	config.PROFILE_FOLDER =
		options.PROFILE_FOLDER || 'profile';

	getPath();
	installGaia();
}

exports.execute = execute;
