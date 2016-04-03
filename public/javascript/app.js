

var onlineJudgeApp = angular.module('onlineJudgeApp', [
  'ngRoute',
  'onlineJudgeControllers'
]);

onlineJudgeApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: 'error'
      }).
      otherwise({
        redirectTo: '/phones'
      });
  }]);
