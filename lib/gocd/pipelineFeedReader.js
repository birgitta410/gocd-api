var Q = require('q');
var _ = require('lodash');
var pipelineRunCreator = require('./pipelineRun');
var globalOptions = require('../options');

function pipelineFeedReaderModule() {

  var CACHE = { };
  var MIN_NUMBER_PIPELINE_RUNS = 50;

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
          var pipelineRuns = CACHE[pipelineRun.summary.upstream.pipelineName];
          if(pipelineRuns === undefined) {
            console.log('Could not derive change info from upstream pipeline, maybe it was renamed?', JSON.stringify(pipelineRun.summary.upstream));
            return;
          }

          var upstreamRun = pipelineRuns[pipelineRun.summary.upstream.pipelineLabel];
          if(upstreamRun === undefined) {
            console.log('Could not derive change info from upstream pipeline, info is probably too far back in history', JSON.stringify(pipelineRun.summary.upstream));
          } else {
            pipelineRun.summary.withMaterialRevision(upstreamRun.findChangedMaterialRevision());
          }
        }
      });
    });
  }

  var requestHistoryAndDetails = function (offset, pipelineName) {
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

  var initFullHistoryCache = function(pipelineNames) {

    console.log("CACHING FULL HISTORY for ", pipelineNames);
    var pipelineRefreshes = _.map(pipelineNames, function (pipelineName) {
      CACHE[pipelineName] = CACHE[pipelineName] || {};
      return refreshHistoryForPipeline({ pipelineName: pipelineName });
    });

    return Q.all(pipelineRefreshes).then(function() {
      updateSummaryWithDependencies();
    });

  };

  var refreshHistoryForPipeline = function (options, originalDefer) {
    var pipelineName = options.pipelineName;
    var offset = options.offset;
    var maxNumberOfPages = options.maxNumberOfPages;

    var defer = originalDefer || Q.defer();

    requestHistoryAndDetails(offset, pipelineName).then(function (result) {
      function fillCache(runEntry) {

        if(! CACHE[pipelineName] || !CACHE[pipelineName][runEntry.label]) {
          CACHE[pipelineName] = CACHE[pipelineName] || {};
          var pipelineRun = pipelineRunCreator.pipelineRun.createNew(runEntry);
          CACHE[pipelineName][runEntry.label] = pipelineRun;

        } else {
          [CACHE[pipelineName][runEntry.label].update(runEntry)];
        }
      }

      function continueToNextPageOrResolve() {

        var cacheSize = _.keys(CACHE[pipelineName]).length;
        var pageNumber = result.pagination.offset + 1;
        var needsNextPage = result.pagination !== undefined
            && maxNumberOfPages ? pageNumber < maxNumberOfPages : true
            && result.pagination.total > cacheSize
            && cacheSize < MIN_NUMBER_PIPELINE_RUNS
            && result.pipelines.length > 0;
        if (needsNextPage) {
          var nextOffset = result.pagination.offset + result.pagination['page_size'];
          refreshHistoryForPipeline({ pipelineName: pipelineName, offset: nextOffset, maxNumberOfPages: maxNumberOfPages }, defer);
        } else {
          defer.resolve();
        }

      }

      _.each(result.pipelines, fillCache);

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

    return refreshHistoryForPipeline({ pipelineName: options.pipeline, offset: 0, maxNumberOfPages: 1}).then(function() {
      function excludeSpecificRuns(pipelineRuns) {
        return _.omit(pipelineRuns, function (value, key) {
          return _.contains(options.exclude, key);
        });
      }

      return excludeSpecificRuns(CACHE[options.pipeline]);
    });

  };

  var clearCache = function() {
    CACHE = {};
  };

  return {
    initFullCache: initFullHistoryCache,
    readPipelineRuns: readPipelineRuns,
    clear: clearCache
  };

}

var pipelineFeedReader = pipelineFeedReaderModule();
module.exports.initFullCache = pipelineFeedReader.initFullCache;
module.exports.readPipelineRuns = pipelineFeedReader.readPipelineRuns;
module.exports.clear = pipelineFeedReader.clear;
