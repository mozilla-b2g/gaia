/* global _, CostControl, Common, Formatting */
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
      localizedAppName;

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
      els.dataUsedThisMonth =
        els.usage.querySelector('p[data-l10n-id="data-used-this-month"]');
      els.allowMobileDataUse =
        els.view.querySelector('input[data-option="allowMobileDataUse"]');
      els.allowMobileDataUseInfo =
        els.view.querySelector('p[data-l10n-id="allow-mobile-data-use-info"]');

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

      els.allowMobileDataUse.addEventListener('change', function(evt) {
        if (els.allowMobileDataUse.checked) {
          console.log('navigator.mozApps.enableMobileData()');
          navigator.mozApps.enableMobileData(app);
        } else {
          console.log('navigator.mozApps.disableMobileData()');
          navigator.mozApps.disableMobileData(app);
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

    // 
    // TODO: Get status of allowMobileDataUse
    //

    // Localize app name
    localizedAppName = Common.getLocalizedAppName(app);

    // Update the localized app name throughout the view
    els.headerHeading.textContent = localizedAppName;
    els.allowMobileDataUseInfo.textContent =
      _('allow-mobile-data-use-info', {
        'localized-app-name': localizedAppName
      });
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
      els.dataUsedThisMonth.textContent =
        _('data-used-this-month', {
          'amount': formattedMobileDataTotal
        });

      // Fade in usage element
      els.usage.classList.add('in');
    });
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
