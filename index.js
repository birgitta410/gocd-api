var _ = require('lodash');
var Q = require('q');
var globalOptions = require('./lib/options');
var pipelineReader = require('./lib/gocd/pipelineFeedReader');
var ccTrayReader = require('./lib/cc/ccTrayReader');

GoCd = {

  getInstance : function(newOptions, type) {
    newOptions = newOptions || {};
    newOptions.type = type || 'GOCD';
    globalOptions.set(newOptions);

    var pipelineNames;

    var readData = function(filterByPipeline) {

      if (!_.contains(pipelineNames, filterByPipeline)) {
        return Q.reject("Pipeline unknown: '" + filterByPipeline + "'");
      }

      function enrichActivityWithHistory(history, activity) {

        function findHistoryStage(historyPipelineRun, activityStage) {
          return _.find(historyPipelineRun.stages, function(stage) {
            return stage.name === activityStage.name;
          });
        }

        function mapAuthorInitialsFromHistoryToActivity(activityStage, historyPipelineRun) {
          activityStage.initials = historyPipelineRun.summary && historyPipelineRun.summary.author? historyPipelineRun.summary.author.initials : undefined;
        }

        function moreAccurateJobActivity(activityStage, historyPipelineRun) {
          if(activityStage.activity === 'Building') {
            var historyStage = findHistoryStage(historyPipelineRun, activityStage);
            activityStage.gocdActivity = historyStage && historyStage.summary ? historyStage.summary.state : activityStage.activity;
            activityStage.isBuilding = function() {
              return _.contains(['Assigned', 'Prepared', 'Building'], activityStage.gocdActivity);
            };
            activityStage.isScheduled = function() {
              return activityStage.gocdActivity === 'Scheduled';
            };
          }
        }

        function moreAccurateJobResult(activityStage, historyPipelineRun) {
          if(activityStage.lastBuildStatus === 'Failure') {
            var historyStage = findHistoryStage(historyPipelineRun, activityStage);
            if (historyStage.result === 'Cancelled') {
              activityStage.lastBuildStatus = 'Cancelled';
              activityStage.info2 = activityStage.info2.replace('Failure', 'Cancelled');
            }

          }
        }

        _.each(activity.stages, function(stage) {
          var historyWithSameKey = history[stage.buildNumber];
          if(historyWithSameKey) {
            mapAuthorInitialsFromHistoryToActivity(stage, historyWithSameKey);
            moreAccurateJobActivity(stage, historyWithSameKey);
            moreAccurateJobResult(stage, historyWithSameKey);
          }
        });

      }

      return ccTrayReader.readActivity(filterByPipeline).then(function(activity) {
        return pipelineReader.readPipelineRuns({ pipeline: filterByPipeline }).then(function(pipelineRuns) {

          enrichActivityWithHistory(pipelineRuns, activity);

          _.each(activity.stages, function(stage) {
            if(stage.gocdActivity === 'Scheduled' || stage.gocdActivity === 'Building') {
              delete pipelineRuns[stage.buildNumber];
            }
          });

          return {
            activity: activity,
            history: pipelineRuns
          };
        });

      });
    };


    return globalOptions.getHistoryRequestor().getPipelineNames().then(function(names) {
      pipelineNames = names;
      return pipelineReader.initFullCache();
    }).then(function() {
      return {
        readData: readData,
        pipelineNames: pipelineNames
      };
    }).fail(function(error) {
      console.log("ERROR creating gocd api instance", error);
    });


  }

};

module.exports = GoCd;
