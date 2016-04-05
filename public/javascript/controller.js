
var OJControllers = angular.module('OJControllers', []);

OJControllers.controller('paginationCtrl', ['$rootScope', '$scope',
  function($rootScope, $scope) {
    $scope.currentPage = $rootScope.currentPage = 1;
    $scope.setPage = function(pageNo) {
      $scope.currentPage = $rootScope.currentPage = pageNo;
      console.log('page currentPage', $rootScope.currentPage)
    };
    $rootScope.getItems();
    $scope.pageChanged = function() {
      $rootScope.currentPage = $scope.currentPage;
      console.log('pageChanged:', $scope.currentPage, $rootScope.currentPage);
      $rootScope.getItems();
    }
  }])


OJControllers.controller('userloginCtrl',
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
  });

OJControllers.controller('problemlstCtrl',
  function($scope, $http, $rootScope) {

    $rootScope.getItems = function() {
      $http.get('/problem/list/' + $rootScope.currentPage)
           .success(function(data) {
             $scope = _.assign($scope, data);
             $rootScope.totalItems = data.problemCount;
           })
           .error(function(err) {
             alert('错误:' + err)
           })
    };

  });

OJControllers.controller('problemshowCtrl',
  function($scope, $http, $routeParams, $uibModal, $window) {
    $scope.problem = {};
    $scope.problemId = $routeParams.problemId;
    console.log($routeParams.problemId);
    $http.get('/problem/data/' + $routeParams.problemId)
         .success(function(data) {
           $scope.problem = data.problem;
         })
         .error(function(err) {
           alert("错误" + err);
         })


    $scope.goToStatusList = function() {
      $window.location.href = '/#/status/list?problemId=' + $routeParams.problemId;
    }
    //Submit modal打开
    $scope.open = function(size) {
      var modalInstance = $uibModal.open({
        animation: true,
        templateUrl: 'submitModal.html',
        controller: 'submitModalCtrl',
        size: size,
        resolve: {
          problemId: function() {  return $scope.problemId; }
        }
      });

      modalInstance.result.then(function () {
        $scope.goToStatusList();
      });

    }
  });

OJControllers.controller('submitModalCtrl',
  function($scope, $uibModalInstance, $http, problemId) {
    $scope.isSubmitting = false;
    console.log($scope);
    console.log(problemId);
    $scope.ok = function() {
      $scope.isSubmitting = true;
      console.log(problemId);
      $http.post('/problem/submit', { srcCode: $scope.srcCode, problemId: problemId })
           .success(function(data) {
             $scope.isSubmitting = false;
             if (data.result == 'success') {
               $uibModalInstance.close();
             } else {
               alert(data)
             }
           })
           .error(function(err) {
             $scope.isSubmitting = false;
             alert("错误" + err)
           })
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss('cancel');
    }
  });
