
var _ = require('lodash');
var moment = require('moment');
var globalOptions = require('../options');

function pipelineRun() {

  var FAILED = 'Failed';
  var PASSED = 'Passed';

  var PipelineRunCreator = {};

  PipelineRunCreator.createNew = function (runData) {

    var pipelineRun = runData;

    function mapPipelineFinishTime() {

      _.each(pipelineRun.stages, function(stage) {
        var lastScheduledJob = _.max(stage.jobs, function(job) { return job['scheduled_date']; });
        stage['last_scheduled'] = lastScheduledJob['scheduled_date'];
      });
      var lastFinishedStage = _.max(pipelineRun.stages, function (stage) {
        return stage['last_scheduled'];
      });
      pipelineRun['last_scheduled'] = lastFinishedStage['last_scheduled'];
    }

    function mapInfoText() {
      if (pipelineRun.info !== undefined) {
        return;
      }

      var changedMaterialRevision = _.find(pipelineRun['build_cause']['material_revisions'], 'changed');
      var lastCommitMaterial = changedMaterialRevision.modifications[0];

      var theCommit = lastCommitMaterial ? lastCommitMaterial.comment : 'Unknown change';
      var theTime = moment(pipelineRun['last_scheduled']).format('HH:mm:ss, MMMM Do YYYY');
      var theAuthor = pipelineRun.author ? pipelineRun.author.name : 'Unknown author';
      var theResult = pipelineRun.wasSuccessful() ? PASSED : 'Stage failed: ' + pipelineRun.stageFailed;
      pipelineRun.info = '[' + pipelineRun.label + '] ' + theResult + ' | ' + theAuthor + ' | ' + theCommit + ' | ' + theTime;

    }

    function mapPipelineAuthor() {

      if (pipelineRun.author !== undefined) {
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
            var firstLetter = namePart[0];
            if (notLastPart) {
              return onlyAtoZ(firstLetter);
            } else {
              return onlyAtoZ(firstLetter) + ( namePart.length > 1 ? onlyAtoZ(namePart[1]) : '' );
            }
          }).join('');


          return initials.toLowerCase().substr(0, 3);
        }
      }

      var buildCause = pipelineRun['build_cause'];
      var modifications = _.find(buildCause['material_revisions'], 'changed').modifications;
      var latestModification = _.max(modifications, function(mod) { return mod['modified_time']; });
      buildCause.committer = latestModification['user_name'];
      buildCause.comment = latestModification.comment;
      buildCause.revision = latestModification.revision;

      var authorText = buildCause.committer;

      var author = {
        email: authorText.substring(authorText.indexOf('<')).trim(),
        name: authorText.substring(0, authorText.indexOf('<')).trim()
      };
      author.initials = getInitialsOfAuthor(author.name);

      _.extend(pipelineRun, {
        author: author
      });

    }

    function mapPipelineResult() {

      var failedStages = _.where(pipelineRun.stages, function(run) {
        return run.result === FAILED;
      });

      if (failedStages.length > 0) {
        _.extend(pipelineRun, {
          result: FAILED,
          stageFailed: failedStages[0].name
        });
      } else {
        pipelineRun.result = PASSED;
      }
      pipelineRun.wasSuccessful = function () {
        return pipelineRun.result === PASSED;
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