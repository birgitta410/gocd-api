var Q = require('q');
var _ = require('lodash');
var pipelineRunCreator = require('./pipelineRun');
var globalOptions = require('../options');

function pipelineFeedReaderModule() {

  var CACHE = { };
  var MIN_NUMBER_PIPELINE_RUNS = 25;

  function addChangedFilesToData(pipelineJson, pipelineDetails) {
    _.each(pipelineDetails, function (detail) {

      if(detail !== undefined && detail.pipeline !== undefined) {
        var pipelineDataToExtend = _.find(pipelineJson.pipelines, function (pipeline) {
          return pipeline.label === detail.pipeline.label + '';
        });

        if (pipelineDataToExtend) {
          function extractChangeSets(pipelineDetail) { // because stupid xml2json
            var materials = [].concat(pipelineDetail.materials.material);
            return _.flatten(_.map(materials, function (m) {
              var allModifications = m ? [].concat(m.modifications) : [];
              return _.map(allModifications, function (mod) {
                return [].concat(mod.changeset);
              });
            }));
          }

          pipelineDataToExtend['build_cause'].files = _.flatten(_.pluck(extractChangeSets(detail.pipeline), 'file'));

        }
      }
    });
  }

  function updateSummaryWithDependencies() {
    _.each(_.keys(CACHE), function(pipelineName) {
      _.each(_.keys(CACHE[pipelineName]), function(pipelineLabel) {
        var pipelineRun = CACHE[pipelineName][pipelineLabel];
        if(pipelineRun.summary.upstream) {
          var upstreamRun = CACHE[pipelineRun.summary.upstream.pipelineName][pipelineRun.summary.upstream.pipelineLabel];
          pipelineRun.summary.withMaterialRevision(upstreamRun.findChangedMaterialRevision());
        }
      });
    });
  }

  var requestStages = function (offset, pipelineName) {
    return globalOptions.getHistoryRequestor().getHistory(offset, pipelineName).then(function(json) {
      if(json !== undefined) {
        var detailsPromises = _.map(json.pipelines, function (pipelineData) {
          return globalOptions.getHistoryRequestor().getPipelineDetails(pipelineData.id || pipelineData.counter, pipelineName);
        });
        return Q.all(detailsPromises).then(function (details) {
          addChangedFilesToData(json, details);
          return json;
        });
      }

    });

  };

  var refreshData = function() {
    return globalOptions.getHistoryRequestor().getPipelineNames().then(function (pipelineNames) {

      var pipelineRefreshes = _.map(pipelineNames, function (pipelineName) {
        CACHE[pipelineName] = CACHE[pipelineName] || {};
        return refreshDataForPipeline(pipelineName);
      });

      return Q.all(pipelineRefreshes);
    });
  };

  var refreshDataForPipeline = function (pipelineName, offset, originalDefer) {

    var defer = originalDefer || Q.defer();

    requestStages(offset, pipelineName).then(function (result) {
      function fillCache(runEntry) {

        if(! CACHE[pipelineName][runEntry.label]) {
          var pipelineRun = pipelineRunCreator.pipelineRun.createNew(runEntry);
          CACHE[pipelineName][runEntry.label] = pipelineRun;

        } else {
          [CACHE[pipelineName][runEntry.label].update(runEntry)];
        }
      }

      function continueToNextPageOrResolve() {

        var cacheSize = _.keys(CACHE[pipelineName]).length;
        var needsNextPage = result.pagination !== undefined
            && result.pagination.total > cacheSize
            && cacheSize < MIN_NUMBER_PIPELINE_RUNS
            && result.pipelines.length > 0;
        if (needsNextPage) {
          var nextOffset = result.pagination.offset + result.pagination['page_size'];
          refreshDataForPipeline(pipelineName, nextOffset, defer);
        } else {
          defer.resolve();
        }

      }

      _.each(result.pipelines, fillCache);

      updateSummaryWithDependencies();

      continueToNextPageOrResolve();

    }).done();

    return defer.promise;

  };

  var readPipelineRuns = function(options) {
    options = options || {};
    options.exclude = options.exclude || [];

    if(! options.pipeline) {
      throw new Error('Cannot determine which pipeline data to return. Please provide pipeline name');
    }

    function excludeSpecificRuns(pipelineRuns) {
      return _.omit(pipelineRuns, function (value, key) {
        return _.contains(options.exclude, key);
      });
    }

    return excludeSpecificRuns(CACHE[options.pipeline]);

  };

  var clearCache = function() {
    CACHE = {};
  };

  return {
    refreshData: refreshData,
    readPipelineRuns: readPipelineRuns,
    clear: clearCache
  };

}

var pipelineFeedReader = pipelineFeedReaderModule();
module.exports.refreshData = pipelineFeedReader.refreshData;
module.exports.readPipelineRuns = pipelineFeedReader.readPipelineRuns;
module.exports.clear = pipelineFeedReader.clear;
