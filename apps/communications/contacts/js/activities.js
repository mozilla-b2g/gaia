/* globals ConfirmDialog, Contacts, LazyLoader, utils, ActionMenu,
   VCardReader */
/* exported ActivityHandler */

'use strict';

var ActivityHandler = {
  _currentActivity: null,

  _launchedAsInlineActivity: (window.location.search == '?pick'),

  mozContactParam: null,

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

  get activityContactProperties() {
    if (!this._currentActivity) {
      return null;
    }

    return this._currentActivity.source.data.contactProperties;
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
        if (this.isvCardActivity(activity)) {
          var self = this;
          var dependency =
                         '/shared/js/contacts/import/utilities/vcard_reader.js';
          LazyLoader.load(dependency, function() {
            self.getvCardReader(activity.source.data.blob,
                                           self.readvCard.bind(self, activity));
          });
        } else {
          this.launch_activity(activity, 'view-contact-details');
        }
        break;
      case 'update':
        this.launch_activity(activity, 'add-parameters');
        break;
      case 'pick':
        if (!this._launchedAsInlineActivity) {
          return;
        }
        this._currentActivity = activity;
        Contacts.checkCancelableActivity();
        Contacts.navigation.home();
        break;
      case 'import':
        this.importContactsFromFile(activity);
        break;
    }

  },

  renderOneContact: function(contact, activity) {
    this.mozContactParam = contact;
    activity.source.data.params = {'mozContactParam': true};
    this.launch_activity(activity, 'view-contact-form');
  },

  // This variable has no use once we support vCards with multiple contacts.
  renderingMultipleContacts: false,

  renderContact: function(contact, activity) {
    // We don't support importing multiple contacts from vCard activity yet.
    if (!this.renderingMultipleContacts) {
      alert(navigator.mozL10n.get('notEnabledYet'));
      this.launch_activity(activity, 'view-contact-list');
      this.renderingMultipleContacts = true;
    }
  },

  getvCardReader: function ah_getvCardReader(blob, callback) {
    var fileReader = new FileReader();
    fileReader.readAsBinaryString(blob);
    fileReader.onloadend = function() {
      var reader = new VCardReader(fileReader.result);
      if(typeof callback === 'function') {
        callback(reader);
      }
    };
  },

  readvCard: function ah_readvCard(activity, vCardReader) {
    var firstContact;
    var firstContactRendered = false;
    var self = this;
    var cursor = vCardReader.getAll();
    cursor.onsuccess = function(event) {
      var contact = event.target.result;
      // We check if there is only one contact to know what function
      // we should call. If not, we render the contacts one by one.
      if (contact) {
        if (!firstContact && !firstContactRendered) {
          firstContact = contact;
        } else if (!firstContactRendered) {
          self.renderContact(firstContact, activity);
          self.renderContact(contact, activity);
          firstContactRendered = true;
          firstContact = null;
        } else {
          self.renderContact(contact, activity);
        }
        cursor.continue();
      } else if (firstContact) {
        self.renderOneContact(firstContact, activity);
      }
    };
  },

  isvCardActivity: function ah_isvCardActivity(activity) {
    return !!(activity.source &&
              activity.source.data &&
              !activity.source.data.params &&
              activity.source.data.type === 'text/vcard' &&
              activity.source.data.blob);
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
        noDataStr = 'no_contact_phones';
        break;
      case 'webcontacts/contact':
        type = 'number';
        dataSet = theContact.tel;
        noDataStr = 'no_contact_phones';
        break;
      case 'webcontacts/email':
        type = 'email';
        dataSet = theContact.email;
        noDataStr = 'no_contact_email';
        break;
      case 'webcontacts/select':
        type = 'select';
        var data = [];
        if (this.activityContactProperties.indexOf('tel') !== -1) {
          if (theContact.tel && theContact.tel.length) {
            data = data.concat(theContact.tel);
          }
        }
        if (this.activityContactProperties.indexOf('email') !== -1) {
          if (theContact.email && theContact.email.length) {
            data = data.concat(theContact.email);
          }
        }

        dataSet = data;
        noDataStr = 'no_contact_data';
        break;
    }
    var hasData = dataSet && dataSet.length;
    var numOfData = hasData ? dataSet.length : 0;


    result.name = theContact.name;
    switch (numOfData) {
      case 0:
        // If no required type of data
        var dismiss = {
          title: 'ok',
          callback: function() {
            ConfirmDialog.hide();
          }
        };
        Contacts.confirmDialog(null, noDataStr, dismiss);
        break;
      case 1:
        // if one required type of data
        if (this.activityDataType == 'webcontacts/tel' ||
            this.activityDataType == 'webcontacts/select') {
          result = this.pickContactsResult(theContact);
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
              if (self.activityDataType == 'webcontacts/tel' ||
                  self.activityDataType == 'webcontacts/select') {
                result = self.pickContactsResult(theContact, itemData);
              } else {
                result[type] = itemData;
              }
              prompt1.hide();
              self.postPickSuccess(result);
            };
          };
          for (var i = 0, l = dataSet.length; i < l; i++) {
            itemData = dataSet[i].value;
            var carrier = dataSet[i].carrier || '';
            prompt1.addToList(
              {
                id: 'pick_destination',
                args: {destination: itemData, carrier: carrier}
              },
              capture(itemData)
            );
          }
          prompt1.show();
        });
    } // switch
  },

  pickContactsResult:
  function ah_pickContactsResult(theContact, itemData) {
    var pickResult = {};
    var contact = utils.misc.toMozContact(theContact);

    if (this.activityDataType == 'webcontacts/tel') {
      pickResult = contact;

      if (itemData) {
        pickResult.tel = this.filterDestinationForActivity(
                            itemData, pickResult.tel);
      }
    } else if (this.activityDataType == 'webcontacts/select') {
      pickResult.contact = contact;

      if (!itemData) {
        pickResult.select = pickResult.contact.tel;

        if (!pickResult.select || !pickResult.select.length) {
          pickResult.select = pickResult.contact.email;
        }
      } else {
        pickResult.select = this.filterDestinationForActivity(
                                itemData, pickResult.contact.tel);

        if (!pickResult.select || !pickResult.select.length) {
          pickResult.select = this.filterDestinationForActivity(
                                  itemData, pickResult.contact.email);
        }
      }
    }

    return pickResult;
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
