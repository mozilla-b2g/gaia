'use strict';
/* global ActionMenu, Applications, ManifestHelper */

(function(exports) {

  /**
   * Handles relaying of information for web activities.
   * Contains code to display the list of valid activities,
   * and fires an event off when the user selects one.
   * @class Activities
   */
  function Activities() {
    window.addEventListener('mozChromeEvent', this);
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
      if (choices.length === 1) {
        this.choose('0');
      } else {
        // Since the mozChromeEvent could be triggered by a 'click', and gecko
        // event are synchronous make sure to exit the event loop before
        // showing the list.
        setTimeout((function nextTick() {
          // Bug 852785: force the keyboard to close before the activity menu
          // shows
          window.dispatchEvent(new CustomEvent('activitymenuwillopen'));

          var activityName = navigator.mozL10n.get('activity-' + detail.name);
          ActionMenu.open(this._listItems(choices), activityName,
                           this.choose.bind(this), this.cancel.bind(this));
        }).bind(this));
      }
    },

   /**
    * The user chooses an activity from the activity menu.
    * @memberof Activities.prototype
    * @param {Number} choice The activity choice.
    */
    choose: function(choice) {
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
      var returnedChoice = {
        id: this._id,
        type: 'activity-choice',
        value: -1
      };

      this._sendEvent(returnedChoice);
      delete this._id;
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
        var app = Applications.getByManifestURL(choice.manifest);
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
