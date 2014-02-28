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
  get activityMultiPickNumber() {
    if (!this._currentActivity ||
      !this._currentActivity.source.data.multipick) {
      return 0;
    }
    return this._currentActivity.source.data.multipick;
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
        if (this.activityMultiPickNumber === 0) {
          Contacts.navigation.home();
        } else {
          this.MultiSelectContact();
        }
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
        '/contacts/js/utilities/import_from_vcard.js',
        '/contacts/js/utilities/overlay.js'
      ], function loaded() {
        utils.importFromVcard(activity.source.data.blob, function imported(id) {
          if (id) {
            activity.source.data.params = {id: id};
          }
          self.launch_activity(activity, 'view-contact-details');
        });
      });
    } else {
      this._currentActivity.postError('wrong parameters');
      this._currentActivity = null;
    }
  },

  dataPickHandler: function ah_dataPickHandler(theContact, cb) {
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
        if (cb) {
          cb(null);
          break;
        }
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
        if (ActivityHandler.activityMultiPickNumber === 0) {
          this.postPickSuccess(result);
        } else {
          cb(result);
        }
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
          if (ActivityHandler.activityMultiPickNumber === 0) {
            this.postPickSuccess(result);
          } else {
            cb(result);
          }
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
  },

  getMultipleContacts: function getMultipleContacts(theContacts, cb) {
    var self = this;
    if (theContacts == null || theContacts.length == 0) {
      return;
    }
    var cList = contacts.List;
    contacts = [];
    var totalSelectedContact = theContacts.length;
    var curCount = 0;
    theContacts.forEach(function onContact(ct) {
      var id = ct.split('/');// id[0] = contact ID,
         //id[1] = type [tel or email], id[2] = index in tel or email.
      var dupContact = {};
      cList.getContactById(id[0], function onSuccess(contact) {
        dupContact.name = contact.name;
        if (id[1] === 'tel') {
          dupContact.tel = [{type: [contact.tel[id[2]].type],
            value: contact.tel[id[2]].value}];
        } else {
          dupContact.email = [{type: [contact.email[id[2]].type],
            value: contact.email[id[2]].value}];
        }
        self.dataPickHandler(dupContact, function returnContact(res) {
          if (res) {
            contacts.push(res);
            curCount++;
            if (curCount === totalSelectedContact) {
              if (cb) {
                cb(contacts);
              }
            }
          } else {
            console.log('Null empty contact');
          }
        });
      });
    });
  },

  requireOverlay: function requireOverlay(callback) {
    Contacts.utility('Overlay', callback);
  },

  MultiSelectContact: function MultiSelectContact() {
    var self = this;
    var cList = contacts.List;
    Contacts.view('search', function() {
      contacts.List.selectFromList(_('SelectedTxt', {n: 0}),
        function onSelectedContacts(promise) {
          promise.onsuccess = function onSuccess(ids) {
            self.requireOverlay(function onOverlay() {
              utils.overlay.show(_('preparing-contacts'), 'spinner');
              self.getMultipleContacts(ids, function onContactsReady(res) {
                cList.exitSelectMode();
                utils.overlay.hide();
                if (res) {
                  self.postPickSuccess(res);
                } else {
                  self.postCancel();
                }
              });
            });
          };
          promise.onerror = function onError() {
            contacts.List.exitSelectMode();
            utils.overlay.hide();
            console.log('In MultiSelectContact error');
            self.postCancel();
          };
        },
        null,
        Contacts.navigation,
        'popup'
      );
    });
  }
};
