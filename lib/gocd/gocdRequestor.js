
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
        return xml2json.toJson(body, {
          object: true, sanitize: false
        });
      } catch(error) {
        logger.error('error parsing', url, error);
        return undefined;
      }

    });

  }

  var getPipelineDetails = function(pipelineId) {
    var pipelineDetailsPath = globalOptions.getGocdPipelineBasePath() + '/' + pipelineId + '.xml';
    logger.debug('Requesting pipeline details', pipelineDetailsPath);
    return requestAndXml2Json(pipelineDetailsPath).then(function(json) {
      if(json.pipeline) {
        return json;
      } else {
        logger.error('unexpected data from pipeline details', url, json);
        return undefined;
      }
    });
  };

  var getHistory = function(offset) {

    var historyPagePath = globalOptions.getGocdHistoryPath() + (offset ? '/' + offset : '');
    logger.debug('Requesting history', historyPagePath);

    return requestor.get(historyPagePath).then(function (body) {
        return JSON.parse(body);
    });

  };

  var getPipelineNames = function() {
    var pipelinesPath = '/go/api/pipelines.xml';
    logger.debug('Requesting pipeline list', pipelinesPath);

    return requestAndXml2Json(pipelinesPath).then(function (data) {

      data.pipelines.pipeline = [].concat(data.pipelines.pipeline);
      
      return Q.all(_.map(data.pipelines.pipeline, function(pipeline) {
        return requestAndXml2Json(pipeline.href);
      })).then(function(details) {
        return _.map(details, function(detail) {
            return detail.feed.title;
        });
      });
    });
  };

  return {
    getHistory: getHistory,
    getPipelineDetails: getPipelineDetails,
    getPipelineNames: getPipelineNames
  }
};

var gocdRequestor = gocdRequestorModule();
exports.getHistory = gocdRequestor.getHistory;
exports.getPipelineDetails = gocdRequestor.getPipelineDetails;
exports.getPipelineNames = gocdRequestor.getPipelineNames;
