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
    var url = options.url;
    if(url.indexOf('http') !== 0) {
      url = 'http://' + url;
    }
    return url;
  }

  var set = function(newOptions) {
    options = newOptions || {};
    options.url = addCredentialsToUrl(options.url);
    options.debug = options.debug === 'true' || options.debug === '1' || options.debug;
    console.log('SETTING OPTIONS', options);
  };

  var get = function() {
    return options || {};
  };

  var extend = function(additionalOptions) {
    options = _.extend(options || {}, additionalOptions);
  };

  var addCredentialsToUrl = function(url) {
    return addCredentialsToUrlInternal(url, options.user, options.password);
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
    return baseUrl() + '/go/api/pipelines/' + options.pipeline;
  };

  var getHistoryEndpoint = function() {
    return getPipelineBasePath() + '/history';
  };

  var getSnapHistoryEndpoint = function() {
    return 'https://'+ options.user +':' + options.key +
      '@api.snap-ci.com/project/' + options.user +
      '/' + options.pipeline + '/branch/master/pipelines';
  };

  var getSnapDetailsEndpoint = function(pipelineCounter) {
    return getSnapHistoryEndpoint() + '/' + pipelineCounter;
  };

  var getCcTrayUrl = function() {
    if(useSnap()) {
      return 'https://snap-ci.com/'+ options.user +'/' + options.pipeline + '/branch/master/cctray.xml';
    } else {
      var url = options.url + '/go/cctray.xml';
      if(url.indexOf('http') !== 0) {
        url = 'http://' + url;
      }
      return url;
    }
  };

  function addCredentialsToUrlInternal(url, user, password) {
    if(sampleIt()) {
      return 'sample';
    } else if (user && password) {
      var urlNoHttp = url.indexOf('http') === 0 ? url.substr('http://'.length) : url;
      return 'http://' + user + ':' + password + '@' + urlNoHttp;
    } else {
      return url;
    }
  }

  return {
    set: set,
    get: get,
    extend: extend,
    sampleIt: sampleIt,
    addCredentialsToUrl: addCredentialsToUrl,
    getHistoryRequestor: getHistoryRequestor,
    getCcTrayRequestor: getCcTrayRequestor,
    getGocdHistoryEndpoint: getHistoryEndpoint,
    getGocdPipelineBasePath: getPipelineBasePath,
    getSnapHistoryEndpoint: getSnapHistoryEndpoint,
    getSnapDetailsEndpoint: getSnapDetailsEndpoint,
    getCcTrayUrl: getCcTrayUrl
  };
};

var options = optionsModule();
exports.get = options.get;
exports.set = options.set;
exports.extend = options.extend;
exports.sampleIt = options.sampleIt;
exports.addCredentialsToUrl = options.addCredentialsToUrl;
exports.getHistoryRequestor = options.getHistoryRequestor;
exports.getCcTrayRequestor = options.getCcTrayRequestor;
exports.getGocdHistoryEndpoint = options.getGocdHistoryEndpoint;
exports.getGocdPipelineBasePath = options.getGocdPipelineBasePath;
exports.getSnapHistoryEndpoint = options.getSnapHistoryEndpoint;
exports.getSnapDetailsEndpoint = options.getSnapDetailsEndpoint;
exports.getCcTrayUrl = options.getCcTrayUrl;