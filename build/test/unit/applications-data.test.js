var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils =
	require('./mock_utils.js');
var mockWebappManifests =
	require('./mock_webapp_manifests.js');

suite('applications-data', function() {
	suite('customizeHomescreen', function() {
		var config;
		var app;
		setup(function() {
			app = proxyquire.noCallThru().load(
							'../../applications-data', {
								'./utils': mockUtils,
								'./webapp-manifests': mockWebappManifests
							});
			config = {
				search_page: {
					enabled: true
				},
				tap_threshold: 111,
				tap_effect_delay: 122,
				move_collection_threshold: 133,
				swipe: {
					threshold: 1,
					friction: 3,
					transition_duration: 4
				},
				homescreens: [[]],
				bookmarks: 'test'
			};
			mockUtils.getDistributionFileContent = function() {
				return JSON.stringify(config);
			};
		});

		test('normal', function () {
			var options = {
				GAIA_DISTRIBUTION_DIR: 'TESTGAIADIR',
				ROCKETBAR: 1
			};
			var result = app.customizeHomescreen(options);
			assert.deepEqual(result, {
				search_page: {
					provider: 'EverythingME',
					debug: false,
	      	separate_page: false,
			    enabled: config.search_page.enabled
			  },
			  tap_threshold: config.tap_threshold,
			  tap_effect_delay: config.tap_effect_delay,
			  move_collection_threshold: config.move_collection_threshold,
			  swipe: {
			    threshold: config.swipe.threshold,
			    friction: config.swipe.friction,
			    transition_duration: config.swipe.transition_duration
			  },
			  prediction: {
		      enabled: true,
		      lookahead: 16  // 60fps = 16ms per frame
		    },
		    grid: [[]],
		    bookmarks: 'test'
			});
		});

		test('Not PRODUCTION', function() {
			var options = {
				GAIA_DISTRIBUTION_DIR: 'TESTGAIADIR',
				PRODUCTION: '1',
				ROCKETBAR: 0
			};
			var result = app.customizeHomescreen(options);
			assert.deepEqual(result, {
				search_page: {
					provider: 'EverythingME',
					debug: false,
	      	separate_page: false,
			    enabled: config.search_page.enabled
			  },
			  tap_threshold: config.tap_threshold,
			  tap_effect_delay: config.tap_effect_delay,
			  move_collection_threshold: config.move_collection_threshold,
			  swipe: {
			    threshold: config.swipe.threshold,
			    friction: config.swipe.friction,
			    transition_duration: config.swipe.transition_duration
			  },
			  prediction: {
		      enabled: true,
		      lookahead: 16  // 60fps = 16ms per frame
		    },
		    grid: [[]]
			});
		});
	});
});
