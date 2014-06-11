/* globals _, ConfirmDialog, Contacts, LazyLoader, utils, ValueSelector */
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

  launch_activity: function ah_launch(activity, action) {
    if (this._launchedAsInlineActivity) {
      return;
    }

    this._currentActivity = activity;
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
    Contacts.checkCancelableActivity();
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

    var result = {};
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
        var prompt1 = new ValueSelector();
        var data;
        for (var i = 0; i < dataSet.length; i++) {
          data = dataSet[i].value;
          var carrier = dataSet[i].carrier || '';
          prompt1.addToList(data + ' ' + carrier, data);
        }

        prompt1.onchange = (function onchange(itemData) {
          if (this.activityDataType == 'webcontacts/tel') {
            // filter phone from data.tel to take out the rest
            result = utils.misc.toMozContact(theContact);
            result.tel =
              this.filterPhoneNumberForActivity(itemData, result.tel);
          } else {
            result[type] = itemData;
          }
          prompt1.hide();
          this.postPickSuccess(result);
        }).bind(this);
        prompt1.show();
    } // switch
  },

  /*
   * We only need to return the phone number that user chose from the select
   * Hence we filter out the rest of the phones from the contact
   */
  filterPhoneNumberForActivity:
  function ah_filterPhoneNumberForActivity(itemData, dataSet) {
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
