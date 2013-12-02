Evme.Features = new function Evme_Features() {
  var NAME = 'Features', self = this,
      currentFeatures = {},
      FEATURES = 'FROM CONFIG';

  this.ENABLE = true;
  this.DISABLE = false;

  this.init = function init(options) {
    !options && (options = {});

    FEATURES = options.featureStateByConnection;

    // start by enabling all configurable features
    for (var feature in FEATURES) {
      currentFeatures[feature] = {
      'value': true
      };
    }

    Evme.EventHandler.trigger(NAME, 'init');
  };

  this.isOn = function isOn(featureName) {
    return !!self.get(featureName).value;
  };

  this.get = function get(featureName) {
    verifyFeature(featureName);
    return currentFeatures[featureName];
  };

  this.set = function set(featureName, featureValue) {
    Evme.Utils.log('Features: ' + (featureValue ? 'enable' : 'disable') +
      ' ' + featureName);
    verifyFeature(featureName);

    var oldValue = currentFeatures[featureName].value;

    if (oldValue === featureValue) {
    return false;
    }

    currentFeatures[featureName].value = featureValue;
    currentFeatures[featureName].lastChanged = Date.now();

    Evme.EventHandler.trigger(NAME, 'set', {
    'featureName': featureName,
    'oldValue': oldValue,
    'newValue': featureValue
    });

    return true;
  };

  this.enable = function enable(featureName) {
    return self.set(featureName, true);
  };

  this.disable = function disable(featureName) {
    return self.set(featureName, false);
  };

  this.startTimingFeature =
    function startTimingFeature(featureName, isTurningOn) {
      verifyFeature(featureName);

      var timeout = FEATURES[featureName][isTurningOn ?
                                                'bringBack' : 'disableAfter'];

      window.clearTimeout(currentFeatures[featureName].timeout);

      currentFeatures[featureName].started = Date.now();
      currentFeatures[featureName].isTurningOn = isTurningOn;

      if (!isTurningOn) {
        currentFeatures[featureName].timeout =
          window.setTimeout(function onFeatureTimeoutfunction() {
            currentFeatures[featureName].timeout = null;
            self.disable(featureName);
          }, timeout);
      }
    };

  // didSucceed should be true for timeouts that try to see if ti should
  // be re-enabled
  // for example: when re-enabling apps, this should be set to true.
  // but when canceling the apps search, this will NOT be true
  this.stopTimingFeature = function stopTimingFeature(featureName, didSucceed) {
    verifyFeature(featureName);

    if (!didSucceed && currentFeatures[featureName].isTurningOn) {
    return;
    }

    var timePassed = Date.now() - currentFeatures[featureName].started,
      inBringBackLimit = timePassed < FEATURES[featureName].bringBack;

    window.clearTimeout(currentFeatures[featureName].timeout);
    currentFeatures[featureName].timeout = null;

    if (inBringBackLimit && currentFeatures[featureName].isTurningOn) {
    self.enable(featureName);
    }
  };

  function verifyFeature(featureName) {
    if (!currentFeatures.hasOwnProperty(featureName)) {
      throw new Error('No such feature');
    }
  }
}
