
var Q = require('q');
var _ = require('lodash');
var request = require('request');
var logger = require('../logger');
var globalOptions = require('../options');

function snapCiRequestorModule() {

  function getSnapHistoryEndpoint(pipeline) {
    return '/' + (pipeline || options.pipeline) + '/branch/master/pipelines';
  }

  function getSnapDetailsEndpoint(pipelineCounter) {
    return getSnapHistoryEndpoint() + '/' + pipelineCounter;
  }

  var getPipelineDetails = function(pipelineCounter) {
    var defer = Q.defer();

    var detailsUrl = getSnapDetailsEndpoint(pipelineCounter);
    logger.debug('Requesting pipeline details', detailsUrl);

    request({ method: 'GET', url: detailsUrl },
      function (error, response, body) {
        if(error) {
          logger.error('ERROR requesting', detailsUrl, error);
          defer.reject();
        } else {
          defer.resolve(JSON.parse(body));
        }
      }
    );

    return defer.promise;
  };

  var getHistory = function(offset) {
    var defer = Q.defer();

    var historyPage = globalOptions.baseUrl() + getSnapHistoryEndpoint() + (offset ? '/' + offset : '');
    logger.debug('Requesting history', historyPage);

    request({ method: 'GET', url: historyPage },
        function (error, response, body) {
          if(error) {
            logger.error('ERROR requesting', historyPage, error);
            defer.reject();
          } else {
            defer.resolve(JSON.parse(body));
          }
        }
    );

    return defer.promise;
  };

  //application/vnd.snap-ci.com.v1+json
  var getPipelineNames = function() {
    var defer = Q.defer();
    defer.resolve([globalOptions.get().pipeline]);
    return defer.promise;
  };


  return {
    getHistory: getHistory,
    getPipelineDetails: getPipelineDetails,
    getPipelineNames: getPipelineNames
  };
}

var gocdRequestor = snapCiRequestorModule();
exports.getHistory = gocdRequestor.getHistory;
exports.getPipelineDetails = gocdRequestor.getPipelineDetails;
exports.getPipelineNames = gocdRequestor.getPipelineNames;
