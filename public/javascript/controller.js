
var OJControllers = angular.module('OJControllers', []);

OJControllers.controller('navCtrl',
function($rootScope, $http, $scope, $window) {
  $http.get('/user/data')
       .success(function(data) {
         console.log("zzzz");
         $scope.isAdmin = $rootScope.isAdmin = data.isAdmin;
         $scope.username = $rootScope.username = data.username;
         if (data.username && data.username.length) {
           $scope.isLogin = $rootScope.isLogin = true;
         }
         console.log($rootScope);
       })
       .error(function(err) {
         alert("错误:" + err);
       })

  $scope.logout = function() {
    $http.get('/user/logout')
         .success(function(data) {
           if (data.result == "success") {
             $scope.isAdmin = $rootScope.isAdmin = false;
             $scope.username = $rootScope.username = null;
             $scope.isLogin = $rootScope.isLogin = false;
             $window.location.href = "/#/problem/list";
           } else {
             alert("失败:" + data.toString());
           }
         })
         .error(function(err) {
           alert("错误" + err);
         })
  }
})

OJControllers.controller('paginationCtrl',
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
})



OJControllers.controller('userloginCtrl',
function($scope, $http, $window) {
  $scope.isLoginError = false;
  $scope.loginError = "";
  $scope.isSubmitting = false;

  $scope.login = function() {
    $scope.isSubmitting = true;
    var loginInfo = {
      username: $scope.username,
      password: $scope.password
    }
    $http.post('/user/login', loginInfo)
    .success(function(data) {
      if (data.result == 'success') {
        $window.location.href='/#/problem/list'
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
function($scope, $rootScope, $http, $routeParams, $uibModal, $window) {
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

OJControllers.controller('statuslstCtrl',
function($scope, $uibModal, $http, $rootScope, $location) {
  $scope.solutions = [];
  $rootScope.currentPage = 1;
  if (!$scope.query) $scope.query = $location.search();

  $scope.getItems = $rootScope.getItems = function() {
    var url = new URI('/status/search/' + $rootScope.currentPage).addSearch($scope.query).toString();
    console.log(url);
    $http.get(url)
    .success(function(data) {
      if (data.result == 'success') {
        $scope = _.assign($scope, _.omit(data, "result"));
        $scope.solutions = data.solutions;
        console.log($scope.solutions);
        $rootScope.totalItems = data.solutionCount;
      } else {
        alert('失败:' + data.toString);
      }
    })
    .error(function(err) {
      alert("错误:" + err);
    })
  }
  $scope.showCode = function(solutionId) {
    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'codeModal.html',
      controller: 'codeModalCtrl',
      resolve: {
        solutionId: function() {  return solutionId; }
      }
    });

    modalInstance.result.then(function () {
      $scope.goToStatusList();
    });

  }
})

OJControllers.controller('codeModalCtrl',
function($scope, $uibModalInstance, $http, solutionId) {
  console.log(solutionId);
  $http.get('/status/code/' + solutionId)
  .success(function(data) {
    $scope.srcCode = data.srcCode;
  })
  .error(function(err) {
    console.log("错误:" + err)
  })
});
