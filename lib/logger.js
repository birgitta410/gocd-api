
var _ = require('lodash');
var globalOptions = require('./options');

function loggerModule() {

  function isDebugActivated() {
    return globalOptions.get().debug === true;
  }

  var info = console.log;

  var error = console.error;

  var debug = function() {
    if(isDebugActivated()) {
      console.log(arguments);
    }
  };

  return {
    info: info,
    debug: debug,
    error: error
  }

}

module.exports = _.extend(module.exports, loggerModule());
