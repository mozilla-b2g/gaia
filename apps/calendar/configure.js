/* global module, require */
'use strict';
var exec = require('mz/child_process').exec;
var fs = require('mz/fs');
var rjs = require('requirejs');

module.exports = [
  {
    inputs: ['build/config.json'],
    outputs: 'js/common/presets.js',
    rule: function() {
      return fs.readFile('./build/config.json', 'utf8').then(function(data) {
        return fs.writeFile('./js/common/presets.js', 'define(' + data + ');');
      });
    }
  },

  {
    inputs: ['build/calendar.build.js', 'js/**/*.js'],
    outputs: [
      'js/bundle.js',
      'js/caldav_worker.js',
      'js/lazy_loaded.js',
      'js/ext/caldav.js',
      'js/ext/ical.js'
    ],
    rule: function() {
      var configFile = './build/calendar.build.js';
      return fs.readFile(configFile, 'utf8').then(function(data) {
        var config = JSON.parse(data);
        return new Promise(function(resolve) {
          rjs.optimize(config, resolve);
        });
      });
    }
  },

  {
    inputs: ['index.html'],
    outputs: [
      'shared/elements/gaia-header/dist/gaia-header.js',
      'shared/elements/gaia-icons/fonts/gaia-icons.tff',
      'shared/elements/gaia-icons/gaia-icons.css',
      'shared/elements/gaia_subheader/script.js',
      'shared/elements/gaia_subheader/style.css',
      'shared/elements/gaia_switch/images/background.png',
      'shared/elements/gaia_switch/images/background_off.png',
      'shared/elements/gaia_switch/images/background_rtl.png',
      'shared/elements/gaia_switch/script.js',
      'shared/elements/gaia_switch/style.css',
      'shared/js/component_utils.js',
      'shared/js/date_time_helper.js',
      'shared/js/l10n.js',
      'shared/js/l10n_date.js',
      'shared/locales/date/date.en-US.properties',
      'shared/style/buttons/images/forward-light.svg/index.html',
      'shared/style/buttons/index.html',
      'shared/style/confirm/images/ui/gradient.png',
      'shared/style/confirm/images/ui/pattern.png',
      'shared/style/confirm/content.html',
      'shared/style/confirm/content_details.html',
      'shared/style/confirm/index.html',
      'shared/style/confirm/long_content.html',
      'shared/style/confirm/no_title.html',
      'shared/style/icons/index.html',
      'shared/style/icons/selection.json',
      'shared/style/input_areas/clear.png',
      'shared/style/input_areas/clear_dark.png',
      'shared/style/input_areas/dialog.svg',
      'shared/style/input_areas/dialog_active.svg',
      'shared/style/input_areas/dialog_disabled.svg',
      'shared/style/input_areas/dialog_disabled_rtl.svg',
      'shared/style/input_areas/dialog_rtl.svg',
      'shared/style/input_areas/search.svg',
      'shared/style/input_areas/search_dark.svg',
      'shared/style/input_areas/index.html',
      'shared/style/progress_activity/images/ui/activity.png',
      'shared/style/progress_activity/images/ui/default.png',
      'shared/style/progress_activity/images/ui/light.png',
      'shared/style/progress_activity/index.html',
      'shared/style/status/images/ui/pattern.png',
      'shared/style/status/index.html',
      'shared/style/switches/images/check/danger.png',
      'shared/style/switches/images/check/default.png',
      'shared/style/switches/images/radio/danger.png',
      'shared/style/switches/images/radio/default.png',
      'shared/style/switches/images/switch/background.png',
      'shared/style/switches/images/switch/background_off.png',
      'shared/style/switches/images/switch/background_rtl.png',
      'shared/style/tabs/images/ui/background.png',
      'shared/style/tabs/filters.html',
      'shared/style/tabs/index.html',
      'shared/style/tabs/index_dark.html',
      'shared/style/toolbars/index.html'
    ],
    rule: function() {
      // TODO(gaye): Use jsdom to parse index.html to find the things we need
      //     to copy over from shared and then copy those.
      // TODO(gaye): Figure out from the build config which language we're
      //     building for instead of assuming en-US.
      console.log('*Placeholder for copying shared bits*');
    },
  },

  {
    inputs: ['**/*'],
    outputs: 'application.zip',
    rule: function() {
      return exec('zip application.zip *');
    }
  }
];
