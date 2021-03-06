/* global module: true */

var through = require('./through'),
    vinylFile = require('./vinylFile'),
    path = require('path'),
    slug = require('slug'),
    _ = require('lodash'),
    traverse = require('./traverse');

function yfm(headers, contents) {
  var res = '---\n';
  for(var k in headers) {
    if (headers.hasOwnProperty(k)) {
      res += k + ': ' + JSON.stringify(headers[k]) + '\n';
    }
  }
  res += '---\n\n';
  return res + (contents || '');
}

function extractHeaders(obj) {
  var res = {};
  res.title = obj.fullname;
  res.name = obj.name;
  res.type = obj.ngdoc || obj.type;
  res.src = obj.src;
  res.path = obj.path;
  return res;
}

function makePath(node, ext) {
  return node.path + ext;
}

var renderers = {
  module: function(node) {
    return yfm(extractHeaders(node), node.description);
  }
};

module.exports = function() {
  return through(function(obj, enc, done) {
  
    if (obj.path) { this.push(obj); return done(); }
    if (obj.type !== 'docgenTree') { return done(); }

    var self = this;

    if (!obj.tree) {
      done(new Error('tree not generated by previous processors'));
    }

    traverse(obj.tree, function(node) {
      var renderer = renderers[node.type];
      if (renderer) {
        var rendered = renderer(node);
        if (rendered) {
          var dest = makePath(node, '.md');
          self.push(vinylFile(dest, rendered));
        }
      }
    });

    done();
  });
};