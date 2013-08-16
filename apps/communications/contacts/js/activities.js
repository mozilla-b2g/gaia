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
    if (this._launchedAsInlineActivity)
      return;

    this._currentActivity = activity;
    var hash = action;
    var param, params = [];
    if (activity.source &&
        activity.source.data && activity.source.data.params) {
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
        if (!this._launchedAsInlineActivity)
          return;

        this._currentActivity = activity;
        Contacts.navigation.home();
        break;
    }
    Contacts.checkCancelableActivity();
  },

  dataPickHandler: function ah_dataPickHandler(theContact) {
    var type, dataSet, noDataStr;

    switch (this.activityDataType) {
      case 'webcontacts/tel':
        type = 'contact';
        dataSet = theContact.tel;
        noDataStr = _('no_phones');
        break;
      case 'webcontacts/contact':
        type = 'number';
        dataSet = theContact.tel;
        noDataStr = _('no_phones');
        break;
      case 'webcontacts/email':
        type = 'email';
        dataSet = theContact.email;
        noDataStr = _('no_email');
        break;
    }
    var hasData = dataSet && dataSet.length;
    var numOfData = hasData ? dataSet.length : 0;

    var result = {};
    var data;
    result.name = theContact.name;
    switch (numOfData) {
      case 0:
        // If no required type of data
        var dismiss = {
          title: _('ok'),
          callback: ConfirmDialog.hide
        };
        ConfirmDialog.show(null, noDataStr, dismiss);
        break;
      case 1:
        // if one required type of data
        if (this.activityDataType == 'webcontacts/tel') {
          result = {};
          this.copyContactData(theContact, result);
        } else {
          data = dataSet[0].value;
          result[type] = data;
        }

        this.postPickSuccess(result);
        break;
      default:
        // if more than one required type of data
        var prompt1 = new ValueSelector();
        for (var i = 0; i < dataSet.length; i++) {
          data = dataSet[i].value;
          var carrier = dataSet[i].carrier || '';
          prompt1.addToList(data + ' ' + carrier, data);
        }

        prompt1.onchange = (function onchange(itemData) {
          if (this.activityDataType == 'webcontacts/tel') {
            // filter phone from data.tel to take out the rest
            result = {};
            this.copyContactData(theContact, result);
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
   * All the Contact properties are defined in the prototype object,
   * so we need to copy them in a proper way
   */
  copyContactData: function ah_copyContactData(source, dest) {
    for (var prop in Object.getPrototypeOf(source)) {
      dest[prop] = source[prop];
    }
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
    // XXX: the contact cannot be passed if we don't duplicate it
    var dupContact = {};
    for (var attr in contact) {
      dupContact[attr] = contact[attr];
    }

    this._currentActivity.postResult({ contact: dupContact });
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
