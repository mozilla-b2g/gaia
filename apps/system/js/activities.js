'use strict';
/* global ActionMenu, applications, ManifestHelper */

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
    this.actionMenu = null;
  }

  Activities.prototype = {
    /** @lends Activities */

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
      }
    },

   /**
    * Displays the activity menu if needed.
    * If there is only one option, the activity is automatically launched.
    * @memberof Activities.prototype
    * @param {Object} detail The activity choose event detail.
    */
    chooseActivity: function(detail) {
      this._id = detail.id;
      var choices = detail.choices;
      this.publish('activityrequesting');
      if (choices.length === 1) {
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
        if (detail.name === 'view') {
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

          var activityNameL10nId = 'activity-' + detail.name;
          if (!this.actionMenu) {
            this.actionMenu = new ActionMenu(this._listItems(choices),
              activityNameL10nId, this.choose.bind(this),
              this.cancel.bind(this));
            this.actionMenu.start();
          }
        }).bind(this));
      }
    },

   /**
    * The user chooses an activity from the activity menu.
    * @memberof Activities.prototype
    * @param {Number} choice The activity choice.
    */
    choose: function(choice) {
      this.actionMenu = null;

      var returnedChoice = {
        id: this._id,
        type: 'activity-choice',
        value: choice
      };

      this._sendEvent(returnedChoice);
      delete this._id;
    },

   /**
    * Cancels from the activity menu.
    * @memberof Activities.prototype
    */
    cancel: function() {
      this.actionMenu = null;

      var returnedChoice = {
        id: this._id,
        type: 'activity-choice',
        value: -1
      };

      this._sendEvent(returnedChoice);
      delete this._id;
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
          value: index
        });
      });

      return items;
    }
  };

  exports.Activities = Activities;

}(window));
