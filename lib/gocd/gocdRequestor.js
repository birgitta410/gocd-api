
var Q = require('q');
var _ = require('lodash');
var requestor = require('../requestor');
var xml2json = require('xml2json');
var logger = require('../logger');
var globalOptions = require('../options');

function gocdRequestorModule() {

  function requestAndXml2Json(path) {
    return requestor.get(path).then(function (body) {
      try {

        var json = xml2json.toJson(body, {
          object: true, sanitize: false
        });

        if(json.pipeline) {
          return json;
        } else {
          logger.error('unexpected data from pipeline details', url, json);
          return undefined;
        }
      } catch(error) {
        logger.error('error parsing', url, error);
        return undefined;
      }

    });

  }

  var getPipelineDetails = function(pipelineId) {
    var url = globalOptions.getGocdPipelineBasePath() + '/' + pipelineId + '.xml';
    logger.debug('Requesting pipeline details', url);
    return requestAndXml2Json(url);
  };

  var getHistory = function(offset) {

    var historyPagePath = globalOptions.getGocdHistoryPath() + (offset ? '/' + offset : '');
    logger.debug('Requesting history', historyPagePath);

    return requestor.get(historyPagePath).then(function (body) {
        return JSON.parse(body);
    });

  };


  return {
    getHistory: getHistory,
    getPipelineDetails: getPipelineDetails
  }
};

var gocdRequestor = gocdRequestorModule();
exports.getHistory = gocdRequestor.getHistory;
exports.getPipelineDetails = gocdRequestor.getPipelineDetails;
