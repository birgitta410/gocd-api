var Q = require('q');
var xml2json = require('xml2json');
var fs = require('fs');
var path = require('path');

function ccTrayRequestorMockModule() {

  var get = function() {

    var xml = fs.readFileSync(path.resolve(__dirname + '/testdata/', 'cctray.xml'));
    var json = xml2json.toJson(xml, {
      object: true, sanitize: false
    });

    return Q.resolve(json);
  };

  return {
    get: get
  };
};

var ccTrayRequestor = ccTrayRequestorMockModule();
exports.get = ccTrayRequestor.get;
