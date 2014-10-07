'use strict';

// Some files may require SettingsListener to be defined at the
// point of inclusion. Tests for those files can include this file
// first to install the MockSettingsListener right away, rather than
// having to wait for the suiteSetup, which is where the MocksHelper
// usually installs the mock objects. The uninstall function below is
// intended to be called from the test's suiteTeardown to reverse
// the effects of including this file.
// Note that you should include the mock_settings_listener file before
// including this file.

function MockSettingsListener_Install() {
  if (!window['MockSettingsListener']) {
    throw new Error('MockSettingsListener has not been loaded');
  }
  window['realSettingsListener'] = window['SettingsListener'];
  window['SettingsListener'] = window['MockSettingsListener'];
}

function MockSettingsListener_Uninstall() {
  window['SettingsListener'] = window['realSettingsListener'];
}

MockSettingsListener_Install();
