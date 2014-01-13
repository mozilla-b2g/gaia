'use strict';

var utils = require('./utils');
var adb = new utils.Commander('adb');
var sh = new utils.Commander('sh');

function installGaia(profileFolder, remotePath) {
	var webapps_path = remotePath + '/webapps';
	adb.run(['shell', 'rm', '-r', webapps_path]);
	adb.run(['shell', 'rm', '/data/local/user.js']);
	adb.run(['push', utils.joinPath(profileFolder, 'webapps'), webapps_path]);
	adb.run(['push', utils.joinPath(profileFolder, 'user.js'),
					 '/data/local/user.js']);

	var indexedDbFile = utils.getFile(profileFolder, 'indexedDB');
	if (indexedDbFile.exists() && indexedDbFile.isDirectory()) {
		adb.run(['push', indexedDbFile.path, '/data/local/indexedDB']);
	}
	return true;
}

function getPid(appName, gaiaDir) {
	var tempFileName = 'tmpFile';
	sh.run(['-c', 'rm ' + tempFileName]);
	sh.run(['-c', 'adb shell b2g-ps > ' + tempFileName]);
	var tempFile = utils.getFile(utils.joinPath(gaiaDir, tempFileName));
	var content = utils.getFileContent(tempFile);
	var pidMap = utils.psParser(content);
	sh.run(['-c', 'rm ' + tempFileName]);
	return pidMap[appName] ? pidMap[appName].PID : null;
}

function installSvoperapps(profileFolder) {
	var svoperappsUrl = '/data/local/svoperapps';
	adb.run(['shell', 'rm -r ' + svoperappsUrl]);
	adb.run(['push', utils.joinPath(profileFolder, 'svoperapps'),
		svoperappsUrl])
}

function execute(options) {
	const paths = utils.getEnvPath();
	const buildAppName = options.BUILD_APP_NAME;
	const gaiaDir = options.GAIA_DIR;
	const profileFolder = options.PROFILE_DIR;
	const gaiaDomain = options.GAIA_DOMAIN;
	const remotePath = options.GAIA_INSTALL_PARENT || '/system/b2g';

	adb.initPath(paths);
	sh.initPath(paths);

	adb.run(['start-server']);

	var profile = utils.getFile(profileFolder);
	if (!profile.isDirectory()) {
		throw new Error(' -*- build/install-gaia.js: cannot locate' +
										'profile folder in ' + options.PROFILE_DIR);
	}

	if (buildAppName === '*' || buildAppName === 'system') {
		adb.run(['shell', 'stop', 'b2g']);
	}

	adb.run(['shell','rm -r /cache/*']);

	if (buildAppName === '*') {
		installGaia(profileFolder, remotePath);
	} else {
		var targetFolder = utils.joinPath(
					profileFolder, 'webapps',
					buildAppName + '.' + gaiaDomain);
		adb.run(['push',
			utils.joinPath(targetFolder, 'manifest.webapp'),
			remotePath + '/webapps/' + buildAppName + '.' +
			gaiaDomain + '/manifest.webapp']);
		adb.run(['push',
			utils.joinPath(targetFolder, 'application.zip'),
			remotePath + '/webapps/' + buildAppName + '.' +
			gaiaDomain + '/application.zip']);
	}

	if (options.VARIANT_PATH) {
		installSvoperapps(profileFolder);
	}

	if (buildAppName === '*' || buildAppName === 'system') {
		adb.run(['shell', 'start', 'b2g']);
	} else {
		// Some app folder name is different with the process name,
		// ex. sms -> Messages
		var manifest = utils.readZipManifest(utils.getFile(
										targetFolder));
		var appPid = getPid(manifest.name, gaiaDir);
		if (appPid) {
			adb.run(['shell', 'kill', appPid]);
		}
	}
}

exports.execute = execute;
exports.getPid = getPid;
exports.installSvoperapps = installSvoperapps;
exports.installGaia = installGaia;
