/**
 * The apn editor panel
 */
define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var SettingsPanel = require('modules/settings_panel');
  var SettingsCache = require('modules/settings_cache');
  var ApnSettingsManager = require('modules/apn/apn_settings_manager');
  var ApnEditor = require('panels/apn_editor/apn_editor');

  var _back = function() {
    SettingsService.navigate('apn-list');
  };

  var _getDialogService = function() {
    return new Promise(function(resolve) {
      require(['modules/dialog_service'], resolve);
    });
  };

  var _showChangeApnWarning = function() {
    return _getDialogService().then((DialogService) => {
      return DialogService.confirm('change-apn-warning-message1', {
        title: 'apnSettings',
        submitButton: {
          id: 'yes',
          style: 'recommend'
        },
        cancelButton: 'cancel'
      });
    });
  };

  var _showDeleteApnWarning = function() {
    return _getDialogService().then((DialogService) => {
      return DialogService.confirm('delete-apn-confirm', {
        title: 'confirmation',
        submitButton: {
          id: 'delete-apn',
          style: 'danger'
        },
        cancelButton: 'cancel'
      });
    });
  };

  return function ctor_apnEditorPanel() {
    var _rootElement;
    var _elements;

    var _apnEditor;
    var _editorSession;

    var _apnItem;
    var _apnType;
    var _serviceId;

    var _leftApp = false;

    return SettingsPanel({
      onInit: function ae_onInit(rootElement) {
        _rootElement = rootElement;
        _apnEditor = new ApnEditor(rootElement);
        _elements = {
          panel: rootElement.querySelector('.panel'),
          okBtn: rootElement.querySelector('button.ok'),
          deteleItem: rootElement.querySelector('.apnSettings-btns li.delete'),
          deleteBtn:
            rootElement.querySelector('.apnSettings-btns li.delete button')
        };

        _elements.okBtn.onclick = function() {
          if (!_editorSession) {
            _back();
            return;
          }

          if (_editorSession.mode === 'new') {
            _editorSession.commit().then(_back);
            _editorSession = null;
          } else if (_editorSession.mode === 'edit') {
            // Display the warning only when Data roaming is turned on and it is
            // the current APN in use that’s being edited.
            Promise.all([
              ApnSettingsManager.getActiveApnId(_serviceId, _apnType),
              new Promise((resolve) => {
                SettingsCache.getSettings(function(results) {
                  resolve(results['ril.data.roaming_enabled']);
                });
              })
            ]).then(function(results) {
              var activeApnId = results[0];
              var dataRoamingEnabled = results[1];
              if (activeApnId === _apnItem.id && dataRoamingEnabled) {
                return _showChangeApnWarning();
              }
            }).then(function(result) {
              if (result && result.type === 'submit') {
                _editorSession.commit().then(_back);
                _editorSession = null;
              }
            });
          }
        };

        _elements.deleteBtn.onclick = function() {
          _showDeleteApnWarning().then((result) => {
            if (result.type === 'submit') {
              ApnSettingsManager.removeApn(_serviceId, _apnItem.id).then(_back);
            }
          });
        };
      },
      onBeforeShow: function ae_onBeforeShow(rootElement, options) {
        // If this flag has been set, which means that users have been left
        // the app before so we should keep the original state instead of
        // refreshing it.
        if (_leftApp) {
          _leftApp = false;
          return;
        }

        var mode = options.mode || 'new';
        _apnItem = options.item || {};
        _apnType = options.type || 'default';
        _serviceId = options.serviceId;

        switch (mode) {
          case 'new':
            _elements.deteleItem.hidden = true;
            var defaultApnItem = {
              apn: {
                types: [_apnType]
              }
            };
            _editorSession = _apnEditor.createApn(_serviceId, defaultApnItem);
            break;
          case 'edit':
            _elements.deteleItem.hidden = false;
            _editorSession = _apnEditor.editApn(_serviceId, _apnItem);
            break;
        }
        _elements.panel.scrollTop = 0;
      },
      onHide: function ae_onHide() {
        _leftApp = document.hidden;
        if (!_leftApp && _editorSession) {
          _editorSession.cancel();
        }
      }
    });
  };
});
