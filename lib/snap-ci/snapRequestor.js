
var Q = require('q');
var _ = require('lodash');
var request = require('request');
var logger = require('../logger');
var globalOptions = require('../options');

function gocdRequestorModule() {

  var getPipelineDetails = function(pipelineCounter) {
    var defer = Q.defer();

    var detailsUrl = globalOptions.getSnapDetailsEndpoint(pipelineCounter);
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

    var historyPage = globalOptions.getSnapHistoryEndpoint() + (offset ? '/' + offset : '');
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


  return {
    getHistory: getHistory,
    getPipelineDetails: getPipelineDetails
  }
}

var gocdRequestor = gocdRequestorModule();
exports.getHistory = gocdRequestor.getHistory;
exports.getPipelineDetails = gocdRequestor.getPipelineDetails;
