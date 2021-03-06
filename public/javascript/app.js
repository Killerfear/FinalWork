

var OJApp = angular.module('OJApp', [
  'ngAnimate',
  'angular-loading-bar',
  "ui.bootstrap",
  'ngRoute',
  'ngSanitize',
  'OJControllers',
  'OJDirective',
  'ui.bootstrap.datetimepicker',
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
  when('/contest/list', {
      templateUrl: '/views/contest-list',
      controller: 'contestlstCtrl'
  }).
  when('/contest/show/:contestId', {
    templateUrl: '/views/contest-show',
    controller: 'contestshowCtrl'
  }).
  when('/user/login', {
    templateUrl: '/views/user-login',
    controller: 'userloginCtrl'
  }).
  when('/user/signup', {
    templateUrl: '/views/user-signup',
    controller: 'usersignupCtrl'
  }).
  when('/status/list', {
    templateUrl: '/views/status-list',
    controller: 'statuslstCtrl'
  }).
  when('/admin/problem', {
    templateUrl: '/views/admin-problem',
    controller: 'adminproblemCtrl'
  }).
  when('/admin/contest', {
    templateUrl: '/views/admin-contest',
    controller: 'admincontestCtrl'
  }).
  when('/admin/problem/edit', {
    templateUrl: '/views/admin-problem-edit',
    controller: 'adminproblemeditCtrl'
  }).
  when('/admin/contest/edit', {
    templateUrl: '/views/admin-contest-edit',
    controller: 'admincontesteditCtrl'
  }).
  when('/admin/problem/data/:problemId', {
    templateUrl: '/views/admin-problem-data',
    controller: 'adminproblemdataCtrl'
  }).
  when('/user/profile', {
    templateUrl: '/views/user-profile/',
    controller: 'userprofileCtrl'
  }).
  when('/', {
    redirectTo: '/problem/list/'
  })
}]);
