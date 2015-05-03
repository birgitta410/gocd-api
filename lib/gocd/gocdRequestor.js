
var Q = require('q');
var _ = require('lodash');
var request = require('request');
var xml2json = require('xml2json');
var logger = require('../logger');
var globalOptions = require('../options');

function gocdRequestorModule() {

  function requestAndXml2Json(url) {
    var defer = Q.defer();
    request(url, function (error, response, body) {
      try {

        var json = xml2json.toJson(body, {
          object: true, sanitize: false
        });

        if(json.pipeline) {
          defer.resolve(json);
        } else {
          logger.error('unexpected data from pipeline details', url, json);
          defer.resolve(undefined);
        }
      } catch(error) {
        logger.error('error parsing', url, error);
        defer.resolve(undefined);
      }

    });

    return defer.promise;
  }

  var getPipelineDetails = function(pipelineId) {
    var url = globalOptions.getPipelineBasePath() + '/' + pipelineId + '.xml';
    logger.debug('Requesting pipeline details', url);
    return requestAndXml2Json(url);
  };

  var getHistory = function(offset) {
    var defer = Q.defer();

    var historyPage = globalOptions.getHistoryEndpoint() + (offset ? '/' + offset : '');
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
};

var gocdRequestor = gocdRequestorModule();
exports.getHistory = gocdRequestor.getHistory;
exports.getPipelineDetails = gocdRequestor.getPipelineDetails;
