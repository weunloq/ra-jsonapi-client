'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/* eslint-disable linebreak-style */
/* eslint-disable import/prefer-default-export */
/* eslint-disable linebreak-style */
var getValue = exports.getValue = function getValue(object, path) {
  return path.replace(/\[/g, '.').replace(/\]/g, '.').split('.').reduce(function (o, k) {
    return (o || {})[k];
  }, object);
};