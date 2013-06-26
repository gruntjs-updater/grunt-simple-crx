/*
 * grunt-simple-crx
 * https://github.com/tombooth/grunt-simple-crx
 *
 * Derived from https://github.com/jed/crx
 *
 * Copyright (c) 2013 Tom Booth
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs'),
    crypto = require('crypto'),
    child = require('child_process');

function generatePublicKey(privateKey, callback) {
   var rsa = child.spawn("openssl", ["rsa", "-pubout", "-outform", "DER"]);

   rsa.stdout.on("data", function(data) {
     callback(null, data);
   });

   rsa.stdin.end(privateKey);
}

function generateSignature(zipContents, privateKey) {
   return new Buffer(
      crypto
         .createSign("sha1")
         .update(zipContents)
         .sign(privateKey),
      "binary"
   );
}

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('simple_crx', 'Your task description goes here.', function() {
    var options = this.options({}),
        done = this.async(),
        privateKey,
        zipContents,
        signature;
    
    if (!fs.existsSync(options.src)) { done(new Error('Source zip file does not exist')); }
    if (!fs.existsSync(options.key)) { done(new Error('Private key does not exist')); }
    if (!options.dest) { done(new Error('Destination not defined')); }

    privateKey = fs.readFileSync(options.key);
    zipContents = fs.readFileSync(options.src);

    signature = generateSignature(zipContents, privateKey);
    
    generatePublicKey(privateKey, function(err, publicKey) {
       var keyLength = publicKey.length,
           sigLength = signature.length,
           zipLength = zipContents.length,
           crxLength = 16 + keyLength + sigLength + zipLength,
           crx = new Buffer(crxLength);

       crx.write("Cr24" + Array(13).join("\x00"), "binary");

       crx[4] = 2
       crx[8] = keyLength
       crx[12] = sigLength

       publicKey.copy(crx, 16)
       signature.copy(crx, 16 + keyLength)
       zipContents.copy(crx, 16 + keyLength + sigLength)

       fs.writeFileSync(options.dest, crx);

       done();
    });

  });

};
