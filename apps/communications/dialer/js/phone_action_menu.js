var PhoneNumberActionMenu = (function() {

  var _initiated, _newPhoneNumber, _addContactActionMenu, _callMenuItem,
    _createNewContactMenuItem, _addToExistingContactMenuItem,
    _cancelActionMenuItem, _addContactActionTitle;

  var _formSubmit = function _formSubmit(event) {
    return false;
  };

  var _updateLatestVisit = function _updateLatestVisit() {
    window.asyncStorage.setItem('latestCallLogVisit', Date.now());
  };

  var _createNewContact = function _createNewContact() {
    launchActivity('new');
  };

  var _addToExistingContact = function _addToExistingContact() {
    launchActivity('update');
  };

  var launchActivity = function launchActivity(name) {
    var options = {
      name: name,
      data: {
        type: 'webcontacts/contact',
        params: {
          'tel': _newPhoneNumber
        }
      }
    };

    try {
      var activity = new MozActivity(options);
    } catch (e) {
      console.error('Error while creating activity');
    }
    _addContactActionMenu.classList.remove('visible');
  };

  var _call = function _call() {
    if (_newPhoneNumber) {
      _updateLatestVisit();
      CallHandler.call(_newPhoneNumber);
    }
    _addContactActionMenu.classList.remove('visible');
  };

  var _sendSms = function _sendSms() {
    if (_newPhoneNumber) {
      _updateLatestVisit();
      try {
        var activity = new MozActivity({
          name: 'new',
          data: {
            type: 'websms/sms',
            number: _newPhoneNumber
          }
        });
      } catch (e) {
        console.error('Error while creating activity: ' + e);
      }
    }
    _addContactActionMenu.classList.remove('visible');
  };

  var _cancelActionMenu = function _cancelActionMenu() {
    _addContactActionMenu.classList.remove('visible');
  };

  /*
   * @param {Array} options Possible entries are: 'call', 'new-contact',
   * 'add-to-existent'. If no options, include all possible options.
  */
  var _show = function _show(contactId, phoneNumber, options) {
    if (options) {
      for (opt in _optionToMenuItem) {
        var item = _optionToMenuItem[opt];
        if (options.indexOf(opt) >= 0) {
          item.classList.remove('hide');
        } else {
          item.classList.add('hide');
        }
      }
    } else {
      for (opt in _optionToMenuItem)
        _optionToMenuItem[opt].classList.remove('hide');
    }
    if (contactId) {
      window.location.hash = '#contacts-view';

      setTimeout(function nextTick() { /* we'll have the iframe by then */
        var contactsIframe = document.getElementById('iframe-contacts');
        var src = '/contacts/index.html';
        src += '#view-contact-details?id=' + contactId;
        src += '&tel=' + phoneNumber;
        // Enable the function of receiving the messages posted from the iframe.
        src += '&back_to_previous_tab=1';
        var timestamp = new Date().getTime();
        contactsIframe.src = src + '&timestamp=' + timestamp;
      });
    } else {
      _addContactActionTitle.textContent = phoneNumber;
      _newPhoneNumber = phoneNumber;
      _addContactActionMenu.hidden = false;
      _addContactActionMenu.classList.add('visible');
    }
  };

  var _init = function _init() {
    if (_initiated) {
      return;
    }
    _addContactActionTitle = document.querySelector(
      '#add-contact-action-title');
    _addContactActionMenu = document.getElementById('add-contact-action-menu');
    _addContactActionMenu.addEventListener('submit', _formSubmit);
    _callMenuItem = document.getElementById('call-menuitem');
    _callMenuItem.addEventListener('click', _call);
    _sendSmsMenuItem = document.getElementById('send-sms-menuitem');
    _sendSmsMenuItem.addEventListener('click', _sendSms);
    _createNewContactMenuItem = document.getElementById(
      'create-new-contact-menuitem');
    _createNewContactMenuItem.addEventListener('click', _createNewContact);
    _addToExistingContactMenuItem = document.getElementById(
      'add-to-existing-contact-menuitem');
    _addToExistingContactMenuItem.addEventListener('click',
      _addToExistingContact);

    _optionToMenuItem = {
      'call': _callMenuItem,
      'send-sms': _sendSmsMenuItem,
      'new-contact': _createNewContactMenuItem,
      'add-to-existent': _addToExistingContactMenuItem
    };

    _cancelActionMenuItem = document.getElementById('cancel-action-menu');
    _cancelActionMenuItem.addEventListener('click', _cancelActionMenu);
    _initiated = true;
  };

  return {
    /*
     * @param {Array} options Possible entries are: 'call', 'new-contact',
     * 'add-to-existent'. If no options, include all possible options.
    */
    show: function show(contactId, phoneNumber, options) {
      LazyLoader.load([
        '/shared/style/action_menu.css',
        '/dialer/style/phone_action_menu.css'
      ], function pnam_show() {
        _init();
        _show(contactId, phoneNumber, options);
      });
    }
  };

}());
