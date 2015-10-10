var _ = require('lodash');
var gocdRequestor = require('./gocd/gocdRequestor');
var gocdSampleRequestor = require('./gocd/gocdSampleRequestor');
var snapRequestor = require('./snap-ci/snapRequestor');
var snapSampleRequestor = require('./snap-ci/snapSampleRequestor');
var ccTrayRequestor = require('./cc/ccTrayRequestor');
var ccTraySampleRequestor = require('./cc/ccTraySampleRequestor');

function optionsModule() {
  var options = {};

  function baseUrl() {
    if(useSnap()) {
      // return 'https://snap-ci.com/'+ options.user +'/';
      return 'https://'+ options.user +':' + options.key + '@api.snap-ci.com/project/' + options.user;
    }

    var url = options.url;
    if(url && url.indexOf('http') !== 0) {
      url = 'http://' + url;
    }
    return url;
  }

  function authInfo() {
    return options.user ? {
      user: options.user,
      password: options.password || options.key
    } : undefined;
  }

  var set = function(newOptions) {
    options = newOptions || {};
    options.debug = options.debug === 'true' || options.debug === '1' || options.debug;
    console.log('SETTING OPTIONS', options);
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

  var useSnap = function() {
    return options !== undefined && options.type === 'SNAP';
  };

  var getHistoryRequestor = function() {
    if(useSnap()) {
      return getSnapRequestor();
    } else {
      return getGocdRequestor();
    }
  };

  var getGocdRequestor = function() {
    if(sampleIt()) {
      return gocdSampleRequestor;
    } else {
      return gocdRequestor;
    }
  };

  var getSnapRequestor = function() {
    if(sampleIt()) {
      return snapSampleRequestor;
    } else {
      return snapRequestor;
    }
  };

  var getCcTrayRequestor = function() {
    if(sampleIt()) {
      return ccTraySampleRequestor;
    } else {
      return ccTrayRequestor;
    }
  };

  var getPipelineBasePath = function() {
    return '/go/api/pipelines/' + options.pipeline;
  };

  var getHistoryPath = function() {
    return getPipelineBasePath() + '/history';
  };

  var getSnapHistoryEndpoint = function() {
    return '/' + options.pipeline + '/branch/master/pipelines';
  };

  var getSnapDetailsEndpoint = function(pipelineCounter) {
    return getSnapHistoryEndpoint() + '/' + pipelineCounter;
  };

  var getCcTrayPath = function() {
    if(useSnap()) {
      return '/' + options.pipeline + '/branch/master/cctray.xml';
    } else {
      return '/go/cctray.xml';
    }
  };

  return {
    set: set,
    get: get,
    extend: extend,
    sampleIt: sampleIt,

    baseUrl: baseUrl,
    authInfo: authInfo,

    getHistoryRequestor: getHistoryRequestor,
    getCcTrayRequestor: getCcTrayRequestor,
    getGocdHistoryPath: getHistoryPath,
    getGocdPipelineBasePath: getPipelineBasePath,
    getSnapHistoryEndpoint: getSnapHistoryEndpoint,
    getSnapDetailsEndpoint: getSnapDetailsEndpoint,
    getCcTrayPath: getCcTrayPath
  };
};

var options = optionsModule();
exports.get = options.get;
exports.set = options.set;
exports.extend = options.extend;
exports.sampleIt = options.sampleIt;

exports.baseUrl = options.baseUrl;
exports.authInfo = options.authInfo;

exports.getHistoryRequestor = options.getHistoryRequestor;
exports.getCcTrayRequestor = options.getCcTrayRequestor;

exports.getGocdHistoryPath = options.getGocdHistoryPath;
exports.getGocdPipelineBasePath = options.getGocdPipelineBasePath;
exports.getSnapHistoryEndpoint = options.getSnapHistoryEndpoint;
exports.getSnapDetailsEndpoint = options.getSnapDetailsEndpoint;
exports.getCcTrayPath = options.getCcTrayPath;
