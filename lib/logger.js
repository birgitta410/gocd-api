
var _ = require('lodash');
var globalOptions = require('./options');

function loggerModule() {

  function isDebugActivated() {
    return globalOptions.get().debug === true;
  }

  function prepareLogMsg(prefix, msgArguments) {
      var msgParts = [prefix];
      for(i=0; i<msgArguments.length; i++) msgParts.push(msgArguments[i]);
      return msgParts;
  }

  var info = function() {
    console.log.apply(console, prepareLogMsg('[INFO]', arguments));
  };

  var error = function() {
    console.error.apply(console, prepareLogMsg('[ERROR]', arguments));
  };

  var debug = function() {
    if(isDebugActivated()) {
      console.log.apply(console, prepareLogMsg('[DEBUG]', arguments));
    }
  };

  return {
    info: info,
    debug: debug,
    error: error
  }

}

module.exports = _.extend(module.exports, loggerModule());
