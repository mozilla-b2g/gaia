var Service = {};

if (typeof(XPCOMUtils) === 'undefined') {
  Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
}


XPCOMUtils.defineLazyServiceGetter(Service, 'env',
                                   '@mozilla.org/process/environment;1',
                                   'nsIEnvironment');
module.exports = Service.env;
