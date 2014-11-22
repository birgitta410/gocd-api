var _ = require('lodash');
var utils = require('../utils');

function atomEntryParserModule() {

  function parseResult(title) {
    if (title === undefined) return { };

    // 'QEN(1197) stage build(1) Passed'
    var titleChunks = title.split(' ');
    var result = titleChunks[3].toLowerCase();

    return {
      result: result
    }
  }

  function parseDetailsLink(links) {
    if(links === undefined) return;

    var goXmlLink = _.find(links, function(link) {
      return link.type === 'application/vnd.go+xml' && link.href !== undefined && link.href.indexOf('api/stages') > -1;
    });
    return {
      detailsLink: goXmlLink.href
    };
  }

  var withData = function(data) {
    var result = {
      id: data.id,
      name: data.name,
      updated: data.updated
    }; // only expose the data we currently need
    result = _.extend(result, utils.parseParametersFromJobRunUrl(data.id));
    result = _.extend(result, parseDetailsLink(data.link));
    return _.extend(result, parseResult(data.title));
  };

  return {
    withData: withData
  };

};
var atomEntryParser = atomEntryParserModule();

exports.withData = atomEntryParser.withData;
