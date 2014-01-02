
var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils =
	require('./mock_utils.js');

suite('install-gaia.js', function() {
	var app;
	setup(function() {
			app = proxyquire.noCallThru().load(
							'../../install-gaia', {
								'./utils': mockUtils
							});
			mockUtils.getFileContent = function(file) {
				return file;
			};
	});
	suite('installGaia, getPid and installSvoperapps', function() {
		var profileFolder = 'testProfileFolder';
		var remotePath = 'testRemotePath';

		test('installGaia without indexedDbFile', function () {
			mockUtils.getFile = function() {
				var args = Array.prototype.slice.call(arguments);
				var path = args.join('/');
				var indexDbFileExists = (path === profileFolder + '/indexedDB');
				return {
					exists: function() {
						return !indexDbFileExists;
					},
					isDirectory: function() {
						return !indexDbFileExists;
					},
					path: profileFolder + '/indexedDB'
				};
			};
			var result = app.installGaia(profileFolder, remotePath);

			assert.deepEqual(
				{	adb: ['shell rm -r '+ remotePath +'/webapps',
     						'shell rm /data/local/user.js',
     						'push ' + profileFolder + '/webapps ' + remotePath + '/webapps',
     						'push ' + profileFolder + '/user.js /data/local/user.js'],
     			sh: []
     		}, mockUtils.hasRunCommands
     	);
		});

		test('installGaia with indexedDbFile', function () {
			mockUtils.getFile = function() {
				var args = Array.prototype.slice.call(arguments);
				var path = args.join('/');
				var indexDbFileExists = (path === profileFolder + '/indexedDB');
				return {
					exists: function() {
						return indexDbFileExists;
					},
					isDirectory: function() {
						return indexDbFileExists;
					},
					path: profileFolder + '/indexedDB'
				};
			};
			var result = app.installGaia(profileFolder, remotePath);
			assert.deepEqual(
				{	adb: ['shell rm -r '+ remotePath +'/webapps',
     						'shell rm /data/local/user.js',
     						'push ' + profileFolder + '/webapps ' + remotePath + '/webapps',
     						'push ' + profileFolder + '/user.js /data/local/user.js',
     						'push ' + profileFolder + '/indexedDB /data/local/indexedDB'],
     			sh: []
     		}, mockUtils.hasRunCommands
     	);
		});

		test('getPid', function () {
			var tempFileName = 'tmpFile';
			var appName = 'testApp';
			var gaiaDir = 'testGaia';
			var appID = '999';
			
			mockUtils.getFile = function(path) {
				if (path === gaiaDir + '/' + tempFileName) {
					var result = {};
					result[appName] = { PID: appID };
					return result;
				}
			};

			var result = app.getPid(appName, gaiaDir);
			assert.deepEqual(
				{	adb: [],
     			sh: [ '-c rm ' + tempFileName,
     						'-c adb shell b2g-ps > ' + tempFileName,
     						'-c rm ' + tempFileName]
     		}, mockUtils.hasRunCommands
     	);
			assert.equal(result, appID);
		});

		test('installSvoperapps', function() {
			app.installSvoperapps(profileFolder);
			assert.deepEqual({
				adb: [
					'shell rm -r /data/local/svoperapps',
     			'push ' + profileFolder + '/svoperapps /data/local/svoperapps' ],
  			sh: [] }, mockUtils.hasRunCommands);
		});
	});

	suite('execute', function() {
		var options;
		var appID;
		setup(function() {
			options = {
				GAIA_DIR: 'testGaia',
				PROFILE_DIR: 'testProfileFolder',
				GAIA_INSTALL_PARENT: '/system/b2g',
				GAIA_DOMAIN: 'testDomain'
			};
			appID = '999';
			mockUtils.getFile = function() {
				var args = Array.prototype.slice.call(arguments);
				var path = args.join('/');
				var profileExists = (path === options.PROFILE_DIR);
				return {
					exists: function() {
						return profileExists;
					},
					isDirectory: function() {
						return profileExists;
					},
					path: options.PROFILE_DIR
				};
			};
			mockUtils.readZipManifest = function() {
				return {
					name: options.BUILD_APP_NAME
				};
			};
		});

		test('execute, test it without assigning app name', function () {
			options.BUILD_APP_NAME = '*';
			app.execute(options);
			assert.deepEqual({
				adb: [
					'start-server',
		      'shell stop b2g',
		      'shell rm -r /cache/*',
		      'shell rm -r ' +
		      	options.GAIA_INSTALL_PARENT + '/webapps',
		      'shell rm /data/local/user.js',
		      'push ' + options.PROFILE_DIR + '/webapps ' +
		      	options.GAIA_INSTALL_PARENT + '/webapps',
		      'push ' + options.PROFILE_DIR + '/user.js /data/local/user.js',
		      'shell start b2g' ],
			  sh: [] }, mockUtils.hasRunCommands);
		});

		test('execute, test it with testApp as an app name', function () {
			options.BUILD_APP_NAME = 'testApp';
			mockUtils.psParser = function() {
				var pidMap = {};
				pidMap[options.BUILD_APP_NAME] = {
					PID: appID
				}
				return pidMap;
			};
			app.execute(options);
			assert.deepEqual({
			  adb: [
			  	'start-server',
			    'shell rm -r /cache/*',
			    'push ' + options.PROFILE_DIR + '/webapps/' +
			    	options.BUILD_APP_NAME + '.' + options.GAIA_DOMAIN +
			    	'/manifest.webapp ' + options.GAIA_INSTALL_PARENT +
			    	'/webapps/' + options.BUILD_APP_NAME + '.' +
			    	options.GAIA_DOMAIN + '/manifest.webapp',
			    'push ' + options.PROFILE_DIR + '/webapps/' +
			    	options.BUILD_APP_NAME + '.' + options.GAIA_DOMAIN +
			    	'/application.zip ' + options.GAIA_INSTALL_PARENT +
			    	'/webapps/' + options.BUILD_APP_NAME + '.' +
			    	options.GAIA_DOMAIN + '/application.zip',
			    'shell kill ' +  appID],
			  sh: [
			  	'-c rm tmpFile',
			    '-c adb shell b2g-ps > tmpFile',
			    '-c rm tmpFile' ]},
			  mockUtils.hasRunCommands);
		});
	});
});
