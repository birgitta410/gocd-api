var Q = require('q');
var _ = require('lodash');
var moment = require('moment');
var pipelineRunCreator = require('./pipelineRun');
var globalOptions = require('../options');

function pipelineFeedReaderModule() {

  var CACHE;

  var clearCache = function() {
    CACHE = { };
  };
  clearCache();

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
      _.each(_.keys(CACHE[pipelineName].pipelineRuns), function(pipelineLabel) {
        var pipelineRun = CACHE[pipelineName].pipelineRuns[pipelineLabel];
        if(pipelineRun.summary.upstream) {
          var pipelineRuns = CACHE[pipelineRun.summary.upstream.pipelineName].pipelineRuns;
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

  function addStatistics() {

    function latestRunsWithResult(pipelineName, filter) {
      return _.chain(CACHE[pipelineName].pipelineRuns)
        .map(function(pipelineRun) {
          return {
            label: pipelineRun.label,
            lastScheduled: pipelineRun.summary.lastScheduled,
            result: pipelineRun.summary.result,
            wasSuccessful: pipelineRun.wasSuccessful
          };
        })
        .filter(function(pipelineResult) {
          return filter(pipelineResult);
        })
        .sortBy(function(pipelineResult) {
          return pipelineResult.lastScheduled;
        })
        .value();
    }

    _.each(_.keys(CACHE), function (pipelineName) {

      CACHE[pipelineName] = CACHE[pipelineName] || {};
      CACHE[pipelineName].statistics = CACHE[pipelineName].statistics || {};

      var passedRunsWithTime = latestRunsWithResult(pipelineName, function(pipelineInfo) {
        return pipelineInfo.wasSuccessful();
      });
      var failedRunsWithTime  = latestRunsWithResult(pipelineName, function(pipelineInfo) {
        return ! pipelineInfo.wasSuccessful();
      });

      var lastSuccessfulRun = _.last(passedRunsWithTime);
      var lastFailedRun = _.last(failedRunsWithTime);
      if (lastSuccessfulRun === undefined) {
        CACHE[pipelineName].statistics.timeSinceLastSuccess = {
          human: 'never',
          milliSeconds: 'never'
        };
      } else {

        var lastSuccessfulTime = lastSuccessfulRun.lastScheduled;
        var lastFailedTime = lastFailedRun ? lastFailedRun.lastScheduled : 0;

        var passedSinceLastFailed = latestRunsWithResult(pipelineName, function(pipelineInfo) {
          return pipelineInfo.wasSuccessful() && pipelineInfo.lastScheduled > lastFailedTime;
        });

        CACHE[pipelineName].statistics.timeSinceLastSuccess = {
          human: moment(lastSuccessfulTime).fromNow(),
          milliSeconds: lastSuccessfulTime
        };
        CACHE[pipelineName].statistics.runsSinceLastFailure = passedSinceLastFailed.length;
      }

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
      } else {
        return json;
      }

    });

  };

  var initFullHistoryCache = function(pipelineNames) {

    console.log("CACHING FULL HISTORY for ", pipelineNames);
    var pipelineRefreshes = _.map(pipelineNames, function (pipelineName) {
      CACHE[pipelineName] = CACHE[pipelineName] || {};
      CACHE[pipelineName].pipelineRuns = CACHE[pipelineName].pipelineRuns || {};
      return refreshHistoryForPipeline({ pipelineName: pipelineName });
    });

    return Q.all(pipelineRefreshes).then(function() {
      updateSummaryWithDependencies();
      addStatistics();
    });

  };

  var refreshHistoryForPipeline = function (options, originalDefer) {
    var pipelineName = options.pipelineName;
    var offset = options.offset;
    var maxNumberOfPages = options.maxNumberOfPages;

    var defer = originalDefer || Q.defer();

    requestHistoryAndDetails(offset, pipelineName).then(function (result) {
      function fillCache(runEntry) {

        CACHE[pipelineName] = CACHE[pipelineName] || {};
        var pipelineInCache = CACHE[pipelineName].pipelineRuns && CACHE[pipelineName].pipelineRuns[runEntry.label];

        var cacheIsNewerThanRunEntry = pipelineInCache && CACHE[pipelineName].pipelineRuns[runEntry.label]['natural_order'] > runEntry['natural_order'];
        if(cacheIsNewerThanRunEntry) {
          return;
        }

        if(! pipelineInCache) {
          CACHE[pipelineName].pipelineRuns = CACHE[pipelineName].pipelineRuns || {};
          var pipelineRun = pipelineRunCreator.pipelineRun.createNew(runEntry);
          CACHE[pipelineName].pipelineRuns[runEntry.label] = pipelineRun;

        } else {
          [CACHE[pipelineName].pipelineRuns[runEntry.label].update(runEntry)];
        }
      }

      function continueToNextPageOrResolve() {
        var cacheSize = CACHE[pipelineName] ? _.keys(CACHE[pipelineName].pipelineRuns).length : 0;
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

      if(result !== undefined) {
        _.each(result.pipelines, fillCache);
        continueToNextPageOrResolve();
      }

    }).done();

    return defer.promise;

  };

  var readHistory = function(options) {
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

      addStatistics();
      return {
        pipelineRuns: CACHE[options.pipeline] ? excludeSpecificRuns(CACHE[options.pipeline].pipelineRuns) : {},
        statistics: CACHE[options.pipeline] ? CACHE[options.pipeline].statistics : {}
      };

    });

  };

  return {
    initFullCache: initFullHistoryCache,
    readHistory: readHistory,
    clear: clearCache
  };

}

var pipelineFeedReader = pipelineFeedReaderModule();
module.exports.initFullCache = pipelineFeedReader.initFullCache;
module.exports.readHistory = pipelineFeedReader.readHistory;
module.exports.clear = pipelineFeedReader.clear;
