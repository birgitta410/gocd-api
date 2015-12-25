
var Q = require('q');
var _ = require('lodash');
var request = require('request');
var logger = require('../logger');
var globalOptions = require('../options');
var snapToGoConverter = require('./snapToGoConverter');

function snapCiRequestorModule() {

  function baseApiUrl() {
    var options = globalOptions.get();
    return 'https://'+ options.user +':' + options.key + '@api.snap-ci.com/project/' + options.user;
  }

  function getSnapHistoryUrl(pipeline) {
    return baseApiUrl() + '/' + (pipeline || globalOptions.get().pipeline) + '/branch/master/pipelines';
  }

  function getSnapDetailsUrl(pipelineCounter) {
    return getSnapHistoryUrl() + '/' + pipelineCounter;
  }

  var getPipelineDetails = function(pipelineCounter) {
    var defer = Q.defer();

    try {
      var detailsUrl = getSnapDetailsUrl(pipelineCounter);
      logger.debug('Requesting pipeline details', detailsUrl);

      request({method: 'GET', url: detailsUrl},
        function (error, response, body) {
          if (error) {
            logger.error('ERROR requesting', detailsUrl, error);
            defer.reject();
          } else {
            defer.resolve(JSON.parse(body));
          }
        }
      );
    } catch(error) {
      defer.reject(error);
    }

    return defer.promise;
  };

  var getHistory = function(offset) {
    var defer = Q.defer();

    try {
      var historyPage = getSnapHistoryUrl() + (offset ? '/' + offset : '');
      logger.debug('Requesting history', historyPage);

      request({method: 'GET', url: historyPage},
        function (error, response, body) {
          if (error) {
            logger.error('ERROR requesting', historyPage, error);
            defer.reject();
          } else {
            //console.log("body", body);
            var parsedBody = JSON.parse(body);
            defer.resolve(snapToGoConverter.convert(parsedBody));
          }
        }
      );
    } catch(error) {
      defer.reject(error);
    }

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
