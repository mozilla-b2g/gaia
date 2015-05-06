/* global _, debug, CostControl, Common, Formatting, ChartUtils,
          SimManager, ConfigManager */
/* jshint -W120 */

/**
 * The App Detail view is in charge of usage charts and settings for an
 * individual app.
 */
'use strict';
var AppDetailView = (function() {
  var costcontrol,
      initialized,
      els,
      app,
      localizedAppName,
      model;

  function initialize() {
    if (initialized) {
      return;
    }

    els = {};

    CostControl.getInstance(function(instance) {
      costcontrol = instance;

      // Get elements
      els.view = document.getElementById('appdetail-view');
      els.header = els.view.querySelector('gaia-header');
      els.headerHeading = els.header.querySelector('h1');
      els.usage = els.view.querySelector('.usage');
      els.graphicArea = els.usage.querySelector('#app-graphic-area');
      els.backgroundLayer =
        els.graphicArea.querySelector('#app-background-layer');
      els.wifiLayer = els.graphicArea.querySelector('#app-wifi-layer');
      els.mobileLayer = els.graphicArea.querySelector('#app-mobile-layer');
      els.axisLayer = els.graphicArea.querySelector('#app-axis-layer');
      els.todayLayer = els.graphicArea.querySelector('#app-today-layer');
      els.warningLayer = els.graphicArea.querySelector('#app-warning-layer');
      els.limitsLayer = els.graphicArea.querySelector('#app-limits-layer');
      els.graphicPattern =
        els.graphicArea.querySelector('#app-graphic-pattern');
      els.dataUsedSince =
        els.usage.querySelector('p[data-l10n-id="data-used-since"]');
      els.dataUsedThisWeek =
        els.usage.querySelector('p[data-l10n-id="data-used-this-week"]');
      els.dataUsedThisMonth =
        els.usage.querySelector('p[data-l10n-id="data-used-this-month"]');

      // Setup the model
      SimManager.requestDataSimIcc(function(dataSimIcc) {
        ConfigManager.requestSettings(dataSimIcc.iccId,
                                      function _onSettings(settings) {
          debug('First time setup for model');
          model = {
            height: ChartUtils.toDevicePixels(els.graphicArea.clientHeight),
            width: ChartUtils.toDevicePixels(els.graphicArea.clientWidth),
            originX: Math.floor(
              ChartUtils.toDevicePixels(els.graphicArea.clientWidth) * 0.15),
            endX: Math.floor(
              ChartUtils.toDevicePixels(els.graphicArea.clientWidth) * 0.95),
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
        });
      });

      // Attach event listeners
      window.addEventListener('viewchanged', function(evt) {
        if (evt.detail.id === 'appdetail-view') {
          setAppManifestURL(evt.detail.params.manifestURL);
        }
      });

      els.header.addEventListener('action', function(evt) {
        var type = evt.detail && evt.detail.type;
        if (type === 'back') {
          window.location.hash = '#';
        }
      });

      initialized = true;
    });
  }

  function setAppManifestURL(manifestURL) {
    // Get App object
    app = Common.getApp(manifestURL);

    // Update app usage data
    updateAppUsageData(app);

    // Localize app name
    localizedAppName = Common.getLocalizedAppName(app);

    // Update the localized app name throughout the view
    els.headerHeading.textContent = localizedAppName;
  }

  function updateAppUsageData(app) {
    // Hide usage element until it has been updated/localized.
    els.usage.classList.remove('in');

    var usageRequest = {
      type: 'datausage',
      apps: [app.manifestURL]
    };

    // Request usage for this specific app
    costcontrol.request(usageRequest, function(result) {
      if (result.status !== 'success') {
        console.error('Error requesting data usage. This should not happen.');
        return;
      }

      var data = result.data;

      var mobileDataTotal = data.mobile.total;
      var formattedMobileDataTotal = Formatting.formatData(
        Formatting.roundData(mobileDataTotal));

      // Localize the data usage info
      els.dataUsedSince.textContent =
        _('data-used-since', {
          'amount': formattedMobileDataTotal,
          'start-date':
            Formatting.getFormattedDate(data.start, _('long-date-format'))
        });
      els.dataUsedThisWeek.textContent =
        _('data-used-this-week', {
          'amount': formattedMobileDataTotal
        });
      els.dataUsedThisMonth.textContent =
        _('data-used-this-month', {
          'amount': formattedMobileDataTotal
        });

      els.dataUsedSince.hidden = true;
      els.dataUsedThisWeek.hidden = true;
      els.dataUsedThisMonth.hidden = true;

      // Update the charts
      prepareChartData(result, function() {

        // Render the charts
        renderChart();

        // Fade in usage element
        els.usage.classList.add('in');
      });
    });
  }

  function prepareChartData(result, callback) {
    if (result.status === 'success') {
      SimManager.requestDataSimIcc(function(dataSimIcc) {
        ConfigManager.requestSettings(dataSimIcc.iccId,
                                      function _onSettings(settings) {
          debug('Updating model');
          var modelData = result.data;
          model.data.wifi.samples = modelData.wifi.samples;
          model.data.wifi.total = modelData.wifi.total;
          model.data.wifi.apps = modelData.wifi.apps;

          model.data.mobile.samples = modelData.mobile.samples;
          model.data.mobile.total = modelData.mobile.total;
          model.data.mobile.apps = modelData.mobile.apps;

          model.limits.enabled = settings.dataLimit;
          model.limits.value = ChartUtils.getLimitInBytes(settings);
          model.limits.dataLimitValue = settings.dataLimitValue;
          model.axis.X.upper = ChartUtils.calculateUpperDate(settings);
          model.axis.X.lower = ChartUtils.calculateLowerDate(settings);
          ChartUtils.expandModel(model);

          // Show correct usage text label
          switch (settings.trackingPeriod) {
            case 'weekly':
              els.dataUsedSince.hidden = true;
              els.dataUsedThisWeek.hidden = false;
              els.dataUsedThisMonth.hidden = true;
              break;
            case 'monthly':
              els.dataUsedSince.hidden = true;
              els.dataUsedThisWeek.hidden = true;
              els.dataUsedThisMonth.hidden = false;
              break;
            default:
              els.dataUsedSince.hidden = false;
              els.dataUsedThisWeek.hidden = true;
              els.dataUsedThisMonth.hidden = true;
              break;
          }

          debug('Rendering');

          callback();
        });
      });
    } else {
      console.error('Error requesting data usage. This should not happen.');
    }
  }

  function renderChart() {
    ChartUtils.drawBackgroundLayer(els.backgroundLayer, model, true);
    ChartUtils.drawTodayLayer(els.todayLayer, model);
    ChartUtils.drawAxisLayer(els.axisLayer, model, true);
    ChartUtils.drawDataLayer(els.wifiLayer, model, 'wifi', {
      stroke: ChartUtils.WIFI_CHART_STROKE,
      fill: ChartUtils.WIFI_CHART_FILL
    });
    ChartUtils.drawDataLayer(els.mobileLayer, model, 'mobile', {
      stroke: ChartUtils.MOBILE_CHART_STROKE,
      fill: ChartUtils.MOBILE_CHART_FILL,
      pattern: els.graphicPattern
    });
    ChartUtils.drawWarningLayer(els.warningLayer, model);
    ChartUtils.drawLimits(els.limitsLayer, model, true);
  }

  function finalize() {
    if (!initialized) {
      return;
    }

    initialized = false;
  }

  return {
    initialize: initialize,
    finalize: finalize
  };
}());

AppDetailView.initialize();
