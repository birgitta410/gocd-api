var requestor = require('../requestor');
var xml2json = require('xml2json');
var globalOptions = require('../options');

function ccTrayRequestorModule() {

  var get = function() {

    var ccTrayUrl = globalOptions.getCcTrayUrl();

    return requestor.getUrl(ccTrayUrl).then(function (body) {
      return xml2json.toJson(body, {
        object: true, sanitize: false
      });
    });

  };

  return {
    get: get
  };
}

var ccTrayRequestor = ccTrayRequestorModule();
exports.get = ccTrayRequestor.get;
