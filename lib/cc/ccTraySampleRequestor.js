var Q = require('q');
var xml2json = require('xml2json');
var fs = require('fs');
var path = require('path');

function ccTraySampleRequestorModule() {

  var get = function() {

    var xml = fs.readFileSync(path.resolve(__dirname + '/sample/', 'cctray.xml'));
    var json = xml2json.toJson(xml, {
      object: true, sanitize: false
    });

    return Q.resolve(json);
  };

  return {
    get: get
  };
};

var ccTrayRequestor = ccTraySampleRequestorModule();
exports.get = ccTrayRequestor.get;
