
var _ = require('lodash');
var moment = require('moment');
var globalOptions = require('../options');

var pipelineRun = (function() {

  var FAILED = 'failed';
  var PASSED = 'passed';

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

      summary.wasSuccessful = function() {
        return summary.result && summary.result.toLowerCase() === PASSED;
      };

      summary.withFinishTime = function(finishTime) {
        summary.lastScheduled = finishTime;
        return withScheduledText(moment(summary.lastScheduled).format('HH:mm:ss, MMMM Do YYYY'));
      };

      summary.withMaterialRevision = function(materialRevision) {
        if (summary.author === undefined) {

          summary.author = {};
          summary.changeInfo = {};

          summary.changeInfo.committer = materialRevision['user_name'];
          summary.changeInfo.comment = materialRevision.comment;
          summary.changeInfo.revision = materialRevision.revision;

          var authorText = summary.changeInfo.committer;

          summary.author.email = authorText.substring(authorText.indexOf('<')).trim();
          summary.author.name = authorText.substring(0, authorText.indexOf('<')).trim();
          summary.author.initials = getInitialsOfAuthor(summary.author.name);
        }

        var theCommit = materialRevision ? materialRevision.comment : 'Unknown change';
        var theAuthor = summary.author ? summary.author.name : 'Unknown author';
        return withChangeText(theAuthor + ' | ' + theCommit);

      };

      summary.withFailedStage = function(failedStageName) {
        if(failedStageName !== undefined) {
          summary.result = FAILED;
          summary.stageFailed = failedStageName;
        } else {
          summary.result = PASSED;
        }
        return withResultText(summary.stageFailed ?  'Stage failed: ' + summary.stageFailed : PASSED);
      };

      return summary;

    })();

    pipelineRun.wasSuccessful = pipelineRun.summary.wasSuccessful;

    function findPipelineFinishTime() {
      return _.max(_.map(pipelineRun.stages, function(stage) {
        return _.max(stage.jobs, 'scheduled_date')['scheduled_date'];
      }));
    }

    function findLatestModificationInBuildCause() {
      var changedMaterialRevision = _.find(pipelineRun['build_cause']['material_revisions'], 'changed')
        || _.first(pipelineRun['build_cause']['material_revisions']); // Might have been triggered manually, in that case fall back to the first one

      if(changedMaterialRevision) {
        return _.max(changedMaterialRevision.modifications, function(mod) { return mod['modified_time']; });
      }
    }

    function findFailedStageName() {

      var failedStages = _.where(pipelineRun.stages, function(stageRun) {
        return stageRun.result && stageRun.result.toLowerCase() === FAILED;
      });

      if (failedStages.length > 0) {
        return failedStages[0].name;
      }

    }

    function updateSummary() {
      pipelineRun.summary
        .withFailedStage(findFailedStageName())
        .withFinishTime(findPipelineFinishTime())
        .withMaterialRevision(findLatestModificationInBuildCause());
    }

    function update(runData) {

      pipelineRun.stages = runData.stages;
      updateSummary();
    }

    function init() {
      updateSummary();
    }

    pipelineRun.update = update;

    init(runData);
    return pipelineRun;

  };

  return PipelineRunCreator;

})();

exports.pipelineRun = pipelineRun;
