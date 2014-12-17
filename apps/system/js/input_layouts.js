/* global KeyboardHelper */

'use strict';

(function(exports) {

  /**
   * InputLayouts is responsible for processing and bookkeeping layouts returned
   * from KeyboardHelper for use by KeyboardManager.
   */
  var InputLayouts = function(keyboardManager, TYPE_GROUP_MAPPING) {
    this._keyboardManager = keyboardManager;

    // a mapping table from a group to an array of types mapped to the group.
    // i.e. the reverse mapping of TYPE_GROUP_MAPPING
    this._groupToTypeTable = {};

    /**
     *
     * The set of installed keyboard layouts grouped by type_group
     *                                                  (as in KeyboardManager)
     * This is a map from type_group to an object arrays.
     *
     * i.e:
     * {
     *   text: [ {...}, {...} ],
     *   number: [ {...}, {...} ]
     * }
     *
     * Each element in the arrays represents a keyboard layout:
     * {
     *    id: the unique id of the keyboard, the key of inputs
     *    name: the keyboard layout's name
     *    appName: the keyboard app name
     *    manifestURL: the keyboard's manifestURL
     *    path: the keyboard's launch path
     * }
     * Additionally, each array has an |activeLayout|, which is the index, in
     * that array, of the the currently-activated layout of the group.
     */
    this.layouts = {};

    /*
     * This is the reverse mapping from layout (manifestURL+id) to
     * an array of {group: , index: }, indicating the groups that are supported
     * by the layout.
     * |index| is the index of the layout in the |group| in |this.layouts|.
     */
    this._layoutToGroupMapping = {};

    // A Set() of enabled KB apps
    this._enabledApps = null;

    Object.keys(TYPE_GROUP_MAPPING).forEach(function(type) {
      var group = TYPE_GROUP_MAPPING[type];
      this._groupToTypeTable[group] = this._groupToTypeTable[group] || [];
      this._groupToTypeTable[group].push(type);
    }, this);

    this._currentActiveLayouts = {};

    this._promise = null;
  };

  InputLayouts.prototype.start = function il_start() {
    this._getSettings();
  };

  InputLayouts.prototype.stop = function il_stop() {
    this._promise = null;
  };

  InputLayouts.prototype.SETTINGS_KEY_CURRENT_ACTIVE =
    'keyboard.current-active-layouts';

  InputLayouts.prototype._transformLayout =
    function il_transformLayout(layout) {
    var transformedLayout = {
      id: layout.layoutId,
      origin: layout.app.origin,
      manifestURL: layout.app.manifestURL,
      path: layout.inputManifest.launch_path
    };

    // tiny helper - bound to the manifests
    var getName = function () {
      return this.name;
    };

    // define properties for name that resolve at display time
    // to the correct language via the ManifestHelper
    Object.defineProperties(transformedLayout, {
      name: {
        get: getName.bind(layout.inputManifest),
        enumerable: true
      },
      appName: {
        get: getName.bind(layout.manifest),
        enumerable: true
      }
    });

    return transformedLayout;
  };

  InputLayouts.prototype._insertLayouts =
    function il_insertLayouts(appLayouts) {

    appLayouts.forEach(function (layout) {
      this._enabledApps.add(layout.app.manifestURL);

      layout.inputManifest.types.filter(KeyboardHelper.isKeyboardType)
        .forEach(function(group) {
          this.layouts[group] = this.layouts[group] || [];
          this.layouts[group].push(this._transformLayout(layout));
        }, this);
    }, this);
  };

  InputLayouts.prototype._insertFallbackLayouts =
    function il_insertFallbackLayouts() {
    // bug 1035117:
    // at this moment, if the 'fallback' groups (managed by KeyboardHelper)
    // doesn't have any layouts, inject the fallback layout into it.
    // (for example, user enables only CJKV IMEs, and for 'password'
    //  we need to enable 'en')
    Object.keys(KeyboardHelper.fallbackLayouts).filter(
      // linter fails if I use "group" instead of "grp" here
      grp => !(grp in this.layouts)
    ).forEach(function (group) {
      var layout = KeyboardHelper.fallbackLayouts[group];

      this._enabledApps.add(layout.app.manifestURL);

      this.layouts[group] = [this._transformLayout(layout)];
    }, this);
  };

  InputLayouts.prototype._emitLayoutsCount = function il_emitLayoutsCount() {
    // Let chrome know about how many keyboards we have
    // need to expose all input type from groupToTypeTable
    var countLayouts = {};
    Object.keys(this.layouts).forEach(function(group) {
      var types = this._groupToTypeTable[group];

      types.forEach(function(type) {
        countLayouts[type] = this.layouts[group].length;
      }, this);
    }, this);

    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      type: 'inputmethod-update-layouts',
      layouts: countLayouts
    });
    window.dispatchEvent(event);
  };

  InputLayouts.prototype._generateToGroupMapping =
    function il_generateToGroupMapping() {
    Object.keys(this.layouts).forEach( group => {
      this.layouts[group].forEach((layout, index) => {
        var key = layout.manifestURL + '/' + layout.id;
        this._layoutToGroupMapping[key] = this._layoutToGroupMapping[key] || [];
        this._layoutToGroupMapping[key].push({
          group: group,
          index: index
        });
      });
    });
  };

  InputLayouts.prototype.processLayouts =
    function il_processLayouts(appLayouts) {
    this.layouts = {};
    this._enabledApps = new Set();

    this._insertLayouts(appLayouts);
    this._insertFallbackLayouts();

    this._generateToGroupMapping();

    // some initialization
    for (var group in this.layouts) {
      this.layouts[group].activeLayout = undefined;
    }

    this._emitLayoutsCount();

    return this._enabledApps;
  };

  // We only care about currentActiveLayout for now
  InputLayouts.prototype._getSettings = function il_getSettings() {
    if (!navigator.mozSettings) {
      throw 'InputLayouts: No mozSettings?';
    }

    if (!this._promise) {
      this._promise =
        navigator.mozSettings.createLock().get(this.SETTINGS_KEY_CURRENT_ACTIVE)
          .then(result => {
            var value = result[this.SETTINGS_KEY_CURRENT_ACTIVE];
            if (value) {
              this._currentActiveLayouts = value;
            }

            return this._currentActiveLayouts;
          }).catch(e => {
            this._promise = null;
            throw e;
          });
    }

    return this._promise;
  };

  // Return the Promise that would resolve to the active layout index of the
  // group, as indicated by settings
  InputLayouts.prototype.getGroupCurrentActiveLayoutIndexAsync =
  function il_getGroupCurrentActiveLayoutIndexAsync(group) {
    return this._getSettings().then(currentActiveLayouts => {
      var currentActiveLayout = currentActiveLayouts[group];
      var currentActiveLayoutIdx;

      if (currentActiveLayout && this.layouts[group]) {
        this.layouts[group].every((layout, index) => {
          if (layout.manifestURL === currentActiveLayout.manifestURL &&
              layout.id === currentActiveLayout.id) {
            // If so, default to that, saving the users choice
            currentActiveLayoutIdx = index;
            return false;
          }
          return true;
        });
      }

      return currentActiveLayoutIdx;
    });
  };

  // Set the active layout index for the groups supported by the layout,
  // to the bookkeeping variables and into the settings
  InputLayouts.prototype.saveGroupsCurrentActiveLayout =
  function il_saveGroupsCurrentActiveLayout(layout) {
    var supportedGroups = [];

    this._layoutToGroupMapping[layout.manifestURL + '/' + layout.id].forEach(
      groupInfo => {
        this.layouts[groupInfo.group].activeLayout = groupInfo.index;

        supportedGroups.push(groupInfo.group);
      });

    supportedGroups.forEach(group => {
      var curr = this._currentActiveLayouts[group];
      if (curr && curr.id === layout.id &&
          curr.manifestURL === layout.manifestURL) {
        return;
      }

      this._currentActiveLayouts[group] = {
        id: layout.id,
        manifestURL: layout.manifestURL
      };
    });

    var toSet = {};
    toSet[this.SETTINGS_KEY_CURRENT_ACTIVE] = this._currentActiveLayouts;
    var req = navigator.mozSettings.createLock().set(toSet);
    req.onerror =
      () => console.error('Error while seaving currentActiveLayout', req.error);
  };

  exports.InputLayouts = InputLayouts;

})(window);
