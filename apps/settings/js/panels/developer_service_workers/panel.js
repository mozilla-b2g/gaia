/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Used to show Device/Service Workers panel
 */

define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var DeveloperServiceWorkers =
    require('panels/developer_service_workers/developer_service_workers');

  return function ctor_developer_service_workers_panel() {
    var developerServiceWorkers= DeveloperServiceWorkers();

    return SettingsPanel({
      onInit: function(panel) {
        var elements = {
          serviceWorkersListSection:
            panel.querySelector('#service-workers-list-section'),
          serviceWorkersList: panel.querySelector('#service-workers-list'),
          serviceWorkersEmptySection:
            panel.querySelector('#service-workers-empty-section')
        };
        developerServiceWorkers.init(elements);
      }
    });
  };
});
