

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
      when('/problem/show/:problemId', {
        templateUrl: '/views/problem-show',
        controller: 'problemshowCtrl'
      }).
      when('/user/login', {
        templateUrl: '/views/user-login',
        controller: 'userloginCtrl'
      })
    //  when('/', {
    //    redirectTo: '/problem/list/'
    //  })
  }]);
