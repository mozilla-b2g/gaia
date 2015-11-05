define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var SettingsCache = require('modules/settings_cache');

  const METRICLEVELSETTING = 'metrics.selectedMetrics.level';
  const DOGFOODSETTING = 'debug.performance_data.dogfooding';
  const SHAREDATASETTING = 'debug.performance_data.shared';
  const DEVTOOLSOVERLAY = 'devtools.overlay';

  const LEVELSMAP = {
    'Basic': 'Basic',
    'Enhanced': 'Enhanced',
    'None': 'None'
  };

  return function ctor_improveBrowserOS() {
    return SettingsPanel({
      onInit: function(panel) {
        var appUsage = panel.querySelector('#appUsageByRegion');
        var metricsBasic = panel.querySelector('#metrics-basic');
        var metricsEnhanced = panel.querySelector('#metrics-enhanced');
        var metricsNone = panel.querySelector('#metrics-none');

        appUsage.addEventListener('click', this);
        metricsBasic.addEventListener('click', this);
        metricsEnhanced.addEventListener('click', this);
        metricsNone.addEventListener('click', this);

        return new Promise((resolve) => {
          SettingsCache.getSettings((results) => {
            var metricsLevel = results[METRICLEVELSETTING];

            switch(metricsLevel) {
              case 'Basic':
                metricsBasic.checked = true;
                break;
              case 'Enhanced':
                metricsEnhanced.checked = true;
                break;
              case 'None':
                metricsNone.checked = true;
                break;
              default:
                // When upgrading from a release that has only the
                // 'share data' checkbox, use the 'sharing' status
                //  to determine the default metric level.
                if (results[SHAREDATASETTING]) {
                  metricsBasic.checked = true;
                  this._setMetricLevel('Basic');
                } else {
                  metricsNone.checked = true;
                  this._setMetricLevel('None');
                }
            }

            // Dogfooders should not be able to disable the metrics.
            if (results[DOGFOODSETTING]) {
              metricsBasic.setAttribute('disabled', 'true');
              metricsEnhanced.setAttribute('disabled', 'true');
              metricsNone.setAttribute('disabled', 'true');
            } else {
              metricsBasic.removeAttribute('disabled');
              metricsEnhanced.removeAttribute('disabled');
              metricsNone.removeAttribute('disabled');
            }
            resolve(this._setMetricLevel); // Unit testing support.
          });
        });
      },

      handleEvent: function (event) {
        switch (event.target.id) {
          case 'appUsageByRegion':
            var activity = new window.MozActivity({
              name: 'marketplace-search',
              data: {
                type: 'firefox-os-app-stats'
              }
            });
            activity.onerror = function() {
              console.log('Error opening app stats page in Marketplace');
            };
            break;

          case 'metrics-basic':
          case 'metrics-enhanced':
          case 'metrics-none':
            this._setMetricLevel(event.target.value);
            break;
        }
      },

      _setMetricLevel: function(level) {
        level = LEVELSMAP[level];
        if (level) {
          updateSetting(METRICLEVELSETTING, level);

          // If the metrics level is being set to 'enhanced', DevTools
          // must enabled. This is because the 'enhanced' metrics
          // are collected using the Developer Tools components.
          if (level === LEVELSMAP.Enhanced) {
            updateSetting(DEVTOOLSOVERLAY, true);
          } else {
            // The metrics level is being set to one that does not require
            // DevTools to be enabled; disable DevTools.
            //
            // The use case where a developer manually enables the HUD and then
            // sets the metric level to 'basic' or 'none' is not being
            // addressed; DevTools will be still disabled by this page. The
            // developer will need to manually enable the HUD.
            updateSetting(DEVTOOLSOVERLAY, false);
          }
        }

         function updateSetting(name, value) {
           var setting = {};
           setting[name] = value;
           navigator.mozSettings.createLock().set(setting);
        }
      },
    });
  };
});
