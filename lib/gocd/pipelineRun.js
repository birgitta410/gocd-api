
var Q = require('q');
var _ = require('lodash');
var moment = require('moment');
var cheerio = require('cheerio');
var globalOptions = require('../options');
var logger = require('../logger');

function pipelineRun() {

  var DONE = 'DONE';

  var PipelineRunCreator = {};

  PipelineRunCreator.createNew = function (feedEntry) {

    var pipelineRun = {};
    pipelineRun.stages = [];
    pipelineRun.buildNumber = feedEntry.buildNumber;

    function mapPipelineFinishTime() {

      var lastFinishedStage = _.sortBy(pipelineRun.stages, function (stage) {
        return stage.updated;
      })[pipelineRun.stages.length - 1];
      pipelineRun.time = lastFinishedStage.updated;
    }

    function mapInfoText() {
      if (pipelineRun.info !== undefined) {
        return;
      }

      var lastCommitMaterial = _.first(pipelineRun.materials);

      var theCommit = lastCommitMaterial ? lastCommitMaterial.comment : 'Unknown change';
      var theTime = moment(pipelineRun.time).format('MMMM Do YYYY, h:mm:ss a');
      var theAuthor = pipelineRun.author ? pipelineRun.author.name : 'Unknown author';
      var theResult = pipelineRun.wasSuccessful() ? 'Success' : pipelineRun.stageFailed;
      pipelineRun.info = '[' + pipelineRun.buildNumber + '] ' + theTime + ' | ' + theResult + ' | ' + theCommit + ' | ' + theAuthor;

    }

    function getLatestRunsOfStages() {
      var stages = pipelineRun.stages;
      var allStageNames = _.unique(_.map(stages, function (stage) {
        return stage.stageName;
      }));
      return _.map(allStageNames, function (stageName) {
        var allEntriesForStage = _.where(stages, { 'stageName': stageName });
        allEntriesForStage = _.sortBy(allEntriesForStage, 'runNumber').reverse();
        return allEntriesForStage[0];
      });
    }

    function mapPipelineAuthor() {

      if (pipelineRun.author !== undefined) {
        return;
      }

      function getInitialsOfAuthor(author) {

        function onlyAtoZ(character) {
          var isLetter = character.toLowerCase() >= "a" && character.toLowerCase() <= "z";
          if (!isLetter) {
            return 'x';
          } else {
            return character;
          }
        }

        if (author.name !== undefined) {
          var nameParts = author.name.split(' ');

          var initials = _.map(nameParts, function (namePart, index) {
            if (index !== nameParts.length - 1) {
              return onlyAtoZ(namePart[0]);
            } else {
              return onlyAtoZ(namePart[0]) + onlyAtoZ(namePart[1]);
            }
          }).join('');

          return initials.toLowerCase().substr(0, 3);
        }
      }

      var firstStage = _.first(pipelineRun.stages);

      _.extend(pipelineRun, {
        author: firstStage.author
      });
      pipelineRun.author.initials = getInitialsOfAuthor(firstStage.author);

    }

    function mapPipelineResult() {

      var lastRuns = getLatestRunsOfStages();
      var failedStages = _.where(lastRuns, { result: 'failed' });

      if (failedStages.length > 0) {
        _.extend(pipelineRun, {
          result: 'failed',
          stageFailed: failedStages[0].stageName
        });
      } else {
        pipelineRun.result = 'passed';
      }
      pipelineRun.wasSuccessful = function () {
        return pipelineRun.result === 'passed';
      };

    }

    function promiseMaterialDetails() {

      function promiseCommitDetails() {

        if (pipelineRun.materials !== undefined) {
          return [];
        }

        function withoutTimestamp(data) {
          return data && data.indexOf('on 2') === -1 ? data : data.slice(0, data.indexOf('on 2')).trim();
        }

        function promiseMaterials(stageId) {
          return globalOptions.getGocdRequestor().getMaterialHtml(stageId).then(function (html) {
            var $ = cheerio.load(html);
            try {
              var changes = $('.material_tab .change');

              return _.map(changes, function (change) {
                var modifiedBy = withoutTimestamp($(change).find('.modified_by dd')[0].children[0].data);
                var comment = $(change).find('.comment p')[0].children[0].data;
                var sha = $(change).find('.revision dd')[0].children[0].data;
                return {
                  buildNumber: pipelineRun.buildNumber,
                  comment: comment,
                  committer: modifiedBy,
                  sha: sha
                };
              });

            } catch (error) {
              logger.error('ERROR loading material', error);
            }
          });
        }

        return promiseMaterials(pipelineRun.stages[0].id);

      }

      var commitDetailsPromises = promiseCommitDetails();
      return Q.all(commitDetailsPromises).then(function (details) {
        pipelineRun.materials = details;
        mapInfoText();

        return DONE;

      }, function (err) {
        logger.debug('could not resolve details, returning without |', pipelineRun.buildNumber, err);

        mapInfoText();
        return DONE;
      });
    };

    function findStageByName(stageName) {
      return _.find(pipelineRun.stages, { stageName: stageName });
    }

    function promiseStageDetails() {

      function promiseStageDetails() {
        var stageUrls = _.compact(_.map(getLatestRunsOfStages(), function(stage) {
          return stage.detailsLink;
        }));
        return _.map(stageUrls, function(stageUrl) {
          return globalOptions.getGocdRequestor().getStageRunDetails(stageUrl);
        });
      }

      function mapDetailsIntoStages(stageDetails) {
        _.each(stageDetails, function(stageDetails) {
          var stage = findStageByName(stageDetails.stage.name);
          if(stage !== undefined) {

            stage.jobs = _.map(stageDetails.stage.jobs, function(jobDetail) {
              return {
                name: jobDetail.job.name,
                result: jobDetail.job.result,
                state: jobDetail.job.state,
                properties: jobDetail.job.properties.property
              }
            });
          }
        });
        return pipelineRun.stages;
      }

      return Q.all(promiseStageDetails()).then(function (stageDetails) {
        mapDetailsIntoStages(stageDetails);
        return DONE;
      });

    };

    function promiseInitialise() {

      try {
        return addStage(feedEntry)
          .then(promiseMaterialDetails)
          .then(promiseStageDetails);

      } catch(err) {
        logger.error('Error initialising pipeline run', err);
      }

      return [  ];
    }

    function addStage(stageData) {
      pipelineRun.stages.push(stageData);

      mapPipelineFinishTime();
      mapPipelineResult();
      mapPipelineAuthor();

      return promiseStageDetails();

    }

    pipelineRun.promiseInitialise = promiseInitialise;
    pipelineRun.addStage = addStage;

    return pipelineRun;

  };

  return PipelineRunCreator;

};

exports.pipelineRun = pipelineRun();