var _ = require('lodash');
var logger = require('./logger');
var gocdRequestor = require('./gocd/gocdRequestor');
var ccTrayRequestor = require('./cc/ccTrayRequestor');

function optionsModule() {
  var options = {};

  function authInfo() {
    return options.user ? {
      user: options.user,
      password: options.password || options.key
    } : undefined;
  }

  var set = function(newOptions) {
    options = newOptions || {};
    options.debug = options.debug === 'true' || options.debug === '1' || options.debug;

    var logOptions = _.cloneDeep(options);
    _.each(['password', 'key', 'secret'], function(obfuscate) {
      logOptions[obfuscate] = options[obfuscate] ? "xxxx" : undefined;
    });

    logger.info('SETTING OPTIONS', logOptions);
  };

  var get = function() {
    return options || {};
  };

  var extend = function(additionalOptions) {
    options = _.extend(options || {}, additionalOptions);
  };

  var stageNameInPipeline = function(stageName, pipelineName) {
    if(stageName.indexOf(pipelineName + ' :: ') === 0) {
      return true;
    }

  };

  var getHistoryRequestor = function() {
    return getGocdRequestor();
  };

  var getGocdRequestor = function() {
    return gocdRequestor;
  };

  var getCcTrayRequestor = function() {
    return ccTrayRequestor;
  };

  var getCcTrayUrl = function(pipeline) {
    if(options.ccTrayUrl) {
      return options.ccTrayUrl;
    } else {
      return options.url + '/go/cctray.xml';
    }
  };

  return {
    set: set,
    get: get,
    extend: extend,

    authInfo: authInfo,

    getHistoryRequestor: getHistoryRequestor,
    getCcTrayRequestor: getCcTrayRequestor,
    getCcTrayUrl: getCcTrayUrl,
    stageNameInPipeline: stageNameInPipeline
  };
}

var options = optionsModule();
exports.get = options.get;
exports.set = options.set;
exports.extend = options.extend;

exports.authInfo = options.authInfo;

exports.getHistoryRequestor = options.getHistoryRequestor;
exports.getCcTrayRequestor = options.getCcTrayRequestor;

exports.getCcTrayUrl = options.getCcTrayUrl;
exports.stageNameInPipeline = options.stageNameInPipeline;
