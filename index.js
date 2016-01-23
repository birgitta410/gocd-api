var _ = require('lodash');
var globalOptions = require('./lib/options');
var pipelineReader = require('./lib/gocd/pipelineFeedReader');
var ccTrayReader = require('./lib/cc/ccTrayReader');

GoCd = {

  getInstance : function(newOptions, type) {
    newOptions = newOptions || {};
    newOptions.type = type || 'GOCD';
    globalOptions.set(newOptions);

    var readData = function(filterByPipeline) {

      function enrichActivityWithHistory(history, activity) {

        function mapAuthorInitialsFromHistoryToActivity(activityStage, historyPipelineRun) {
          activityStage.initials = historyPipelineRun.summary && historyPipelineRun.summary.author? historyPipelineRun.summary.author.initials : undefined;
        }

        function moreAccurateJobStatus(activityStage, historyPipelineRun) {
          if(activityStage.activity === 'Building') {
            var historyStage = _.find(historyPipelineRun.stages, function(stage) {
              return stage.name === activityStage.name;
            });
            activityStage.gocdActivity = historyStage && historyStage.summary ? historyStage.summary.state : activityStage.activity;
          }
        }

        _.each(activity.stages, function(stage) {
          var historyWithSameKey = history[stage.buildNumber];
          if(historyWithSameKey) {
            mapAuthorInitialsFromHistoryToActivity(stage, historyWithSameKey);
            moreAccurateJobStatus(stage, historyWithSameKey);
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

      return pipelineReader.initFullCache().then(function() {
        return {
          readData: readData,
          pipelineNames: names
        };
      });

    });

  }

};

module.exports = GoCd;
