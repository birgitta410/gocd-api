
define(['lodash'], function (_) {

  var GO_PIPELINES_ENDPOINT = '/go/pipelines/';
  var GO_PIPELINES_DETAILS_ENDPOINT = '/go/tab/build/detail/';

  function parseParametersFromJobRunUrl(id) {
    if (id === undefined) return { };

    if(id.indexOf('build/detail') > -1) {
      return parseParametersFromJobDetailUrl(id);
    }

    // http://the-go-host:8153/go/pipelines/A-PIPELINE/1199/functional-test/1
    var parameterString = id.substring(id.indexOf(GO_PIPELINES_ENDPOINT) + GO_PIPELINES_ENDPOINT.length);
    var parameters = parameterString.split('/');
    return {
      pipeline: parameters[0],
      buildNumber: parameters[1],
      stageName: parameters[2],
      runNumber: parameters[3]
    };
  }

  function parseParametersFromJobDetailUrl(id) {
    // http://192.168.50.79:8153/go/tab/build/detail/artwise/36/build/1/randomlyFails
    var parameterString = id.substring(id.indexOf(GO_PIPELINES_DETAILS_ENDPOINT) + GO_PIPELINES_DETAILS_ENDPOINT.length);
    var parameters = parameterString.split('/');

    return {
      pipeline: parameters[0],
      buildNumber: parameters[1],
      stageName: parameters[2],
      runNumber: parameters[3],
      jobName: parameters[4]
    };
  }

  function parseAuthor(author) { // !!currently duplicated in ccTrayReader
    if(author !== undefined) {
      var authors = [].concat(author || []);
      var authorName = authors[authors.length - 1].name;

      var author = {};

      var emailIndex = authorName.indexOf('<');
      if (emailIndex > -1) {
        author.name = authorName.substr(0, emailIndex).trim();
        author.email = authorName.substr(emailIndex).trim();
      } else {
        author.name = authorName;
      }
      return {
        author: author
      };
    }
  }

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
      return link.type === 'application/vnd.go+xml' && link.href.indexOf('api/stages') > -1;
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
    result = _.extend(result, parseParametersFromJobRunUrl(data.id));
    result = _.extend(result, parseAuthor(data.author));
    result = _.extend(result, parseDetailsLink(data.link));
    return _.extend(result, parseResult(data.title));
  };

  return {
    withData: withData,
    parseParametersFromJobRunUrl: parseParametersFromJobRunUrl
  };

});
