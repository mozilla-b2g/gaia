'use strict';
/* global ActionMenu, applications, ManifestHelper, DefaultActivityHelper */

(function(exports) {

  /**
   * Handles relaying of information for web activities.
   * Contains code to display the list of valid activities,
   * and fires an event off when the user selects one.
   * @class Activities
   */
  function Activities() {
    window.addEventListener('mozChromeEvent', this);
    window.addEventListener('appopened', this);
    window.addEventListener('applicationinstall', this);
    this.actionMenu = null;
  }

  Activities.prototype = {
    /** @lends Activities */

    /**
     * Remove all event listeners. This is mainly used in unit tests.
     */
    destroy: function() {
      window.removeEventListener('mozChromeEvent', this);
      window.removeEventListener('appopened', this);
      window.removeEventListener('applicationinstall', this);
    },

    /**
    * General event handler interface.
    * Updates the overlay with as we receive load events.
    * @memberof Activities.prototype
    * @param {DOMEvent} evt The event.
    */
    handleEvent: function(evt) {
      switch (evt.type) {
        case 'mozChromeEvent':
          var detail = evt.detail;
          switch (detail.type) {
            case 'activity-choice':
              this.chooseActivity(detail);
              break;
          }
          break;
        case 'appopened':
          if (this.actionMenu) {
            this.actionMenu.hide();
            this.actionMenu = null;
          }
          break;
        case 'applicationinstall':
          this._onNewAppInstalled(evt.detail.application);
          break;
      }
    },

    _onNewAppInstalled: function(app) {
      var activities = app && app.manifest && app.manifest.activities;
      if (!activities) {
        return;
      }

      Object.keys(activities).forEach(function(activity) {
        var filters = activities[activity].filters;

        // Type can be single value, array, or a definition object (with value)
        var type = filters && filters.type && filters.type.value ||
                   filters && filters.type;

        if (!type) {
          return;
        }

        if (typeof type === 'string') {
          // single value, change to Array
          type = type.split(',');
        }

        // Now that it's an array, we check all the elements
        type.forEach((diff) => {
          DefaultActivityHelper.getDefaultAction(activity, diff)
            .then((defApp) => {
              // If default launch app is set for the type
              if (defApp) {
                // Delete the current default app
                DefaultActivityHelper.setDefaultAction(activity, diff, null);
              }
          });
        });
      });
    },

    /**
     * This gets the index from the defaultChoice in the choices
     * list.
     * @param  {Object} defaultChoice The default choice
     * @return {Integer}              The index where the default
     *                                choice is located. -1 if it
     *                                is not found
     */
    _choiceFromDefaultAction: function(defaultChoiceManifest, detail) {
      var index = -1;
      if (defaultChoiceManifest) {
        index = detail.choices.findIndex(function(choice) {
          return choice.manifest.indexOf(defaultChoiceManifest) !== -1;
        });
      }

      return index;
    },

   /**
    * Displays the activity menu if needed.
    * If there is only one option, the activity is automatically launched.
    * @memberof Activities.prototype
    * @param {Object} detail The activity choose event detail.
    */
    chooseActivity: function(detail) {
      var name = detail && detail.name;
      var type = detail && detail.activityType;
      this._detail = detail;
      this.publish('activityrequesting');

      DefaultActivityHelper.getDefaultAction(name, type).then(
        this._gotDefaultAction.bind(this));
    },

    _gotDefaultAction: function(defaultChoice) {
      var choices = this._detail.choices;
      var index = this._choiceFromDefaultAction(defaultChoice, this._detail);
      if (index > -1) {
        this.choose(index);
      } else if (choices.length === 1) {
        this.choose('0');
      } else {
        //
        // Our OMA Forward Lock DRM implementation relies on a "view"
        // activity to invoke the "fl" app when the user clicks on a
        // link to content with a mime type of
        // "application/vnd.oma.dd+xml" or "application/vnd.oma.drm.message".
        //
        // In order for this to be secure, we need to ensure that the
        // FL app is the only one that can respond to view activity
        // requests for those particular mime types. Here in the System app
        // we don't know what the type associated with an activity request is
        // but we do know the name of the activity. So if this is an activity
        // choice for a "view" activity, and the FL app is one of the choices
        // then we must select the FL app without allowing the user to choose
        // any of the others.
        //
        // If we wanted to be more general here we could perhaps
        // modify this code to allow any certified app to handle the
        // activity, but it is much simpler to restrict to the FL app
        // only.
        //
        if (this._detail.name === 'view') {
          var flAppIndex = choices.findIndex(function(choice) {
            var matchingRegex =
              /^(http|https|app)\:\/\/fl\.gaiamobile\.org\//;
            return matchingRegex.test(choice.manifest);
          });
          if (flAppIndex !== -1) {
            this.choose(flAppIndex.toString(10)); // choose() requires a string
            return;
          }
        }

        // Since the mozChromeEvent could be triggered by a 'click', and gecko
        // event are synchronous make sure to exit the event loop before
        // showing the list.
        setTimeout((function nextTick() {
          // Bug 852785: force the keyboard to close before the activity menu
          // shows
          window.dispatchEvent(new CustomEvent('activitymenuwillopen'));

          var name = this._detail.name;
          var type = this._detail.activityType;
          var config = DefaultActivityHelper.getDefaultConfig(name, type);

          var activityNameL10nId;
          if (config) {
            activityNameL10nId = config.l10nId;
          } else {
            activityNameL10nId = 'activity-' + this._detail.name;
          }

          if (!this.actionMenu) {
            this.actionMenu = new ActionMenu(this._listItems(choices),
              activityNameL10nId, this.choose.bind(this),
              this.cancel.bind(this), null, config !== undefined);
            this.actionMenu.start();
          }
        }).bind(this));
      }
    },

   /**
    * The user chooses an activity from the activity menu.
    * @memberof Activities.prototype
    * @param {Number} choice The activity choice.
    * @param {Boolean} setAsDefault Should this be set as the default activity.
    */
    choose: function(choice, setAsDefault) {
      this.actionMenu = null;

      var returnedChoice = {
        id: this._detail.id,
        type: 'activity-choice',
        value: choice,
        setAsDefault: setAsDefault
      };
      var name = this._detail.name;
      var type = this._detail.activityType;

      if (setAsDefault) {
        DefaultActivityHelper.setDefaultAction(name, type,
          this._detail.choices[choice].manifest);
      }

      this._sendEvent(returnedChoice);
      delete this._detail;
    },

   /**
    * Cancels from the activity menu.
    * @memberof Activities.prototype
    */
    cancel: function() {
      this.actionMenu = null;

      var returnedChoice = {
        id: this._detail.id,
        type: 'activity-choice',
        value: -1
      };

      this._sendEvent(returnedChoice);
      delete this._detail;
    },

    publish: function(eventName) {
      var event = new CustomEvent(eventName);
      window.dispatchEvent(event);
    },

    /**
     * Sends an event to the platform when a user makes a choice
     * or cancels the activity menu.
     * @memberof Activities.prototype
     * @param {Number} value The index of the selected activity.
     */
    _sendEvent: function(value) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true, value);
      window.dispatchEvent(event);
    },

    /**
     * Formats and returns a list of activity choices.
     * @memberof Activities.prototype
     * @param {Array} choices The list of activity choices.
     * @return {Array}
     */
    _listItems: function(choices) {
      var items = [];

      choices.forEach(function(choice, index) {
        var app = applications.getByManifestURL(choice.manifest);
        if (!app) {
          return;
        }

        items.push({
          label: new ManifestHelper(app.manifest).name,
          icon: choice.icon,
          manifest: choice.manifest,
          value: index
        });
      });

      return items;
    }
  };

  exports.Activities = Activities;

}(window));
