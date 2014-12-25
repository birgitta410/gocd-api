
var Q = require('q');
var _ = require('lodash');
var request = require('request');
var logger = require('../logger');
var globalOptions = require('../options');

function gocdRequestorModule() {

  function historyUrl() {
    var base = '/go/api/pipelines/' + globalOptions.get().pipeline;
    return base + '/history';
  }

  var getHistory = function(offset) {
    var defer = Q.defer();

    var url = globalOptions.get().url;
    var historyEndpoint = historyUrl() + (offset ? '/' + offset : '');
    logger.debug('Requesting history', url + historyEndpoint);

    request({ method: 'GET', url: url + historyEndpoint },
        function (error, response, body) {
          if(error) {
            logger.error('ERROR requesting', url + historyUrl().feedEndpoint, error);
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
