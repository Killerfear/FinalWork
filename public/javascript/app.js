

var OJApp = angular.module('OJApp', [
  "ui.bootstrap",
  'ngRoute',
  'OJControllers'
]);

OJApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/problem/list', {
        templateUrl: '/views/problem-list',
        controller: 'problemlstCtrl'
      }).
      when('/', {
        redirectTo: '/problem/list/'
      }).
      otherwise({
        redirectTo: '/'
      });
  }]);
