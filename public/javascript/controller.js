
var OJControllers = angular.module('OJControllers', []);

OJControllers.controller('loginCtrl', ['$scope', '$http', '$location',
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

OJControllers.controller('problemlstCtrl', ['$scope', '$http', '$rootScope',
  function($scope, $http, $rootScope) {

    $rootScope.getItems = function() {
      $http.get('/problem/list/' + $rootScope.currentPage)
           .success(function(data) {
             $scope = _.assign($scope, data);
             $rootScope.totalItems = data.problemCount;
           })
           .error(function(err) {
             alert('错误:', err)
           })
    };

  }]);

OJControllers.controller('paginationCtrl', ['$rootScope', '$scope',
  function($rootScope, $scope) {
    $rootScope.currentPage = 1;
    $scope.setPage = function(pageNo) {
      $rootScope.currentPage = pageNo;
      console.log('page currentPage', $rootScope.currentPage)
    };
    $rootScope.getItems();
    $scope.pageChanged = function(pageNo) {
      console.log('pageChanged:', pageNo);
      $rootScope.getItems();
      console.log($scope);
    }
  }])
