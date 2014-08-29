/*global define*/
define(function() {
  /**
   * Mixes properties from source into target.
   * @param  {Object} target   target of the mix.
   * @param  {Object} source   source object providing properties to mix in.
   * @param  {Boolean} override if target already has a the property,
   * override it with the one from source.
   * @return {Object}          the target object, now with the new properties
   * mixed in.
   */
  return function mix(target, source, override) {
    Object.keys(source).forEach(function(key) {
      if (!target.hasOwnProperty(key) || override)
        target[key] = source[key];
    });
    return target;
  };
});
