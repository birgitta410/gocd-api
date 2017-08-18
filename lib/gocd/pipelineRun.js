
var _ = require('lodash');
var moment = require('moment');
var globalOptions = require('../options');

var pipelineRun = (function() {

  var FAILED = 'failed';
  var PASSED = 'passed';
  var CANCELLED = 'cancelled';

  var PipelineRunCreator = {};

  PipelineRunCreator.createNew = function (runData) {

    var pipelineRun = runData;

    pipelineRun.summary = (function() {

      var summary = { };
      var changeText, resultText, scheduledText;

      function getInitialsOfAuthor(authorName) {

        function onlyAtoZ(character) {
          var isLetter = character.toLowerCase() >= "a" && character.toLowerCase() <= "z";
          if (!isLetter) {
            return 'x';
          } else {
            return character;
          }
        }

        if (authorName !== undefined) {
          var nameParts = authorName.split(' ');
          var initials = _.map(nameParts, function (namePart, index) {
            var notLastPart = index !== nameParts.length - 1;
            var firstLetter = namePart[0] || '?';
            if (notLastPart) {
              return onlyAtoZ(firstLetter);
            } else {
              return onlyAtoZ(firstLetter) + ( namePart.length > 1 ? onlyAtoZ(namePart[1]) : '' );
            }
          }).join('');

          return initials.toLowerCase().substr(0, 3);
        }
      }

      function updateText() {
        summary.text = '[' + pipelineRun.label + '] ' + resultText + ' | ' + changeText + ' | ' + scheduledText;
      }

      function withResultText(text) {
        resultText = text;
        updateText();
        return summary;
      }

      function withChangeText(text) {
        changeText = text;
        updateText();
        return summary;
      }

      function withScheduledText(text) {
        scheduledText = text;
        updateText();
        return summary;
      }

      var JOB_STATES_BY_SIGNIFICANCE = [
        'Building',
        'Scheduled',
        'Completed'
      ];

      summary.withStages = function(stages) {
        _.each(stages, function(stage) {
          stage.summary = stage.summary || {};
          var jobStates = _.map(stage.jobs, 'state');
          var stateThatTrumps = _.sortBy(jobStates, function(state) {
            return JOB_STATES_BY_SIGNIFICANCE.indexOf(state);
          })[0];
          stage.summary.state = stateThatTrumps;
        });
        return summary;
      };

      summary.wasSuccessful = function() {
        return summary.result && summary.result.toLowerCase() === PASSED;
      };

      summary.wasCancelled = function() {
        return summary.result && summary.result.toLowerCase() === CANCELLED;
      };

      summary.withFinishTime = function(finishTime) {
        summary.lastScheduled = finishTime;
        return withScheduledText(moment(summary.lastScheduled).format('HH:mm:ss, MMMM Do YYYY'));
      };

      summary.withMaterialRevision = function(materialRevision) {

        summary.author = summary.author || {};
        summary.changeInfo = summary.changeInfo || {};

        var latestModification = _.max(materialRevision.modifications, function(mod) { return mod['modified_time']; });

        function createChangeInfoAndAuthor() {
          summary.changeInfo.committer = latestModification['user_name'];
          summary.changeInfo.comment = latestModification.comment;
          summary.changeInfo.revision = latestModification.revision;

          var authorText = summary.changeInfo.committer;

          summary.author.email = authorText.substring(authorText.indexOf('<')).trim();
          summary.author.name = authorText.substring(0, authorText.indexOf('<')).trim();
          summary.author.initials = getInitialsOfAuthor(summary.author.name);

          var theCommit = latestModification ? latestModification.comment : 'Unknown change';
          var theAuthor = summary.author ? summary.author.name : 'Unknown author';
          return withChangeText(theAuthor + ' | ' + theCommit);
        }

        function rememberUpstreamInfoForLater() {
          var upstreamDependency = latestModification.revision; //A-PIPELINE/2066/smoke-test-dev/1
          var pathElements = upstreamDependency.split("/");
          summary.upstream = {
            pipelineName: pathElements[0],
            pipelineLabel: pathElements[1]
          };
          return summary;
        }

        if(materialRevision.material && materialRevision.material.type === 'Pipeline') {
          return rememberUpstreamInfoForLater();
        } else {
          return createChangeInfoAndAuthor();
        }

      };

      summary.withFilesChanged = function(files) {
        if(files == undefined) {
          return summary;
        }
        summary.changeInfo = summary.changeInfo || {};
        summary.changeInfo.numberOfFilesChanged = files.length;
        return summary;
      };

      summary.withNonSuccessfulStage = function(nonSuccessfulStage) {
        if(nonSuccessfulStage !== undefined) {
          summary.result = nonSuccessfulStage.result.toLowerCase();
          summary.stageNotSuccessful = nonSuccessfulStage.name;
        } else {
          summary.result = PASSED;
        }
        return withResultText(summary.stageNotSuccessful ?  'Stage ' + summary.result + ': ' + summary.stageNotSuccessful : PASSED);
      };

      return summary;

    })();

    pipelineRun.wasSuccessful = pipelineRun.summary.wasSuccessful;
    pipelineRun.wasCancelled = pipelineRun.summary.wasCancelled;

    function findPipelineFinishTime() {
      return _.maxBy(_.map(pipelineRun.stages, function(stage) {
        var max = _.maxBy(stage.jobs, 'scheduled_date');
        return max ? max.scheduled_date : undefined;
      }));
    }

    function findChangedMaterialRevision() {
      return _.find(pipelineRun['build_cause']['material_revisions'], 'changed')
        || _.first(pipelineRun['build_cause']['material_revisions']); // Might have been triggered manually, in that case fall back to the first one
    }

    function findNonSuccessfulStage() {

      var failedStages = _.filter(pipelineRun.stages, function(stageRun) {
        return stageRun.result && stageRun.result.toLowerCase() !== PASSED;
      });

      if (failedStages.length > 0) {
        return failedStages[0];
      }

    }

    function updateSummary() {
      pipelineRun.summary
        .withStages(pipelineRun.stages)
        .withNonSuccessfulStage(findNonSuccessfulStage())
        .withFinishTime(findPipelineFinishTime())
        .withMaterialRevision(findChangedMaterialRevision())
        .withFilesChanged(pipelineRun['build_cause'].files);
    }

    function update(runData) {

      pipelineRun.stages = runData.stages;
      updateSummary();
    }

    function init() {
      updateSummary();
    }

    pipelineRun.update = update;
    pipelineRun.findChangedMaterialRevision = findChangedMaterialRevision;

    init(runData);
    return pipelineRun;

  };

  return PipelineRunCreator;

})();

exports.pipelineRun = pipelineRun;
