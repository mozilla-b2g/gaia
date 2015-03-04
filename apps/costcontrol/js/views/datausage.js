/* global debug, ConfigManager, CostControl, Formatting,
          SimManager, Common, ChartUtils */
/* jshint -W120 */

/*
 * The data usage tab is in charge of usage charts of mobile and wi-fi networks.
 *
 * It has several canvas areas layered one above the others.
 */
'use strict';
var DataUsageTab = (function() {

  var graphicArea, graphicPattern;
  var backgroundLayer, wifiLayer, mobileLayer, axisLayer, todayLayer,
      warningLayer, limitsLayer;
  var wifiOverview, mobileOverview;
  var wifiToggle, mobileToggle;
  var appList, noData;

  var costcontrol, initialized, model;

  function setupTab() {
    if (initialized) {
      return;
    }

    CostControl.getInstance(function _onCostControl(instance) {
      costcontrol = instance;

      // HTML entities
      graphicArea = document.getElementById('graphic-area');
      graphicPattern = document.getElementById('graphic-pattern');
      backgroundLayer = document.getElementById('background-layer');
      wifiLayer = document.getElementById('wifi-layer');
      mobileLayer = document.getElementById('mobile-layer');
      axisLayer = document.getElementById('axis-layer');
      todayLayer = document.getElementById('today-layer');
      warningLayer = document.getElementById('warning-layer');
      limitsLayer = document.getElementById('limits-layer');
      wifiOverview = document.getElementById('wifiOverview');
      mobileOverview = document.getElementById('mobileOverview');
      wifiToggle = document.getElementById('wifiCheck');
      mobileToggle = document.getElementById('mobileCheck');
      appList = document.getElementById('app-usage-list');
      noData = document.getElementById('app-usage-no-data');

      window.addEventListener('localized', localize);

      // Update and chart visibility
      document.addEventListener('visibilitychange', updateWhenVisible);
      wifiToggle.addEventListener('click', toggleWifi);
      mobileToggle.addEventListener('click', toggleMobile);

      // Setup the model
      SimManager.requestDataSimIcc(function(dataSimIcc) {
        ConfigManager.requestSettings(dataSimIcc.iccId,
                                      function _onSettings(settings) {
          debug('First time setup for model');
          model = {
            height: ChartUtils.toDevicePixels(graphicArea.clientHeight),
            width: ChartUtils.toDevicePixels(graphicArea.clientWidth),
            originX: Math.floor(
              ChartUtils.toDevicePixels(graphicArea.clientWidth) * 0.15),
            endX: Math.floor(
              ChartUtils.toDevicePixels(graphicArea.clientWidth) * 0.95),
            axis: {
              Y: {
                lower: 0,
                margin: 0.20
              },
              X: {
                lower: ChartUtils.calculateLowerDate(settings),
                upper: ChartUtils.calculateUpperDate(settings)
              }
            },
            limits: {
              enabled: settings.dataLimit,
              value: ChartUtils.getLimitInBytes(settings),
              dataLimitValue: settings.dataLimitValue,
              dataLimitUnit: settings.dataLimitUnit
            },
            data: {
              wifi: {
                enabled: true
              },
              mobile: {
                enabled: true
              }
            },
            todayLabel: {}
          };
          ChartUtils.expandModel(model);
          resetButtonState(settings);

          ConfigManager.observe('dataLimit', toggleDataLimit, true);
          ConfigManager.observe('dataLimitValue', setDataLimit, true);
          ConfigManager.observe('lastCompleteDataReset', updateDataUsage, true);
          ConfigManager.observe('lastDataReset', updateDataUsage, true);
          ConfigManager.observe('nextReset', changeNextReset, true);

          function finishInit() {
            initialized = true;
            updateDataUsage();
          }

          Common.loadApps()
            .then(finishInit)
            .catch(function(reason) {
              debug(reason);
              finishInit();
            });
        });
      });
    });
  }

  function localize() {
    if (initialized) {
      ChartUtils.drawTodayLayer(todayLayer, model);
      ChartUtils.drawAxisLayer(axisLayer, model, mobileToggle.checked);
      ChartUtils.drawLimits(limitsLayer, model, mobileToggle.checked);
    }
  }

  function finalize() {
    if (!initialized) {
      return;
    }

    document.removeEventListener('visibilitychange', updateWhenVisible);
    wifiToggle.removeEventListener('click', toggleWifi);
    mobileToggle.removeEventListener('click', toggleMobile);
    ConfigManager.removeObserver('dataLimit', toggleDataLimit);
    ConfigManager.removeObserver('dataLimitValue', setDataLimit);
    ConfigManager.removeObserver('lastCompleteDataReset', updateDataUsage);
    ConfigManager.removeObserver('lastDataReset', updateDataUsage);
    ConfigManager.removeObserver('nextReset', changeNextReset);

    initialized = false;
  }

  function resetButtonState(settings) {
    var isMobileChartVisible = settings.isMobileChartVisible;
    if (typeof isMobileChartVisible === 'undefined') {
      isMobileChartVisible = true;
    }
    if (isMobileChartVisible !== mobileToggle.checked) {
      mobileToggle.checked = isMobileChartVisible;
      toggleMobile();
    }

    var isWifiChartVisible = settings.isWifiChartVisible;
    if (typeof isWifiChartVisible === 'undefined') {
      isWifiChartVisible = false;
    }
    if (isWifiChartVisible !== wifiToggle.checked) {
      wifiToggle.checked = isWifiChartVisible;
      toggleWifi();
    }
  }

  // UPDATES

  // On visibility change
  function updateWhenVisible(evt) {
    if (!document.hidden) {
      updateDataUsage();
    }
  }

  function requestDataUsage(perApp) {
    return new Promise(function(resolve) {
      SimManager.requestDataSimIcc(function(dataSimIcc) {
        ConfigManager.requestSettings(dataSimIcc.iccId,
                                      function _onSettings(settings) {

          var request = { type: 'datausage' };
          if (perApp) {
            request.apps = Common.allApps.map(function(app) {
              return app.manifestURL;
            });
          }

          costcontrol.request(request, resolve);
        });
      });
    });
  }

  function maybeRequestPerAppUsage() {
    if (!model) {
      return;
    }

    if (!model.data.mobile.total) {
      noData.hidden = false;
      appList.hidden = true;
      // Repeated here to not rely on the deferred `updateApps()` call which
      // would add an annoying delay until clearing the data.
      clearAppList();

    } else {
      noData.hidden = true;
      appList.hidden = false;

      // Bug 1064491: request per-app data usage on the next tick of
      // the main loop to avoid performance regression in startup
      setTimeout(function() {
        requestDataUsage(true).then(updateApps);
      }, 0);
    }
  }

  function updateCharts(result) {
    return new Promise(function(resolve, reject) {
      if (result.status === 'success') {
        SimManager.requestDataSimIcc(function(dataSimIcc) {
          ConfigManager.requestSettings(dataSimIcc.iccId,
                                        function _onSettings(settings) {
            var modelData = result.data;
            model.data.wifi.samples = modelData.wifi.samples;
            model.data.wifi.total = modelData.wifi.total;

            model.data.mobile.samples = modelData.mobile.samples;
            model.data.mobile.total = modelData.mobile.total;

            model.limits.enabled = settings.dataLimit;
            model.limits.value = ChartUtils.getLimitInBytes(settings);
            model.limits.dataLimitValue = settings.dataLimitValue;
            model.axis.X.upper = ChartUtils.calculateUpperDate(settings);
            model.axis.X.lower = ChartUtils.calculateLowerDate(settings);
            ChartUtils.expandModel(model);
            resolve();

            debug('Rendering');
            drawCharts();
          });
        });
      } else {
        reject(new Error(
          'Error requesting data usage. This should not happen.'));
      }
    });
  }

  function updateApps(result) {
    if (result.status === 'success') {
      model.data.wifi.apps = result.data.wifi.apps;
      model.data.mobile.apps = result.data.mobile.apps;
      drawApps(model);
    }
  }

  // OBSERVERS

  function toggleDataLimit(value) {
    model.limits.enabled = value;
    ChartUtils.drawBackgroundLayer(backgroundLayer, model,
      mobileToggle.checked);
    ChartUtils.drawAxisLayer(axisLayer, model, mobileToggle.checked);
    ChartUtils.drawLimits(limitsLayer, model, mobileToggle.checked);
    ChartUtils.drawWarningLayer(warningLayer, model);
  }

  function setDataLimit(value, old, key, settings) {
    model.limits.value = ChartUtils.getLimitInBytes(settings);
    model.limits.dataLimitValue = settings.dataLimitValue;
    ChartUtils.expandModel(model);
    drawCharts();
  }

  function updateDataUsage() {
    requestDataUsage()
      .then(updateCharts)
      .then(maybeRequestPerAppUsage);
  }

  function changeNextReset(value, old, key, settings) {
    model.axis.X.upper = ChartUtils.calculateUpperDate(settings);
    model.axis.X.lower = ChartUtils.calculateLowerDate(settings);
    ChartUtils.expandModel(model);
    drawCharts();
  }

  // USER INTERFACE

  // On tapping on wifi toggle
  function toggleWifi() {
    var isChecked = wifiToggle.checked;
    wifiLayer.hidden = !isChecked;
    // save wifi toggled state
    ConfigManager.setOption({ isWifiChartVisible: isChecked });

    if (model) {
      drawApps(model);
    }
  }

  // On tapping on mobile toggle
  function toggleMobile() {
    var isChecked = mobileToggle.checked;
    mobileLayer.hidden = !isChecked;
    warningLayer.hidden = !isChecked;
    limitsLayer.hidden = !isChecked;
    // save wifi toggled state
    ConfigManager.setOption({ isMobileChartVisible: isChecked });

    if (model) {
      ChartUtils.drawBackgroundLayer(backgroundLayer, model, isChecked);
      ChartUtils.drawAxisLayer(axisLayer, model, isChecked);
      ChartUtils.drawLimits(limitsLayer, model, isChecked);
      drawApps(model);
    }
  }

  function drawCharts() {
    // Update overview
    var wifiData = Formatting.roundData(model.data.wifi.total);
    var mobileData = Formatting.roundData(model.data.mobile.total);
    wifiOverview.textContent = Formatting.formatData(wifiData);
    mobileOverview.textContent = Formatting.formatData(mobileData);

    // Render the charts
    ChartUtils.drawBackgroundLayer(backgroundLayer, model,
      mobileToggle.checked);
    ChartUtils.drawTodayLayer(todayLayer, model);
    ChartUtils.drawAxisLayer(axisLayer, model, mobileToggle.checked);
    ChartUtils.drawDataLayer(wifiLayer, model, 'wifi', {
      stroke: ChartUtils.WIFI_CHART_STROKE,
      fill: ChartUtils.WIFI_CHART_FILL
    });
    ChartUtils.drawDataLayer(mobileLayer, model, 'mobile', {
      stroke: ChartUtils.MOBILE_CHART_STROKE,
      fill: ChartUtils.MOBILE_CHART_FILL,
      pattern: graphicPattern
    });
    ChartUtils.drawWarningLayer(warningLayer, model);
    ChartUtils.drawLimits(limitsLayer, model, mobileToggle.checked);
    drawApps(model);
  }

  var cachedAppItems = {};
  function drawApps(model) {

    function createAppItem(app) {
      var isSystem = app.manifestURL === Common.SYSTEM_MANIFEST;
      var appElement = document.createElement('li');
      appElement.className = 'app-item';

      var linkElement = document.createElement('a');
      if (!isSystem) {
        linkElement.href = '##appdetail-view?manifestURL=' + app.manifestURL;
      }
      appElement.appendChild(linkElement);

      var imgElement = document.createElement('img');
      imgElement.className = 'app-image';
      imgElement.src = Common.getAppIcon(app);
      imgElement.setAttribute('role', 'presentation');
      imgElement.onerror = function() {
        console.warn('Unable to load icon: ' + this.src);
        this.src = '/style/images/app/icons/default.png';
      };
      linkElement.appendChild(imgElement);

      var appInfoElement = document.createElement('div');
      appInfoElement.className = 'app-info';
      linkElement.appendChild(appInfoElement);

      var nameElement = document.createElement('div');
      nameElement.className = 'app-info-row app-name';
      nameElement.textContent = Common.getLocalizedAppName(app);
      appInfoElement.appendChild(nameElement);

      var barElement = document.createElement('div');
      barElement.className = 'app-info-row app-usage-bar';
      barElement.setAttribute('role', 'presentation');
      appInfoElement.appendChild(barElement);

      var usedBarElement = document.createElement('div');
      usedBarElement.className = 'app-usage-bar-used';
      usedBarElement.setAttribute('role', 'presentation');
      barElement.appendChild(usedBarElement);

      var usageElement = document.createElement('div');
      usageElement.className = 'app-info-row app-usage-total';
      appInfoElement.appendChild(usageElement);

      return appElement;
    }

    function updateAppItemUsage(appItem, total) {
      var usedBarElement =
        appItem.getElementsByClassName('app-usage-bar-used')[0];
      var totalElement =
        appItem.getElementsByClassName('app-usage-total')[0];

      var barTotal = mobileTotal;
      if (model.limits.enabled && model.limits.value !== null) {
        barTotal = Math.max(barTotal, model.limits.value);
      }

      var usedPercent = (total / barTotal) * 100;
      usedBarElement.style.width = usedPercent + '%';
      totalElement.textContent = '' + Formatting.formatData(
        Formatting.roundData(total));
    }

    // Front-end workaround for Bug 1083680: Noticeable difference between by
    // application breakdown totals and the total displayed in chart and widget.
    // This method adds the residual traffic (the traffic that cannot be not
    // allocated to an app) to the System application.
    function fixResidualTraffic() {
      var breakdownTotal = 0;
      mobileApps[Common.SYSTEM_MANIFEST] = {total: 0};
      if (manifests.length > 0) {
        breakdownTotal =
          manifests.reduce(function(accumulatedTraffic, appManifest) {
            return accumulatedTraffic + mobileApps[appManifest].total;
          }, 0);
      }
      var residualTraffic = mobileTotal - breakdownTotal;
      // System traffic is the residual traffic
      if (residualTraffic > 0) {
        mobileApps[Common.SYSTEM_MANIFEST].total = residualTraffic;
        if (!manifests[Common.SYSTEM_MANIFEST]) {
          manifests.push(Common.SYSTEM_MANIFEST);
        }
      }
    }

    clearAppList();

    var mobileTotal = model.data.mobile.total;
    var mobileApps = model.data.mobile.apps;
    if (!mobileApps) {
      return;
    }

    // Filter out apps that have not used any data yet.
    var manifests = Object.keys(mobileApps).filter(function(key) {
      return mobileApps[key].total > 0;
    });

    // Note: The second premise (mobileTotal === 0) must be removed when the
    // fixResidualTraffic method will be eliminated.
    if (manifests.length === 0 && mobileTotal === 0) {
      return;
    }

    fixResidualTraffic();

    // Sort by total data usage, descending
    manifests.sort(function(a, b) {
      return mobileApps[b].total - mobileApps[a].total;
    });

    var fragment = document.createDocumentFragment();
    manifests.forEach(function(manifestURL) {
      var app = Common.allApps.find(function(app) {
        return app.manifestURL === manifestURL;
      });

      if (!app) {
        debug('No app with manifest URL: ' + manifestURL);
        return;
      }

      var appTotal = mobileApps[manifestURL].total;
      var appItem = cachedAppItems[manifestURL];
      if (!appItem) {
        appItem = cachedAppItems[manifestURL] = createAppItem(app);
      }

      updateAppItemUsage(appItem, appTotal);
      fragment.appendChild(appItem);
    });

    appList.appendChild(fragment);
  }

  function clearAppList() {
    appList.innerHTML = '';
  }

  return {
    initialize: setupTab,
    finalize: finalize
  };
}());

DataUsageTab.initialize();
