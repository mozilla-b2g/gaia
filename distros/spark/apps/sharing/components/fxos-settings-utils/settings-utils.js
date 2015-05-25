'use strict';

/* global console */

import { Service } from 'fxos-mvc/dist/mvc';

const MOZ_SETTINGS_NOT_AVAILABLE_MSG = 'navigator.mozSettings is not available';

export class SettingsHelper {
  static get(name, defaultValue) {
    if (!name) {
      return Promise.reject('Setting name is missing');
    }

    if (!navigator.mozSettings) {
      console.warn(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
      return Promise.reject(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
    }

    return new Promise((resolve, reject) => {
      let setting = navigator.mozSettings.createLock().get(name, defaultValue);
      setting.onsuccess = () => {
        let settingValue = setting.result[name] || defaultValue;
        resolve(settingValue);
      };
      setting.onerror = () => { reject(setting.error); };
    });
  }

  static set(settings) {
    if (!settings) {
      return Promise.reject('Settings are missing');
    }

    if (!navigator.mozSettings) {
      console.warn(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
      return Promise.reject(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
    }

    return new Promise((resolve, reject) => {
      let result = navigator.mozSettings.createLock().set(settings);
      result.onsuccess = () => { resolve(result.result); };
      result.onerror = () => { reject(result.error); };
    });
  }

  static on(name, observer) {
    if (!name) {
      console.warn('Setting name is missing');
      return;
    }

    if (typeof observer !== 'function') {
      console.warn('Setting observer must be a function');
      return;
    }

    if (!navigator.mozSettings) {
      console.warn(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
      return;
    }

    navigator.mozSettings.addObserver(name, observer);
  }

  static off(name, observer) {
    if (!name) {
      console.warn('Setting name is missing');
      return;
    }

    if (typeof observer !== 'function') {
      console.warn('Setting observer must be a function');
      return;
    }

    if (!navigator.mozSettings) {
      console.warn(MOZ_SETTINGS_NOT_AVAILABLE_MSG);
      return;
    }

    navigator.mozSettings.removeObserver(name, observer);
  }
}

export class SettingsService extends Service {
  constructor({name, defaultValue, observer, trigger}) {
    super();

    let value = SettingsHelper.get(name, defaultValue).then(settingValue => {
      if (trigger && observer) { observer(settingValue); }
      return settingValue;
    }, reason => {
      console.warn('Unable to get', name, reason);
      if (trigger && observer) { observer(defaultValue); }
    });

    Object.defineProperty(this, 'name', { value: name });
    Object.defineProperty(this, 'value', {
      enumerable: true,
      get: () => { return value; },
      set: newValue => {
        let settings = {};
        settings[name] = newValue;
        SettingsHelper.set(settings).catch(
          reason => console.warn('Unable to set', name, reason));
      }
    });

    SettingsHelper.on(name, ({settingValue}) => {
      value = Promise.resolve(settingValue);
      if (observer) { observer(settingValue); }
      this._dispatchEvent('settingchange', settingValue);
    });
  }
}
