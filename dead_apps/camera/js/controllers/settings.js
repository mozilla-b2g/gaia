define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var formatRecorderProfiles = require('lib/format-recorder-profiles');
var formatPictureSizes = require('lib/format-picture-sizes');
var debug = require('debug')('controller:settings');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new SettingsController(app); };
module.exports.SettingsController = SettingsController;

/**
 * Initialize a new `SettingsController`
 *
 * @constructor
 * @param {App} app
 */
function SettingsController(app) {
  bindAll(this);
  this.app = app;
  this.require = app.require;
  this.settings = app.settings;
  this.activity = app.activity;
  this.notification = app.views.notification;

  // Provide test hooks
  this.nav = app.nav || navigator;
  this.SettingsView = app.SettingsView;
  this.formatPictureSizes = app.formatPictureSizes || formatPictureSizes;
  this.formatRecorderProfiles = app.formatRecorderProfiles ||
    formatRecorderProfiles;

  this.configure();
  this.bindEvents();
  debug('initialized');
}

/**
 * Registers settings 'aliases' that provide
 * a single interface for settings such as
 * `flashModes` where we have `flashModesPicture`
 * and `flashModesVideo`.
 *
 * This means that we can just use settings.flashModes,
 * and be confident that it will interface with the
 * correct setting depending on the value of `mode`.
 *
 * You can always use the underlying settings
 * directly if you need that kind of control.
 */
SettingsController.prototype.configure = function() {
  this.setupRecorderProfilesAlias();
  this.setupPictureSizesAlias();
  this.setupFlashModesAlias();
};

/**
 * Creates a SettingAlias that dynamically
 * interfaces with the correct recorder
 * profile Setting based on which camera
 * ('front'/'back') is selected.
 *
 * @private
 */
SettingsController.prototype.setupRecorderProfilesAlias = function() {
  var settings = this.settings;
  this.settings.alias({
    key: 'recorderProfiles',
    settings: {
      back: this.settings.recorderProfilesBack,
      front: this.settings.recorderProfilesFront
    },
    get: function() {
      var camera = settings.cameras.selected('key');
      return this.settings[camera];
    }
  });
};

/**
 * Creates a SettingAlias that dynamically
 * interfaces with the correct picture
 * size Setting based on which camera
 * ('front'/'back') is selected.
 *
 * @private
 */
SettingsController.prototype.setupPictureSizesAlias = function() {
  var settings = this.settings;
  this.settings.alias({
    key: 'pictureSizes',
    settings: {
      back: this.settings.pictureSizesBack,
      front: this.settings.pictureSizesFront
    },
    get: function() {
      var camera = settings.cameras.selected('key');
      return this.settings[camera];
    }
  });
};

/**
 * Creates a SettingAlias that dynamically
 * interfaces with the correct flash-modes
 * Setting based on which mode ('picture'/
 * 'video') is selected.
 *
 * @private
 */
SettingsController.prototype.setupFlashModesAlias = function() {
  var settings = this.settings;
  this.settings.alias({
    key: 'flashModes',
    settings: {
      picture: this.settings.flashModesPicture,
      video: this.settings.flashModesVideo
    },
    get: function() {
      var mode = settings.mode.selected('key');
      return this.settings[mode];
    }
  });
};

/**
 * Bind to app events.
 *
 * @private
 */
SettingsController.prototype.bindEvents = function() {
  this.app.on('localized', this.formatPictureSizeTitles);
  this.app.on('settings:toggle', this.toggleSettings);
  this.app.on('camera:newcamera', this.onNewCamera);
  this.app.on('activity:pick', this.onPickActivity);
};

/**
 * Toggle the settings menu open/closed.
 *
 * @private
 */
SettingsController.prototype.toggleSettings = function() {
  if (this.view) { this.closeSettings(); }
  else { this.openSettings(); }
};

/**
 * Render and display the settings menu.
 *
 * We use settings.menu() to retrieve
 * and ordered list of settings that
 * have a `menu` property.
 *
 * @private
 */
SettingsController.prototype.openSettings = function() {
  debug('open settings');
  var self = this;
  this.app.emit('busy', 'lazyLoading');
  this.require(['views/settings'], function(SettingsView) {
    self.app.emit('ready');

    if (!self.SettingsView) {
      self.SettingsView = SettingsView;
    }
    if (self.view) { return; }

    var items = self.menuItems();
    self.view = new self.SettingsView({ items: items })
      .render()
      .appendTo(self.app.el)
      .on('click:close', self.closeSettings)
      .on('click:option', self.onOptionTap);

    // Make sure the view is
    // hidden before fading in
    self.view.hide();
    self.view.fadeIn();

    self.app.emit('settings:opened');
    debug('settings opened');
  });
};

/**
 * Destroy the settings menu.
 *
 * @private
 */
SettingsController.prototype.closeSettings = function(done) {
  debug('close settings');
  if (!this.view) { return; }
  var self = this;
  this.view.fadeOut(function() {
    self.view.destroy();
    self.view = null;
    self.app.emit('settings:closed');
    debug('settings closed');
    if (typeof done === 'function') { done(); }
  });
};

/**
 * Selects the option that was
 * clicked on the setting.
 *
 * @param  {String} key
 * @param  {Setting} setting
 * @private
 */
SettingsController.prototype.onOptionTap = function(key, setting) {
  var flashMode = this.settings.flashModesPicture.selected('key');
  var ishdrOn = setting.key === 'hdr' && key === 'on';
  var flashDeactivated = flashMode !== 'off' && ishdrOn;
  var self = this;

  self.closeSettings(function() {
    setting.select(key);
    self.notify(setting, flashDeactivated);
  });
};

/**
 * Adjusts settings to meet requirements
 * on new pick activity.
 *
 * @param  {Object} data
 * @private
 */
SettingsController.prototype.onPickActivity = function(data) {
  debug('pick activity', data);

  var setting;
  var options;
  var updated = false;
  var maxFileSize = data.maxFileSizeBytes;
  var maxPixelSize = data.maxPixelSize;

  // Settings changes made in 'pick'
  // sessions shouldn't persist.
  this.settings.dontSave();

  if (maxPixelSize) {
    setting = this.settings.pictureSizes;
    var lastMaxPixelSize = setting.get('maxPixelSize');

    this.settings.pictureSizesFront.set('maxPixelSize', maxPixelSize);
    this.settings.pictureSizesBack.set('maxPixelSize', maxPixelSize);
    debug('set maxPixelSize: %s', maxPixelSize);

    if (lastMaxPixelSize !== maxPixelSize) {
      options = setting.get('options');
      var restricted = [];
      if (options && options.length > 0) {
        options.forEach(function(option) {
          if (option.pixelSize <= maxPixelSize) {
            restricted.push(option);
          }
        });
        setting.resetOptions(restricted);
        updated = true;
      }
    }
  }

  if (maxFileSize) {
    setting = this.settings.recorderProfiles;
    var lastMaxFileSize = setting.get('maxFileSizeBytes');

    this.settings.recorderProfilesFront.set('maxFileSizeBytes', maxFileSize);
    this.settings.recorderProfilesBack.set('maxFileSizeBytes', maxFileSize);
    debug('set maxFileSize: %s', maxFileSize);

    if (lastMaxFileSize !== maxFileSize) {
      options = setting.get('options');
      if (options && options.length > 1) {
        setting.resetOptions([options[options.length - 1]]);
        updated = true;
      }
    }
  }

  // If the size restrictions come in after the camera was brought
  // up, then we must retrigger a configuration event
  if (updated) {
    this.app.emit('settings:configured');
  }
};

/**
 * Display a notifcation showing the
 * current state of the given setting.
 *
 * If `notification` is `false in config
 * for a setting then we don't show one.
 *
 * @param  {Setting} setting
 * @private
 */
SettingsController.prototype.notify = function(setting, flashDeactivated) {
  var dontNotify = setting.get('notifications') === false;
  if (dontNotify) { return; }

  var localizable = setting.get('optionsLocalizable') !== false;
  var title = '<span data-l10n-id="' + setting.get('title') + '"></span>';
  var html;

  // Localize option title only if not specified in the config
  var optionTitle = localizable ?
    '<span data-l10n-id="' + setting.selected('title') + '"></span>' :
    '<span>' + setting.selected('title') + '</span>';

  // Check if the `flashMode` setting is going to be deactivated as part
  // of the change in the `hdr` setting and display a specialized
  // notification if that is the case
  if (flashDeactivated) {
    html = title + ' ' + optionTitle + '<br/>' +
      '<span data-l10n-id="flash-deactivated"></span>';
  } else {
    html = title + '<br/>' + optionTitle;
  }

  this.notification.display({ text: { html: html }});
};

/**
 * When the hardware capabilities change
 * we update the available options for
 * each setting to match what is available.
 *
 * The rest of the app should listen for
 * the 'settings:configured' event as an
 * indication to update UI etc.
 *
 * @param  {Object} capabilities
 */
SettingsController.prototype.onNewCamera = function(camera) {
  debug('new capabilities');
  var capabilities = camera.capabilities;

  this.settings.hdr.filterOptions(capabilities.hdr);
  this.settings.flashModesPicture.filterOptions(capabilities.flashModes);
  this.settings.flashModesVideo.filterOptions(capabilities.flashModes);

  this.configurePictureSizes(camera);
  this.configureRecorderProfiles(camera);

  // Let the rest of the app know we're good to go.
  this.app.emit('settings:configured');
  debug('settings configured to new capabilities');
};

/**
 * Formats the raw pictureSizes into
 * a format that Setting class can
 * work with, then resets the pictureSize
 * options.
 *
 * @param  {Array} sizes
 */
SettingsController.prototype.configurePictureSizes = function(camera) {
  debug('configuring picture sizes');
  var maxPixelSize = window.CONFIG_MAX_IMAGE_PIXEL_SIZE;
  var sizes = camera.capabilities.pictureSizes;
  var setting = this.settings.pictureSizes;
  var currentSize = camera.pictureSize;
  var currentSizeKey = currentSize.width + 'x' + currentSize.height;
  var options = {
    exclude: setting.get('exclude'),
    include: setting.get('include'),
    maxPixelSize: maxPixelSize
  };

  var formatted = this.formatPictureSizes(sizes, options);
  setting.resetOptions(formatted);

  // If the setting has no stored default
  // set the setting to match the current
  // mozCamera setting.
  if (!setting.current().fetched) {
    setting.select(currentSizeKey, { silent: true });
  }

  this.formatPictureSizeTitles();

  debug('configured pictureSizes', setting.selected('key'));
};

/**
 * Formats the raw recorderProfiles
 * into a format that Setting class can
 * work with, then resets the recorderProfile
 * options.
 *
 * @param  {Array} sizes
 */
SettingsController.prototype.configureRecorderProfiles = function(camera) {
  var sizes = camera.capabilities.recorderProfiles;
  var currentProfile = camera.recorderProfile;
  var setting = this.settings.recorderProfiles;
  var maxFileSize = setting.get('maxFileSizeBytes');
  var exclude = setting.get('exclude');
  var options = { exclude: exclude };
  var items = this.formatRecorderProfiles(sizes, options);

  // If a file size limit has been imposed,
  // pick the lowest-res (last) profile only.
  if (maxFileSize) { items = [items[items.length - 1]]; }

  setting.resetOptions(items);

  // Set the recorder profile to match
  // the currently selected mozCamera profile
  if (!maxFileSize && !setting.current().fetched) {
    setting.select(currentProfile, { silent: true });
  }
};

/**
 * Creates a localized `title` property
 * on each pictureSize option. This is
 * used within the settings-menu.
 *
 * This is run each time `configurePictureSizes`
 * is run and each time the app recieves a
 * 'localized' event.
 *
 * If the app isn't 'localized' yet, we don't do
 * anything and wait for the 'localized'
 * event binding to run the function.
 *
 * @private
 */
SettingsController.prototype.formatPictureSizeTitles = function() {
  return document.l10n.formatValue('mp').then((value) => {
    var options = this.settings.pictureSizes.get('options');
    options.forEach(function(size) {
      var data = size.data;
      var mp = data.mp ? data.mp + value + ' ' : '';
      size.title = mp + size.key;
    });

    debug('picture size titles formatted');
  });
};

/**
 * Returns a list of settings
 * based on the `settingsMenu`
 * configuration.
 *
 * @return {Array}
 */
SettingsController.prototype.menuItems = function() {
  var items = this.settings.settingsMenu.get('items');
  return items.filter(this.validMenuItem, this)
    .map(function(item) { return this.settings[item.key]; }, this);
};

/**
 * Tests if the passed `settingsMenu`
 * item is allowed in the settings menu.
 *
 * @param  {Object} item
 * @return {Boolean}
 */
SettingsController.prototype.validMenuItem = function(item) {
  var setting = this.settings[item.key];
  return !!setting && setting.supported();
};

});
