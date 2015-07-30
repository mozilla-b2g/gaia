/**
 * Make sure all operations would be executed one by one.
 *
 * @module call/call_forwarding
 */
define(function(require) {
  'use strict';

  var CallSettingsTaskScheduler =
    require('panels/call/call_settings_task_scheduler');
  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');
  var CallUtils = require('panels/call/call_utils');
  var CallConstant = require('panels/call/call_constant');
  var mozSettings = window.navigator.mozSettings;

  /**
   * @class CallForwarding
   * @returns {CallForwarding}
   */
  var CallForwarding = Module.create(function CallForwarding(cardIndex) {
    this.super(Observable).call(this);

    this._cardIndex = cardIndex;
    this._cfReasonStates = [0, 0, 0, 0];
  }).extend(Observable);

  Observable.defineObservableProperty(CallForwarding.prototype, 'state', {
    readonly: true,
    value: 'normal'
  });

  // This will create following observable properties :
  //
  // unConditionalNumber
  // unConditionalEnabled
  // mobileBusyNumber
  // mobileBusyEnabled
  // noReplyNumber
  // noReplyEnabled
  // notReachableNumber
  // notReachableEnabled
  //
  Object.keys(CallConstant.CALL_FORWARD_REASON_MAPPING).forEach(
    (cfOptionName) => {
      Observable.defineObservableProperty(CallForwarding.prototype,
        cfOptionName + 'Number', {
          readonly: true,
          value: null
        });

      Observable.defineObservableProperty(CallForwarding.prototype,
        cfOptionName + 'Enabled', {
          readonly: true,
          value: false
        });
  });

  /**
   * This is an internal function that can help us get the right conn.
   *
   * @memberOf CallForwarding
   * @return {MozMobileConnection}
   */
  CallForwarding.prototype._getConn = function() {
    var conn = window.navigator.mozMobileConnections[this._cardIndex];
    if (!conn) {
      this.throw('We can\'t find the conn object on card ' + this._cardIndex);
    } else {
      return conn;
    }
  };

  /**
   * We can use this function to setCallForwardingValues on each type based
   * on passing options.key. And in order to make sure operations are safe,
   * we will put it inside TaskScheduler to help us execute function one by one.
   *
   * @memberOf CallForwarding
   * @param {Object} options
   * @param {String} options.key
   * @param {Number} options.number
   * @param {Boolean} options.enabled
   * @return {Promise}
   */
  CallForwarding.prototype.setCallForwardingValues = function(options) {
    this._state = 'requesting';

    var promise = new Promise((resolve, reject) => {
      var conn = this._getConn(this._cardIndex);
      var key = options.key;
      var number = options.number;
      var enabled = !!options.enabled;

      if (!key) {
        this._state = 'normal';
        reject();
      } else if (this._cfReasonStates[
        CallConstant.CALL_FORWARD_REASON_MAPPING[key]] === enabled) {
        // Bails out in case the reason is already enabled/disabled.
        this._state = 'normal';
        reject();
      } else {
        var mozMobileCFInfo = {};
        mozMobileCFInfo.action = enabled ?
          CallConstant.CALL_FORWARD_ACTION.REGISTRATION :
          CallConstant.CALL_FORWARD_ACTION.DISABLE;
        mozMobileCFInfo.reason =
          CallConstant.CALL_FORWARD_REASON_MAPPING[key];
        mozMobileCFInfo.serviceClass = conn.ICC_SERVICE_CLASS_VOICE;

        // we only have to check phone's number when it is enabled
        if (enabled && !CallUtils.isPhoneNumberValid(number)) {
          this._state = 'normal';
          reject({
            name: 'callForwardingInvalidNumberError'
          });
        } else {
          mozMobileCFInfo.number = number;
          mozMobileCFInfo.timeSeconds =
            mozMobileCFInfo.reason !=
              CallConstant.CALL_FORWARD_REASON.NO_REPLY ? 0 : 20;
          CallSettingsTaskScheduler.enqueue({
            type: 'CALL_FORWARDING',
            func: () => {
              return conn.setCallForwardingOption(mozMobileCFInfo);
            }
          }).then(() => {
            this._state = 'normal';
            resolve({
              key: key,
              action: mozMobileCFInfo.action
            });
          }).catch(() => {
            this._state = 'normal';
            reject({
              name: 'callForwardingSetError'
            });
          });
        }
      }
    });
    return promise;
  };

  /**
   * We can use this function to get specific call forwarding option.
   *
   * @memberOf CallForwarding
   * @param {String} optionName
   * @return {Promise}
   */
  CallForwarding.prototype._getOption = function(optionName) {
    var conn = this._getConn();

    if (!(optionName in CallConstant.CALL_FORWARD_REASON)) {
      this.debug('Your optionName may be wrong - ', optionName);
      return Promise.reject();
    }

    return conn.getCallForwardingOption(
      CallConstant.CALL_FORWARD_REASON[optionName]);
  };

  /**
   * We can get all call forwarding related options at the same time.
   *
   * @memberOf CallForwarding
   * @return {Promise}
   */
  CallForwarding.prototype.refresh = function() {
    this._state = 'requesting';

    return CallSettingsTaskScheduler.enqueue({
      type: 'CALL_FORWARDING',
      func: () => {
        return Promise.all([
          this._getOption('UNCONDITIONAL'),
          this._getOption('MOBILE_BUSY'),
          this._getOption('NO_REPLY'),
          this._getOption('NOT_REACHABLE')
        ]);
      }
    }).then((results) => {
      var promise = new Promise((resolve, reject) => {
        var storedOptions = {};
        var cfOptions = {
          'unConditional': results[0],
          'mobileBusy': results[1],
          'noReply': results[2],
          'notReachable': results[3]
        };

        Object.keys(cfOptions).forEach(function(cfOptionName) {
          var rules = cfOptions[cfOptionName];
          var rule = CallUtils.findActiveVoiceRule(rules);
          if (rule) {
            this._cfReasonStates[
              CallConstant.CALL_FORWARD_REASON_MAPPING[cfOptionName]] = 1;

            this['_' + cfOptionName + 'Number'] = rule.number;
            this['_' + cfOptionName + 'Enabled'] = true;

            if (cfOptionName === 'unConditional') {
              // Send the latest query result from carrier to system app
              storedOptions['ril.cf.carrier.enabled'] = {
                enabled: true,
                index: this._cardIndex
              };
            }
          } else {
            this._cfReasonStates[
              CallConstant.CALL_FORWARD_REASON_MAPPING[cfOptionName]] = 0;

            this['_' + cfOptionName + 'Number'] = '';
            this['_' + cfOptionName + 'Enabled'] = false;

            // Send the latest query result from carrier to system app
            if (cfOptionName === 'unConditional') {
              storedOptions['ril.cf.carrier.enabled'] = {
                enabled: false,
                index: this._cardIndex
              };
            }
          }
        }, this);

        mozSettings.createLock().set(storedOptions).then(() => {
          this._state = 'normal';
          resolve(cfOptions);
        }, () => {
          this._state = 'error';
          this.error('Something error happened when storing into settings db');
          reject();
        });
      });
      return promise;
    }, () => {
      this._state = 'error';
      this.error('Something error happened when refresh');
    });
  };

  /**
   * Know whether unconditional call forwarding is set on this simcard.
   *
   * @memberOf CallForwarding
   * @return {Boolean}
   */
  CallForwarding.prototype.isUnconditionalCFOn = function() {
    return this._cfReasonStates[0] === 1;
  };

  return CallForwarding;
});
