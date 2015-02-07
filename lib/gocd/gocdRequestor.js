
var Q = require('q');
var _ = require('lodash');
var request = require('request');
var xml2json = require('xml2json');
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

  function pipelineDetailsPath(pipelineId) {
    var base = '/go/api/pipelines/' + globalOptions.get().pipeline;
    return base + '/' + pipelineId + '.xml';
  }

  function requestAndXml2Json(url) {
    var defer = Q.defer();
    request(url, function (error, response, body) {
      var json = xml2json.toJson(body, {
        object: true, sanitize: false
      });
      defer.resolve(json);
    });

    return defer.promise;
  }

  var getPipelineDetails = function(pipelineId) {
    var url = baseUrl() + pipelineDetailsPath(pipelineId);
    logger.debug('Requesting pipeline details', url);
    return requestAndXml2Json(url);
  };

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
    getHistory: getHistory,
    getPipelineDetails: getPipelineDetails
  }
};

var gocdRequestor = gocdRequestorModule();
exports.getHistory = gocdRequestor.getHistory;
exports.getPipelineDetails = gocdRequestor.getPipelineDetails;
