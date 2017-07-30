var _ = require('lodash');
var logger = require('./logger');
var gocdRequestor = require('./gocd/gocdRequestor');
var gocdSampleRequestor = require('./gocd/gocdSampleRequestor');
var ccTrayRequestor = require('./cc/ccTrayRequestor');
var ccTraySampleRequestor = require('./cc/ccTraySampleRequestor');

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

  var sampleIt = function() {
    return options === {} || options.sample === true;
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
    if(sampleIt()) {
      return gocdSampleRequestor;
    } else {
      return gocdRequestor;
    }
  };

  var getCcTrayRequestor = function() {
    if(sampleIt()) {
      return ccTraySampleRequestor;
    } else {
      return ccTrayRequestor;
    }
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
    sampleIt: sampleIt,

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
exports.sampleIt = options.sampleIt;

exports.authInfo = options.authInfo;

exports.getHistoryRequestor = options.getHistoryRequestor;
exports.getCcTrayRequestor = options.getCcTrayRequestor;

exports.getCcTrayUrl = options.getCcTrayUrl;
exports.stageNameInPipeline = options.stageNameInPipeline;
