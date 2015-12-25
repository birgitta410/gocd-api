
var _ = require('lodash');
var moment = require('moment');
var globalOptions = require('../options');

function pipelineRun() {

  var FAILED = 'failed';
  var PASSED = 'passed';

  var PipelineRunCreator = {};

  PipelineRunCreator.createNew = function (runData) {

    var pipelineRun = runData;
    pipelineRun.summary = {};

    function mapPipelineFinishTime() {

      _.each(pipelineRun.stages, function(stage) {
        var lastScheduledJob = _.max(stage.jobs, function(job) { return job['scheduled_date']; });
        stage['last_scheduled'] = lastScheduledJob['scheduled_date'];
      });
      var lastFinishedStage = _.max(pipelineRun.stages, function (stage) {
        return stage['last_scheduled'];
      });
      pipelineRun.summary.lastScheduled = lastFinishedStage['last_scheduled'];
    }

    function findLatestModificationInBuildCause() {
      var changedMaterialRevision = _.find(pipelineRun['build_cause']['material_revisions'], 'changed')
        || _.first(pipelineRun['build_cause']['material_revisions']); // Might have been triggered manually, in that case fall back to the first one
        // TODO: Any chance to get the latest changed one from previous ones?
      if(changedMaterialRevision) {
        return _.max(changedMaterialRevision.modifications, function(mod) { return mod['modified_time']; });
      }
    }

    function mapInfoText() {
      if (pipelineRun.info !== undefined) {
        return;
      }

      var lastCommit = findLatestModificationInBuildCause();

      var theCommit = lastCommit ? lastCommit.comment : 'Unknown change';
      var theTime = moment(pipelineRun.summary.lastScheduled).format('HH:mm:ss, MMMM Do YYYY');
      var theAuthor = pipelineRun.summary.author ? pipelineRun.summary.author.name : 'Unknown author';
      var theResult = pipelineRun.wasSuccessful() ? PASSED : 'Stage failed: ' + pipelineRun.stageFailed;
      pipelineRun.info = '[' + pipelineRun.label + '] ' + theResult + ' | ' + theAuthor + ' | ' + theCommit + ' | ' + theTime;

    }

    function mapPipelineAuthor() {

      if (pipelineRun.summary.author !== undefined) {
        return;
      }

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

      var latestModification = findLatestModificationInBuildCause();

      var author = {};
      var changeInfo = {};
      if(latestModification) {
        changeInfo.committer = latestModification['user_name'];
        changeInfo.comment = latestModification.comment;
        changeInfo.revision = latestModification.revision;

        var authorText = changeInfo.committer;

        author.email = authorText.substring(authorText.indexOf('<')).trim();
        author.name = authorText.substring(0, authorText.indexOf('<')).trim();
        author.initials = getInitialsOfAuthor(author.name);
      } else {
        console.log('COULD NOT DETERMINE LATEST MODIFICATION');
        author.email = 'n/a';
        author.name = 'n/a';
        author.initials = 'XXX';
      }

      _.extend(pipelineRun.summary, {
        author: author,
        changeInfo: changeInfo
      });

    }

    function mapPipelineResult() {

      var failedStages = _.where(pipelineRun.stages, function(stageRun) {
        return stageRun.result && stageRun.result.toLowerCase() === FAILED;
      });

      if (failedStages.length > 0) {
        _.extend(pipelineRun.summary, {
          result: FAILED,
          stageFailed: failedStages[0].name
        });
      } else {
        pipelineRun.summary.result = PASSED;
      }
      pipelineRun.wasSuccessful = function () {
        return pipelineRun.summary.result && pipelineRun.summary.result.toLowerCase() === PASSED;
      };

    }

    function update(runData) {

      pipelineRun.stages = runData.stages;

      mapPipelineFinishTime();
      mapPipelineResult();
      mapInfoText();

    }

    function init() {
      mapPipelineAuthor();
      mapPipelineFinishTime();
      mapPipelineResult();
      mapInfoText();
    }


    pipelineRun.update = update;

    init(runData);
    return pipelineRun;

  };

  return PipelineRunCreator;

};

exports.pipelineRun = pipelineRun();
