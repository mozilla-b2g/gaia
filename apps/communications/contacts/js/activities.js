var ActivityHandler = {
  _currentActivity: null,

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

  handle: function ah_handle(activity) {
    switch (this.activityName) {
      case 'new':
        this._currentActivity = activity;
        document.location.hash = 'view-contact-form';
        if (this._currentActivity.source.data.params) {
          var param, params = [];
          for (var i in this._currentActivity.source.data.params) {
            param = this._currentActivity.source.data.params[i];
            params.push(i + '=' + param);
          }
          document.location.hash += '?' + params.join('&');
        }
        break;
      case 'pick':
        this._currentActivity = activity;
        Contacts.navigation.home();
        break;
    }
  },

  postNewSuccess: function ah_postNewSuccess(contact) {
    this._currentActivity.postResult({contact: contact});
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
