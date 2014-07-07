/* globals _, ConfirmDialog, Contacts, LazyLoader, utils, ActionMenu */
/* exported ActivityHandler */

'use strict';

var ActivityHandler = {
  _currentActivity: null,

  _launchedAsInlineActivity: (window.location.search == '?pick'),

  get currentlyHandling() {
    return !!this._currentActivity;
  },

  get activityName() {
    if (!this._currentActivity) {
      return null;
    }

    return this._currentActivity.source.name;
  },

  get activityDataType() {
    if (!this._currentActivity) {
      return null;
    }

    return this._currentActivity.source.data.type;
  },

  get activityData() {
    if (!this._currentActivity) {
      return null;
    }

    return this._currentActivity.source.data;
  },

  /* checks first if we are handling an activity, then if it is
   * of the same type of any of the items from the list provided.
   * @param list Array with types of activities to be checked
   */
  currentActivityIs: function(list) {
    return this.currentlyHandling && list.indexOf(this.activityName) !== -1;
  },

  /* checks first if we are handling an activity, then checks that
   * it is NOT of the same type of any of the items from the list provided.
   * @param list Array with types of activities to be checked
   */
  currentActivityIsNot: function(list) {
    return this.currentlyHandling && list.indexOf(this.activityName) === -1;
  },

  launch_activity: function ah_launch(activity, action) {
    if (this._launchedAsInlineActivity) {
      return;
    }

    this._currentActivity = activity;
    Contacts.checkCancelableActivity();

    var hash = action;
    var param, params = [];
    if (activity.source &&
        activity.source.data &&
        activity.source.data.params) {
      var originalParams = activity.source.data.params;
      for (var i in originalParams) {
        param = originalParams[i];
        params.push(i + '=' + param);
      }
      hash += '?' + params.join('&');
    }
    document.location.hash = hash;
  },

  handle: function ah_handle(activity) {

    switch (activity.source.name) {
      case 'new':
        this.launch_activity(activity, 'view-contact-form');
        break;
      case 'open':
        this.launch_activity(activity, 'view-contact-details');
        break;
      case 'update':
        this.launch_activity(activity, 'add-parameters');
        break;
      case 'pick':
        if (!this._launchedAsInlineActivity) {
          return;
        }
        this._currentActivity = activity;
        Contacts.navigation.home();
        break;
      case 'import':
        this.importContactsFromFile(activity);
        break;
    }

  },

  importContactsFromFile: function ah_importContactFromVcard(activity) {
    var self = this;
    if (activity.source &&
        activity.source.data &&
        activity.source.data.blob) {
      LazyLoader.load([
        document.querySelector('#loading-overlay'),
        '/shared/js/contacts/import/utilities/import_from_vcard.js',
        '/shared/js/contacts/import/utilities/overlay.js'
      ], function loaded() {
        Contacts.loadFacebook(function() {
          utils.importFromVcard(activity.source.data.blob,
            function imported(numberOfContacts, id) {
              if (numberOfContacts === 1) {
                activity.source.data.params = {id: id};
                self.launch_activity(activity, 'view-contact-details');
              } else {
                self.launch_activity(activity, 'view-contact-list');
              }
            }
          );
        });
      });
    } else {
      this._currentActivity.postError('wrong parameters');
      this._currentActivity = null;
    }
  },

  dataPickHandler: function ah_dataPickHandler(theContact) {
    var type, dataSet, noDataStr;
    var result = {};
    // Keeping compatibility with previous implementation. If
    // we want to get the full contact, just pass the parameter
    // 'fullContact' equal true.
    if (this.activityDataType === 'webcontacts/contact' &&
        this.activityData.fullContact === true) {
      result = utils.misc.toMozContact(theContact);
      this.postPickSuccess(result);
      return;
    }

    switch (this.activityDataType) {
      case 'webcontacts/tel':
        type = 'contact';
        dataSet = theContact.tel;
        noDataStr = _('no_contact_phones');
        break;
      case 'webcontacts/contact':
        type = 'number';
        dataSet = theContact.tel;
        noDataStr = _('no_contact_phones');
        break;
      case 'webcontacts/email':
        type = 'email';
        dataSet = theContact.email;
        noDataStr = _('no_contact_email');
        break;
    }
    var hasData = dataSet && dataSet.length;
    var numOfData = hasData ? dataSet.length : 0;

    
    result.name = theContact.name;
    switch (numOfData) {
      case 0:
        // If no required type of data
        var dismiss = {
          title: _('ok'),
          callback: function() {
            ConfirmDialog.hide();
          }
        };
        Contacts.confirmDialog(null, noDataStr, dismiss);
        break;
      case 1:
        // if one required type of data
        if (this.activityDataType == 'webcontacts/tel') {
          result = utils.misc.toMozContact(theContact);
        } else {
          result[type] = dataSet[0].value;
        }

        this.postPickSuccess(result);
        break;
      default:
        // if more than one required type of data
        var self = this;
        LazyLoader.load('/contacts/js/action_menu.js', function() {
          var prompt1 = new ActionMenu();
          var itemData;
          var capture = function(itemData) {
            return function() {
              if (self.activityDataType == 'webcontacts/tel') {
                // filter phone from data.tel to take out the rest
                result = utils.misc.toMozContact(theContact);
                result.tel = self.filterDestinationForActivity(
                               itemData, result.tel);
              } else {
                result[type] = itemData;
              }
              prompt1.hide();
              self.postPickSuccess(result);
            };
          };
          for (var i = 0; i < dataSet.length; i++) {
            itemData = dataSet[i].value;
            var carrier = dataSet[i].carrier || '';
            prompt1.addToList(
              _('pick_destination', {destination: itemData, carrier: carrier}),
              capture(itemData)
            );
          }
          prompt1.show();
        });
    } // switch
  },

  filterDestinationForActivity:
  function ah_filterDestinationForActivity(itemData, dataSet) {
    return dataSet.filter(function isSamePhone(item) {
      return item.value == itemData;
    });
  },

  postNewSuccess: function ah_postNewSuccess(contact) {
    this._currentActivity.postResult({ contact: contact });
    this._currentActivity = null;
  },

  postPickSuccess: function ah_postPickSuccess(result) {
    this._currentActivity.postResult(result);
    this._currentActivity = null;
  },

  postCancel: function ah_postCancel() {
    this._currentActivity.postError('canceled');
    this._currentActivity = null;
  }
};
