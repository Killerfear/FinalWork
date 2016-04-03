
var onlineJudgeControllers = angular.module('onlineJudgeControllers', []);

onlineJudgeControllers.controller('loginCtrl', ['$scope', '$http', '$location',
  function($scope, $http, $location) {
    $scope.isLoginError = false;
    $scope.loginError = "";
    $scope.isSubmitting = false;

    $scope.login = function() {
      $scope.isSubmitting = true;
      var loginInfo = {
        userName: $scope.username,
        password: $scope.password
      }
      $http.post('/login', loginInfo)
        .success(function(data) {
          if (data.result == 'success') {
            $window.location.href='problemset'
          } else if (data.result == 'fail') {
            $scope.isSubmitting = false;
            $scope.isLoginError = true;
            $scope.loginError = data.loginError;
          }
        })
        .error(function(err) {
          $scope.isSubmitting = false;
          $scope.isLoginError = true;
          $scope.loginError = "登陆失败，请重新登录"
        });
    }
  }]);

onlineJudgeControllers.controller('problemlstCtrl', ['$scope', '$http',
  function($scope, $http) {
    $scope.$watch('page', function(newValue, oldValue) {
      $location.path('/problemset/list/' + newValue);
    })
    $scope.getProblems = function(page) {
      $scope.page = page;
      $http.get('/problemset/' + $scope.page)
           .success(function(data) {
             $scope.problems = data.problems;
           })
           .error(function(err) {
             alert('错误:', err)
           })
    }

  }]);
