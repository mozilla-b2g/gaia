'use strict';

define(function(require) {
  var SettingsPanel = require('modules/settings_panel');
  var DownloadsList = require('panels/downloads/downloads_list');

  return function ctor_downloads_panel() {
    var elements;
    var downloadsList = DownloadsList();

    return SettingsPanel({
      onInit: function(panel) {
        elements = {
          downloadsContainer: document.querySelector('#downloadList ul'),
          emptyDownloadsContainer:
            document.getElementById('download-list-empty'),
          downloadsPanel: document.getElementById('downloads'),
          // Menus
          downloadsEditMenu: document.getElementById('downloads-edit-menu'),
          // Buttons
          editButton: document.getElementById('downloads-edit-button'),
          editHeader: document.getElementById('downloads-edit-header'),
          deleteButton: document.getElementById('downloads-delete-button'),
          selectAllButton:
            document.getElementById('downloads-edit-select-all'),
          deselectAllButton:
            document.getElementById('downloads-edit-deselect-all')
        };
        downloadsList.init(elements);
      }
    });
  };
});
