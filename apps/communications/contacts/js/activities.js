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

  launch_activity: function ah_launch(action) {
    if (this._launchedAsInlineActivity)
      return;

    this._currentActivity = activity;
    var hash = action
    if (this._currentActivity.source.data.params) {
      var param, params = [];
      for (var i in this._currentActivity.source.data.params) {
        param = this._currentActivity.source.data.params[i];
        params.push(i + '=' + param);
      }
      hash += '?' + params.join('&');
      document.location.hash = hash;
    }
  },
  handle: function ah_handle(activity) {
    switch (activity.source.name) {
      case 'new':
        this.launch_activity('view-contact-form');
        break;

      case 'update':
        this.launch_activity('add-parameters');
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
