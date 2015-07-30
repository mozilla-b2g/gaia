
/* exports UI */
/* global Controller, MobileIDErrorOverlay*/

(function(exports) {
  'use strict';
  var initialized;

  var allowButton, header, verificationCodeButton,
      multistateButton, panelsContainer,
      verificationCodeInput, msisdnInput,
      msisdnAutomaticOptions, typeMSISDNButton,
      selectAutomaticOptionsButton, msisdnContainer,
      legend, legendParent,
      countryCodesSelect, verificationPanel,
      msisdnSelectionPanel, verificationCodeTimer,
      stepsExplanation, verificationExplanation,
      successExplanation;

  var isVerified = false;
  var isVerifying = false;
  var isVerificationCode = false;
  var isTimeoutOver = false;
  var isManualMSISDN = false;
  var buttonCurrentStatus;

  var appName, identity;

  var verificationInterval, verificationIntervalSteps = 0,
      currentIntervalStep = 0;

  var countryCodes;

  function _setMultibuttonStep(stepName) {
    buttonCurrentStatus = stepName;
    var shift = 0;
    switch(stepName) {
      case 'allow':
        shift = 0;
        allowButton.className = 'msb-button-step state-allow';
        allowButton.disabled = false;
        break;
      case 'sending':
        shift = 0;
        allowButton.className = 'msb-button-step state-sending';
        allowButton.disabled = true;
        break;
      case 'verify':
        shift = -50;
        verificationCodeButton.className = 'msb-button-step state-verify';
        verificationCodeButton.disabled = false;
        break;
      case 'verifying':
        shift = -50;
        verificationCodeButton.className = 'msb-button-step state-verifying';
        verificationCodeButton.disabled = true;
        break;
      case 'verified':
        shift = -50;
        verificationCodeButton.className = 'msb-button-step state-verified';
        verificationCodeButton.disabled = false;
        break;
      case 'resend':
        shift = -50;
        verificationCodeButton.className = 'msb-button-step state-resend';
        verificationCodeButton.disabled = false;
        break;
    }

    multistateButton.style.transform = 'translateX(' + shift + '%)';
  }

  function _setPanelsStep(stepName) {
    var shift = 0;
    switch(stepName) {
      case 'msisdn':
        shift = 0;
        break;
      case 'verification':
        shift = -25;
        break;
      case 'done':
        shift = -50;
        break;
    }

    panelsContainer.style.transform = 'translateX(' + shift + '%)';
  }

  function _disablePanel(stepName) {
    switch(stepName) {
      case 'msisdn':
        msisdnAutomaticOptions.classList.add('disabled');
        typeMSISDNButton.classList.add('disabled');
        selectAutomaticOptionsButton.classList.add('disabled');
        countryCodesSelect.classList.add('disabled');
        msisdnInput.disabled = true;
        break;
      case 'verification':
        verificationCodeInput.disabled = true;
        break;
    }
  }

  function _enablePanel(stepName) {
    switch(stepName) {
      case 'msisdn':
        msisdnAutomaticOptions.classList.remove('disabled');
        typeMSISDNButton.classList.remove('disabled');
        selectAutomaticOptionsButton.classList.remove('disabled');
        countryCodesSelect.classList.remove('disabled');
        msisdnInput.disabled = false;
        break;
      case 'verification':
        verificationCodeInput.disabled = false;
        break;
    }
  }

  function _msisdnContainerTranslate(step) {
    isManualMSISDN = step === 0 ? false : true;
    msisdnContainer.style.transform = 'translateX(' + -1 * 50 * step + '%)';
  }

  function _fieldErrorDance(element) {
    element.addEventListener('animationend',function danceOver() {
      element.removeEventListener('animationend', danceOver);
      element.classList.remove('error');
    });
    element.classList.add('error');
  }

  function _fillCountryCodesList(callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function fileLoaded() {
      if (xhr.readyState === 4) {
        if (xhr.status === 0 || xhr.status === 200) {
          // Cache the CC
          countryCodes = xhr.response;

          var sortedObject = _sortCountriesByFullName();
          // Clean the <select> element
          countryCodesSelect.innerHTML = '';
          // Per country, we show its country name (`full`)
          var ccFragment = document.createDocumentFragment();
          var added = {};
          sortedObject.forEach(function(country) {
            var mcc = country[0];
            // Do not re-add countries (like USA, which has more than one mcc)
            if (added[countryCodes[mcc].code]) {
              return;
            }
            var option = document.createElement('option');
            option.textContent = countryCodes[mcc].full + ' (' +
              countryCodes[mcc].prefix + ')';
            option.value = mcc;
            added[countryCodes[mcc].code] = true;
            ccFragment.appendChild(option);
          });

          countryCodesSelect.appendChild(ccFragment);

          // Once we have the country code list we can default to the current
          // MCC if available.
          var conn = window.navigator.mozMobileConnections ?
                     window.navigator.mozMobileConnections[0] : null;
          if (conn && conn.voice && conn.voice.network) {
            countryCodesSelect.value = conn.voice.network.mcc;
            legend.innerHTML = countryCodes[countryCodesSelect.value].prefix;
          }
          callback();
        } else {
          console.error('Failed to fetch file: ', xhr.statusText);
          callback();
        }
      }
    };
    xhr.open('GET', ' /shared/resources/mcc.json', true);
    xhr.responseType = 'json';
    xhr.send();
  }

  function _sortCountriesByFullName() {
    var sorted = [];
    for (var mcc in countryCodes) {
      sorted.push([mcc, countryCodes[mcc].full]);
    }
    sorted = sorted.sort(function compareFunction(a, b) {
      return a[1] > b[1];
    });
    return sorted;
  }

  function _getIdentitySelected() {
    var identity;
    if (isManualMSISDN) {
      identity =  {
        prefix: countryCodes[countryCodesSelect.value].prefix,
        mcc: countryCodesSelect.value,
        phoneNumber: msisdnInput.value.length && msisdnInput.value || null
      };
    } else {
      var query = 'input[name="msisdn-option"]:checked';
      var optionChecked = document.querySelector(query);
      if (optionChecked.dataset.identificationType === 'msisdn') {
        identity =  {
          prefix: null,
          mcc: null,
          phoneNumber: optionChecked.value
        };
      } else {
        identity = {
          serviceId: optionChecked.dataset.serviceId
        };
      }
    }
    return identity;
  }

  function _getCode() {
    return verificationCodeInput.value;
  }

  function _showVerificationPanel(phoneNumber) {
    // If our identity is registered properly, we are ready to go!
    isVerificationCode = false;
    isVerifying = false;
    isVerified = true;
    clearInterval(verificationInterval);
    // Update the status of the button showing the 'success'
    _setMultibuttonStep('verified');
    // Remove the progress bar
    verificationCodeTimer.classList.remove('show');
    // Update the string
    navigator.mozL10n.setAttributes(
      successExplanation,
      'successMessage',
      {
        phone_number: phoneNumber || '',
        app_name: appName
      }
    );
    // Add gif animation at the end
    panelsContainer.addEventListener('transitionend', function readyToGif() {
      panelsContainer.removeEventListener('transitionend', readyToGif);
      document.querySelector('.done-panel').classList.add('done-panel-gif');
    });
    // Show the panel with some feedback to the user
    _setPanelsStep('done');
  }

  function _addEventListeners() {
    header.addEventListener(
      'action',
      function onClose() {
        Controller.postCloseAction(isVerified);
      }
    );

    typeMSISDNButton.addEventListener(
      'click',
      function onManualMSISDN() {
        _msisdnContainerTranslate(1);
      }
    );

    selectAutomaticOptionsButton.addEventListener(
      'click',
      function onAutomaticMSISDN() {
        _msisdnContainerTranslate(0);
      }
    );

    allowButton.addEventListener(
      'click',
      function onAllow() {
        // Send to controller the identity selected
        identity = _getIdentitySelected();
        // Check if is a valid identity
        if (identity.mcc &&
            (!identity.phoneNumber ||
             isNaN(identity.phoneNumber)
            )) {
          _fieldErrorDance(msisdnInput);
          return;
        }
        // Disable to avoid any action while requesting the server
        _disablePanel('msisdn');
        // Update the status of the button
        _setMultibuttonStep('sending');
        // Post identity
        Controller.postIdentity(identity);
      }
    );

    verificationCodeButton.addEventListener(
      'click',
      function onVerify() {
        // In the case is not verified yet
        if (!isVerified) {
          // Was the tap done in the 'resend'?
          if (verificationCodeButton.classList.contains('state-resend')) {
            Controller.requestCode();
            verificationCodeInput.value = '';
            // Disable the panel
            _enablePanel('verification');
            // We udpate the button
            _setMultibuttonStep('sending');
            // As we are resending, we reset the conditions
            isVerifying = false;
            isTimeoutOver = false;
          } else {
            var code = _getCode();
            if (!code.length || isNaN(code) || code.length < 6) {
              _fieldErrorDance(verificationCodeInput);
              return;
            }
            // If we are in the proccess of verifying, we need
            // first to send the code to the server
            Controller.postVerificationCode(_getCode());
            // Disable the panel
            _disablePanel('verification');
            // We udpate the button
            _setMultibuttonStep('verifying');
            // As we are verifying, we udpate the flag
            isVerifying = true;
          }
          return;
        }
        // If the identity posted to the server and/or the verification
        // code is accepted, we are ready to close the flow.
        Controller.postCloseAction(isVerified);
      }
    );

    countryCodesSelect.addEventListener(
      'blur',
      function onSelectBlur() {
        countryCodesSelect.hidden = true;
        legend.innerHTML = countryCodes[countryCodesSelect.value].prefix;
        return;
      }
    );

    legendParent.addEventListener(
      'click',
      function onLegendClick() {
        countryCodesSelect.click();
        countryCodesSelect.focus();
        countryCodesSelect.hidden = false;
        return;
      }
    );
  }

  var UI = {
    init: function ui_init(params) {
      var callback = params && params.callback ?
                     params.callback :
                     function() {};

      header = document.getElementById('header');
      allowButton = document.getElementById('allow-button');
      verificationCodeButton = document.getElementById('verify-button');
      multistateButton = document.getElementById('msb');
      panelsContainer = document.getElementById('panels-container');
      verificationCodeInput = document.getElementById('verification-code');
      msisdnInput = document.getElementById('msisdn-input');
      msisdnAutomaticOptions = document.querySelector('.phone-options-list');
      typeMSISDNButton = document.getElementById('add-msisdn');
      selectAutomaticOptionsButton =
        document.getElementById('do-automatic-msisdn');
      msisdnContainer = document.querySelector('.msisdn-selection-wrapper');
      legend = document.getElementById('legend');
      legendParent = document.getElementById('legend-parent');
      countryCodesSelect = document.getElementById('country-codes-select');
      verificationPanel = document.querySelector('.verification-panel');
      msisdnSelectionPanel = document.querySelector('.msisdn-selection-panel');
      verificationCodeTimer =
        document.getElementById('verification-code-timer');
      // Elements to localize
      stepsExplanation =
        document.getElementById('mobile-id-explanation');
      verificationExplanation =
        document.getElementById('verification-code-explanation');
      successExplanation =
        document.getElementById('success-explanation');

      // Fill the country code list
      _fillCountryCodesList(function() {
        // Avoid adding duplicated listeners if init is called more than once.
        if (initialized) {
          callback();
          return;
        }
        initialized = true;
        _addEventListeners();
        callback();
      });

      // HACK: We must reposition the gaia-header
      // text once we know the dialog is visible.
      window.addEventListener('shown', function() {
        var title = header.querySelector('h1');
        title.textContent = title.textContent;
      });
    },
    localize: function ui_localize(name) {
      // Cache the name of the app
      appName = name;
      // Let's localize the explanation
      navigator.mozL10n.setAttributes(
        stepsExplanation,
        'mobileIDExplanation',
        {
          app_name: appName
        }
      );
    },
    render: function ui_render(identifications) {
      var optionsFragment = document.createDocumentFragment();

      if (!identifications || !identifications.length) {
        _msisdnContainerTranslate(1);
        selectAutomaticOptionsButton.hidden = true;
        return;
      }

      var isPrimaryOption = false;
      for (var i = 0, l = identifications.length; i < l; i++) {
        var li = document.createElement('li');
        var label = document.createElement('label');
        var typeIcon = document.createElement('span');
        var radio = document.createElement('input');
        var radioMask = document.createElement('span');
        var name = document.createElement('p');

        var iconClasses = 'icon icon-simcardlock';
        if (identifications[i].primary) {
          isPrimaryOption = true;
          radio.checked = true;
          iconClasses+=' primary';
        } else {
          iconClasses+=' sim' + (+identifications[i].serviceId + 1);
        }
        typeIcon.className = iconClasses;

        name.removeAttribute('data-l10n-id');
        name.textContent =
          identifications[i].msisdn ||
          identifications[i].operator;
        if (!name.textContent) {
          navigator.mozL10n.setAttributes(name, 'simLabel', {
            id: +identifications[i].serviceId + 1 });
        }

        radio.name = 'msisdn-option';
        radio.type = 'radio';

        if (identifications[i].serviceId !== undefined) {
          radio.dataset.identificationType = 'serviceid';
          radio.dataset.serviceId = identifications[i].serviceId;
        } else {
          radio.dataset.identificationType = 'msisdn';
        }

        radio.value =
          identifications[i].msisdn || identifications[i].serviceId;
        radioMask.className = 'radio-mask';

        label.appendChild(typeIcon);
        label.appendChild(radio);
        label.appendChild(radioMask);
        label.appendChild(name);

        li.appendChild(label);

        optionsFragment.appendChild(li);
      }

      var phoneOptionsList = document.querySelector('.phone-options-list');

      // If no option is checked, I check the first one as default
      if (!isPrimaryOption && identifications.length > 0) {
        optionsFragment.children[0].querySelector('input').checked = true;
      }

      phoneOptionsList.innerHTML = '';
      phoneOptionsList.appendChild(optionsFragment);
    },
    onVerifying: function ui_onverifiying() {
      // Update the button. There is no panel change
      _setMultibuttonStep('verifying');
      _disablePanel('verification');
    },
    onVerified: function ui_onverified(phoneNumber) {
      if (isVerificationCode && !isVerifying) {
        _disablePanel('verification');
        verificationCodeInput.type = 'password';
        verificationCodeInput.value = 'FAKECODE';
        setTimeout(_showVerificationPanel.bind(this, phoneNumber), 1000);
      } else {
        _showVerificationPanel(phoneNumber);
      }

    },
    onVerificationCode: function ui_onVerificationCode(params) {
      isVerificationCode = true;
      // Update the status of the button
      _setMultibuttonStep('verify');
      // Show the verification code panel
      _setPanelsStep('verification');
      _enablePanel('verification');

      // Update the string
      navigator.mozL10n.setAttributes(
        verificationExplanation,
        'verificationCodeExplanation',
        {
          phone_number: identity.phoneNumber
        }
      );

      // Timer UI

      // Update the params we need
      isTimeoutOver = false;
      currentIntervalStep = +params.verificationTimeoutLeft;
      verificationIntervalSteps = +params.verificationTimeout;
      // Update the UI properly as starting poing
      verificationCodeTimer.max = verificationIntervalSteps;
      verificationCodeTimer.value = currentIntervalStep;
      // Add the timeout ui
      verificationCodeTimer.classList.add('show');
      // Boot the interval with the number of steps we need
      verificationInterval = setInterval(function() {
        --currentIntervalStep;
        if (currentIntervalStep < 0) {
          if (!isVerifying) {
            // Show 'resend' button
            _setMultibuttonStep('resend');
            _disablePanel('verification');
          }
          // Hide the keyboard if present
          document.activeElement.blur();
          // Set that the timeout is over
          isTimeoutOver = true;
          // Hide timer
          verificationCodeTimer.classList.remove('show');
          // Clear interval
          clearInterval(verificationInterval);
          return;
        }
        verificationCodeTimer.value = currentIntervalStep;
      }, 1000);

      // TODO Add retries when available in the server

    },
    onerror: function ui_onError(error) {
      switch (error) {
        case 'VERIFICATION_CODE_TIMEOUT':
        case 'NO_RETRIES_LEFT':
          MobileIDErrorOverlay.show(
            navigator.mozL10n.get('errorTitle'),
            navigator.mozL10n.get('timeoutErrorMessage')
          );
          _disablePanel('verification');
          _setMultibuttonStep('resend');
          break;
        case 'INVALID_PHONE_NUMBER':
          _enablePanel('msisdn');
          _setMultibuttonStep('allow');
          _fieldErrorDance(msisdnInput);
          break;
        case 'INVALID_VERIFICATION_CODE':
          if (isTimeoutOver) {
            _disablePanel('verification');
            _setMultibuttonStep('resend');
            isTimeoutOver = false;
            isVerifying = false;
            return;
          }
          _enablePanel('verification');
          _setMultibuttonStep('verify');
          _fieldErrorDance(verificationCodeInput);
          break;
        default:
          MobileIDErrorOverlay.show(
            navigator.mozL10n.get('errorTitle'),
            navigator.mozL10n.get('serverErrorMessage'),
            function onClick() {
              Controller.postCloseAction(isVerified);
            }
          );
          break;
      }
    },
    setScroll: function ui_setScroll() {
      // Add scroll management to show properly the input
      // when the keyboard is shown
      var bodyRect = document.body.getBoundingClientRect(),
          codeRect = verificationCodeInput.getBoundingClientRect(),
          msisdnInputRect = msisdnInput.getBoundingClientRect(),
          offsetCode   = codeRect.top - bodyRect.top,
          offsetMSISDN   = msisdnInputRect.top - bodyRect.top;

      window.addEventListener(
        'resize',
        function onResized() {
          verificationPanel.scrollTop = offsetCode;
          msisdnSelectionPanel.scrollTop = offsetMSISDN;
        }
      );
    }
  };

  exports.UI = UI;

}(this));
