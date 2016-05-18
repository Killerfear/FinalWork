'use strict'

var OJDirective = angular.module('OJDirective', ['angularLoad']);

OJDirective.directive('ckeditor', function(angularLoad) {
  return {
    require: '?ngModel',
    link: function(scope, elm, attr, ngModel) {
      angularLoad.loadScript('ckeditor/ckeditor.js').then(function() {
        var ck = CKEDITOR.replace(elm[0]);

        if (!ngModel) return;

        ck.on('instanceReady', function() {
          ck.setData(ngModel.$viewValue);
        });

        function updateModel() {
          scope.$apply(function() {

            ngModel.$setViewValue(ck.getData());
          });
        }

        ck.on('pasteState', updateModel);
        ck.on('change', updateModel);
        ck.on('key', updateModel);

        ngModel.$render = function(value) {
          ck.setData(ngModel.$viewValue);
        };

      }).catch(function(err) {
        console.log("错误:" + err);
      });
    }
  };
});
