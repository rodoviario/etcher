/*
 * Copyright 2016 Resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * @module Etcher.image-writer
 */

const angular = require('angular');
const electron = require('electron');

if (window.mocha) {
  var writer = electron.remote.require(require('path').join(__dirname, '..', '..', 'src', 'writer'));
} else {
  var writer = electron.remote.require('./src/writer');
}

const MODULE_NAME = 'Etcher.image-writer';
const imageWriter = angular.module(MODULE_NAME, [
  require('../models/settings'),
  require('../utils/notifier/notifier')
]);

imageWriter.service('ImageWriterService', function($q, $timeout, SettingsModel, NotifierService) {
  let self = this;
  let flashing = false;

  /**
   * @summary Reset flash state
   * @function
   * @public
   *
   * @example
   * ImageWriterService.resetState();
   */
  this.resetState = function() {
    self.state = {
      progress: 0,
      speed: 0
    };
  };

  /**
   * @summary Flash progress state
   * @type Object
   * @public
   */
  this.state = {};
  this.resetState();

  /**
   * @summary Check if currently flashing
   * @function
   * @private
   *
   * @returns {Boolean} whether is flashing or not
   *
   * @example
   * if (ImageWriterService.isFlashing()) {
   *   console.log('We\'re currently flashing');
   * }
   */
  this.isFlashing = function() {
    return flashing;
  };

  /**
   * @summary Set the flashing status
   * @function
   * @private
   *
   * @description
   * This function is extracted for testing purposes.
   *
   * @param {Boolean} status - flashing status
   *
   * @example
   * ImageWriterService.setFlashing(true);
   */
  this.setFlashing = function(status) {
    flashing = Boolean(status);
  };

  /**
   * @summary Perform write operation
   * @function
   * @private
   *
   * @description
   * This function is extracted for testing purposes.
   *
   * @param {String} image - image path
   * @param {Object} drive - drive
   * @param {Function} onProgress - in progress callback (state)
   *
   * @returns {Promise}
   *
   * @example
   * ImageWriter.performWrite('path/to/image.img', {
   *   device: '/dev/disk2'
   * }, function(state) {
   *   console.log(state.percentage);
   * });
   */
  this.performWrite = function(image, drive, onProgress) {
    return $q.when(writer.writeImage(image, drive, SettingsModel.data, onProgress));
  };

  /**
   * @summary Flash an image to a drive
   * @function
   * @public
   *
   * @description
   * This function will update `ImageWriterService.state` with the current writing state.
   *
   * @param {String} image - image path
   * @param {Object} drive - drive
   *
   * @returns {Promise}
   *
   * @example
   * ImageWriterService.flash('foo.img', {
   *   device: '/dev/disk2'
   * }).then(function() {
   *   console.log('Write completed!');
   * });
   */
  this.flash = function(image, drive) {
    if (self.isFlashing()) {
      return $q.reject(new Error('There is already a flash in progress'));
    }

    self.setFlashing(true);

    return self.performWrite(image, drive, function(state) {

      // Safely bring the state to the world of Angular
      $timeout(function() {

        self.state = {
          type: state.type,
          progress: Math.floor(state.percentage),

          // Transform bytes to megabytes preserving only two decimal places
          speed: Math.floor(state.speed / 1e+6 * 100) / 100 || 0
        };

        NotifierService.emit('image-writer:state', self.state);
      });

    }).finally(function() {
      self.setFlashing(false);
    });
  };

});

module.exports = MODULE_NAME;
