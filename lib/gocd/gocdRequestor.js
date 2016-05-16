
var Q = require('q');
var _ = require('lodash');
var requestor = require('../requestor');
var xml2json = require('xml2json');
var logger = require('../logger');
var globalOptions = require('../options');

function gocdRequestorModule() {

  function baseUrl() {
    var url = globalOptions.get().url;
    if(url && url.indexOf('http') !== 0) {
      url = 'http://' + url;
    }
    return url;
  }

  function getGocdPipelineBasePath (pipeline) {
    return '/go/api/pipelines/' + (pipeline || globalOptions.get().pipeline);
  }

  function getGocdHistoryPath (pipeline) {
    return getGocdPipelineBasePath(pipeline) + '/history';
  }

  function getFromGocd (path) {

    if(path.indexOf('http') === 0) {
      path = path.replace(baseUrl(), '');
    }

    return requestor.getUrl(baseUrl() + path);
  }


  function requestAndXml2Json(path) {
    return getFromGocd(path).then(function (body) {
      var parsedResponse = xml2json.toJson(body, {
        object: true, sanitize: false
      });
      if (parsedResponse.html) {
        console.log('Error requesting', path);
        throw new Error('Unexpected HTML response: ' + body);
      } else {
        return parsedResponse;
      }

    }).fail(function(error) {
      console.log('ERROR reading or parsing Go.CD', error);
      return undefined;
    });

  }

  var getPipelineDetails = function(pipelineId, pipelineName) {
    var pipelineDetailsPath = getGocdPipelineBasePath(pipelineName) + '/' + pipelineId + '.xml';
    logger.debug('Requesting pipeline details', pipelineDetailsPath);
    return requestAndXml2Json(pipelineDetailsPath).then(function(json) {
      if(json && json.pipeline) {
        return json;
      } else {
        logger.error('unexpected data from pipeline details', pipelineDetailsPath, json);
        return undefined;
      }
    });
  };

  var getHistory = function(offset, pipelineName) {

    var historyPagePath = getGocdHistoryPath(pipelineName) + (offset ? '/' + offset : '');
    logger.debug('Requesting history', historyPagePath);

    return getFromGocd(historyPagePath).then(function (body) {
      return JSON.parse(body);
    }).fail(function(error) {
      console.log('ERROR getting Go.CD history', error);
      return undefined;
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
  };
}

var gocdRequestor = gocdRequestorModule();
exports.getHistory = gocdRequestor.getHistory;
exports.getPipelineDetails = gocdRequestor.getPipelineDetails;
exports.getPipelineNames = gocdRequestor.getPipelineNames;
