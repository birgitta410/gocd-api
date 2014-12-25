
var Q = require('q');
var _ = require('lodash');
var request = require('request');
var logger = require('../logger');
var globalOptions = require('../options');

function gocdRequestorModule() {

  function baseUrl() {
    var url = globalOptions.get().url;
    if(url.indexOf('http') !== 0) {
      url = 'http://' + url;
    }
    return url;
  }

  function historyPath() {
    var base = '/go/api/pipelines/' + globalOptions.get().pipeline;
    return base + '/history';
  }

  var getHistory = function(offset) {
    var defer = Q.defer();

    var historyEndpoint = historyPath() + (offset ? '/' + offset : '');
    logger.debug('Requesting history', baseUrl() + historyEndpoint);

    request({ method: 'GET', url: baseUrl() + historyEndpoint },
        function (error, response, body) {
          if(error) {
            logger.error('ERROR requesting', url + historyPath().feedEndpoint, error);
            defer.reject();
          } else {
            defer.resolve(JSON.parse(body));
          }
        }
    );

    return defer.promise;
  };


  return {
    getHistory: getHistory
  }
};

var gocdRequestor = gocdRequestorModule();
exports.getHistory = gocdRequestor.getHistory;
