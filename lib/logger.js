
var _ = require('lodash');
var globalOptions = require('./options');

function loggerModule() {

  function isDebugActivated() {
    return globalOptions.get().debug === true;
  }

  var info = function(message) {
    console.log(message);
  };

  var error = function(message) {
    console.log(message);
  };

  var debug = function(message) {
    if(isDebugActivated()) {
      console.log(message);
    }
  };

  return {
    info: info,
    debug: debug,
    error: error
  }

}

module.exports = _.extend(module.exports, loggerModule());
