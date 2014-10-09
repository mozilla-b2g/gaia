/* global TaskScheduler, CallServicesPasswordScreen, PasscodeChange */
/* exported CallBarring */

'use strict';

var CallBarring = (function() {

  var _mobileConnection = null,
      _voiceServiceClassMask = null,
      _taskScheduler = null;

  var _cbAction = {
    CALL_BARRING_BAOC: 0,     // BAOC: Barring All Outgoing Calls
    CALL_BARRING_BOIC: 1,     // BOIC: Barring Outgoing International Calls
    CALL_BARRING_BOICexHC: 2, // BOICexHC: Barring Outgoing International
                              //           Calls Except  to Home Country
    CALL_BARRING_BAIC: 3,     // BAIC: Barring All Incoming Calls
    CALL_BARRING_BAICr: 4     // BAICr: Barring All Incoming Calls in Roaming
  };

  var _cbServiceMapper = {
    'li-cb-baoc': _cbAction.CALL_BARRING_BAOC,
    'li-cb-boic': _cbAction.CALL_BARRING_BOIC,
    'li-cb-boic-exhc': _cbAction.CALL_BARRING_BOICexHC,
    'li-cb-baic': _cbAction.CALL_BARRING_BAIC,
    'li-cb-baic-r': _cbAction.CALL_BARRING_BAICr
  };

  /**
   * Enable all the elements of the Call Barring screen.
   * @param description Message to show after enabling.
   */
  function _enableAllCallBarring(description) {
    [].forEach.call(
      document.querySelectorAll('#call-cbSettings li'),
      function enable(item) {
        var newStatus = {
          'disabled': false,
          'message': description
        };
        _updateCallBarringItem(item, newStatus);
      }
    );

    // check dependencies of the services
    var baoc = document.getElementById('li-cb-baoc');
    var boic = document.getElementById('li-cb-boic');
    var boicExhc = document.getElementById('li-cb-boic-exhc');
    var baic = document.getElementById('li-cb-baic');
    var baicR = document.getElementById('li-cb-baic-r');

    // When barring All Outgoing, disable the rest of outgoing services
    if (baoc.querySelector('input').checked) {
      _updateCallBarringItem(boic, {'disabled': true});
      _updateCallBarringItem(boicExhc, {'disabled': true});
    }
    // When barring All Incoming, disable the rest of incoming services
    if (baic.querySelector('input').checked) {
      _updateCallBarringItem(baicR, {'disabled': true});
    }
  }

  /**
   * Disable all the elements of the Call Barring screen.
   * @param description Message to show while disabled.
   */
  function _disableAllCallBarring(description) {
    [].forEach.call(
      document.querySelectorAll('#call-cbSettings li'),
      function disable(item) {
        var newStatus = {
          'disabled': true,
          'message': description
        };
        _updateCallBarringItem(item, newStatus);
      }
    );
  }

  /**
   * Updates a Call Barring item with a new status.
   * @parameter item DOM 'li' element to update
   * @parameter newStatus Object with data for the update. Of the form:
   * {
   *   disabled:[true|false], // optional, new disabled state
   *   checked: [true|false], // optional, new checked state for the input
   *   message: [string]      // optional, new message for the description
   * }
   */
  function _updateCallBarringItem(item, newStatus) {
    // console.log('>> UPDATING ITEM');
    // console.log('>> item: ' + item.id);
    // console.log('>> values: ' + JSON.stringify(newStatus));

    var descText = item.querySelector('small');
    var input = item.querySelector('input');

    // disable the item
    if (typeof newStatus.disabled === 'boolean') {
      newStatus.disabled ?
        item.setAttribute('aria-disabled', true) :
        item.removeAttribute('aria-disabled');

      if (input) {
        input.disabled = newStatus.disabled;
      }
    }

    // update the input value
    if (input && typeof newStatus.checked === 'boolean') {
      input.checked = newStatus.checked;
    }

    // update the description
    var text = newStatus.message;
    if (!text) {
      text = input && input.checked ? 'enabled' : 'disabled';
    }
    if (descText) {
      navigator.mozL10n.localize(descText, text);
    }
  }

  /**
   * Makes a request to the RIL to change the current state of a specific
   * call barring option.
   * @param id of the service we want to update
   * @param options Object with the details of the new state
   * {
   *   'program':      // id of the service to update
   *   'enabled':      // new state for the service
   *   'password':     // password introduced by the user
   *   'serviceClass': // type of RIL service (voice in this case)
   * }
   */
  function _setCallBarring(id, options) {
    // disable tap on all inputs while we deal with server
    _disableAllCallBarring('callSettingsQuery');

    console.log('CB SET > updating ' + id +
                'with options ' + JSON.stringify(options));

    _taskScheduler.enqueue('CALL_BARRING', function(done) {
      // Send the request
      var request = _mobileConnection.setCallBarringOption(options);
      request.onsuccess = function() {
        console.log('CB SET > SUCCESS!');
        console.log('CB SET > RESULT: ' + JSON.stringify(request.result));
        _enableAllCallBarring();
        done();
      };
      request.onerror = function() {
        /* request.error = { name, message } */
        console.log('CB SET > ERROR!');
        console.log('CB SET > e.name =  ' + request.error.name);
        console.log('CB SET > e.message = ' + request.error.message);

        // revert visual changes
        _updateCallBarringItem(document.getElementById(id),
                               {'checked': !options.enabled});

        // and enable all again
        _enableAllCallBarring();
        done();
      };
    });
  }

  /**
   * Makes a request to the RIL for the current state of a specific
   * call barring option.
   * @param id of the service we want to request the state of
   * @returns result object or Error object.
   * {
   *   'id': [string], name of the service requested
   *   'checked': [true|false] current state of the service
   * }
   */
  function _getCallBarring(id) {
    var options = {
      'program': _cbServiceMapper[id],
      'serviceClass': _voiceServiceClassMask
    };

    // console.log('CB GET > promise started');
    // console.log('CB GET > ID = ' + id);
    // console.log('CB GET > options =  ' + JSON.stringify(options));
    return new Promise(function (resolve, reject) {
      // Send the request
      var request = _mobileConnection.getCallBarringOption(options);
      // var request = MockCallBarring.getCallBarringOption(options);

      request.onsuccess = function() {
        // console.log('CB GET > SUCCESS for ID = ' + id);
        // console.log('CB GET > RESULT: ' + JSON.stringify(request.result));

        resolve({'id': id, 'checked': request.result.enabled});
      };
      request.onerror = function() {
        /* request.error = { name, message } */
        // console.log('CB GET > ERROR for ID = ' + id);
        // console.log('CB GET > e.name =  ' + request.error.name);
        // console.log('CB GET > e.message = ' + request.error.message);

        reject(request.error);
      };
    });
  }

  /**
   * Makes a RIL request to change the passcode.
   * @param data info related to the PIN code. In the form:
   * {
   *    'pin':    // current passcode
   *    'newPin': // new passcode
   * }
   */
  function _changeCallBarringPasscode(pinData) {
    return new Promise(function finished(resolve, reject) {
      console.log('> PASSCODE UPDATE');
      _disableAllCallBarring('changePasswordQuery');
      _taskScheduler.enqueue('CALL_BARRING', function(done) {
        var request = _mobileConnection.changeCallBarringPassword(pinData);
        request.onsuccess = function() {
          console.log('> PASSCODE UPDATE > success');
          _enableAllCallBarring();
          done();
          resolve();
        };
        request.onerror = function() {
          /* request.error = { name, message } */
          console.log('> PASSCODE UPDATE > ERROR!');
          console.log('> PASSCODE UPDATE > e.name =  ' + request.error.name);
          console.log('> PASSCODE UPDATE > e.message = ' +
            request.error.message);

          _enableAllCallBarring();
          done();
          reject(request.error);
        };
      }); // end enqeue
    }); // end promise
  }

  /**
   * Triggers the passcode change screen
   */
  function _launchPasscodeChange() {
    PasscodeChange.launch().then(
      _changeCallBarringPasscode
    ).then(function success() {
      // password changed correctly
      console.log('> PASSCODE CHANGE SUCCESS');
      // status with message
    }).catch(function error(err) {
      // error during the process
      console.log('> PASSCODE CHANGE ERROR > ' + JSON.stringify(err));
    }).then(function doAnyway() {
      // close spinner
      console.log('> PASSCODE END > closing spinner');
    });
  }

  /**
   * Shows the passcode input screen for the user to introduce the PIN
   * needed to activate/deactivate a service
   */
  function _callBarringClick(evt) {
    var input = evt.target;

    // Show password screen
    CallServicesPasswordScreen.show().then(
      // password screen confirmed
      function confirmed(password) {
        var inputID = input.parentNode.parentNode.id;
        // Create the options object
        var options = {
          'program': _cbServiceMapper[inputID],
          'enabled': input.checked,
          'password': password,
          'serviceClass': _voiceServiceClassMask
        };

        _setCallBarring(inputID, options);
      },
      // password screen canceled
      function canceled() {
        // revert visual changes
        input.checked = !input.checked;
      }
    );
  }


  /**
   * Initialize the Call Barring panel.
   * BAOC: Barring All Outgoing Calls
   * BOIC: Barring Outgoing International Calls
   * BOICexHC: Barring Outgoing International Calls Except to Home Country
   * BAIC: Barring All Incoming Calls
   * BAICr: Barring All Incoming Calls in Roaming
   */
  function _initCallBarring(options) {
    if (!options) {
      console.error('options is empty');
      return;
    }

    _mobileConnection = options.mobileConnection;
    _voiceServiceClassMask = options.voiceServiceClassMask;
    _taskScheduler = TaskScheduler();

    var inputBaoc =
      document.querySelector('#li-cb-baoc .checkbox-label input');
    var inputBoic =
      document.querySelector('#li-cb-boic .checkbox-label input');
    var inputBoicExhc =
      document.querySelector('#li-cb-boic-exhc .checkbox-label input');
    var inputBaic =
      document.querySelector('#li-cb-baic .checkbox-label input');
    var inputBaicR =
      document.querySelector('#li-cb-baic-r .checkbox-label input');

    var changePassword = document.getElementById('li-cb-pswd');


    inputBaoc.addEventListener('change', _callBarringClick);
    inputBoic.addEventListener('change', _callBarringClick);
    inputBoicExhc.addEventListener('change', _callBarringClick);
    inputBaic.addEventListener('change', _callBarringClick);
    inputBaicR.addEventListener('change', _callBarringClick);

    changePassword.addEventListener('click', _launchPasscodeChange);
  }

  /**
   * Update the state of all the Call Barring subpanels
   */
  function _updateCallBarringSubpanels() {
    // disable all, change description to 'requesting network info'
    _disableAllCallBarring('callSettingsQuery');

    // make the request for each one
    var cbOptions = [];
    var currentID = '';
    console.log('>> REQUESTING INITIAL VALUES');
    console.log('_taskScheduler = ' + _taskScheduler);
    _taskScheduler.enqueue('CALL_BARRING', function(done) {
      currentID = 'li-cb-baoc';
      _getCallBarring(currentID).then(function gotValue(baoc) {
        cbOptions.push(baoc);
        currentID = 'li-cb-boic';
        return _getCallBarring(currentID);
      }).then(function gotValue(boic) {
        cbOptions.push(boic);
        currentID = 'li-cb-boic-exhc';
        return _getCallBarring(currentID);
      }).then(function gotValue(boicExHc) {
        cbOptions.push(boicExHc);
        currentID = 'li-cb-baic';
        return _getCallBarring(currentID);
      }).then(function gotValue(baic) {
        cbOptions.push(baic);
        currentID = 'li-cb-baic-r';
        return _getCallBarring(currentID);
      }).then(function gotValue(baicR) {
        cbOptions.push(baicR);
        console.log('>> InVal OK');
        // console.log('>>> UPDATING CALL BARRING ITEMS');
        console.log('>>> updating items with: ' + JSON.stringify(cbOptions));

        cbOptions.forEach(function updateItem(listItem) {
          var item = document.getElementById(listItem.id);
          _updateCallBarringItem(item, {'checked': listItem.checked});
        });

      }).catch(function errorWhileProcessing(err) {
        console.log('>> InVal sequence error: ' + JSON.stringify(err));
      }).then(function afterEverythingDone() {
        console.log('>> InVal FINISHED');
        console.log('>>>>> enabling inputs');
        _enableAllCallBarring();

        done();
      });
    });
  }

  return {
    init: _initCallBarring,
    updateSubpanels: _updateCallBarringSubpanels
  };
})();
