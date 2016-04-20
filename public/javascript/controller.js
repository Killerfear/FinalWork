
var OJControllers = angular.module('OJControllers', ['ngFileUpload']);

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


OJControllers.controller('adminproblemCtrl',
function($scope, $http, $rootScope, $uibModal) {
  $rootScope.getItems = function() {
    $http.get('/admin/problem/list/' + $rootScope.currentPage)
    .success(function(data) {
      $scope.problems = data.problems;
      $rootScope.totalItems = data.problemCount;
    })
    .error(function(err) {
      console.log("错误:" + err);
    })
  }

  $scope.open = function(title, problemId) {
    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'confirmModal.html',
      controller: 'confirmModalCtrl',
      resolve: {
        title: function() {  return title; }
      }
    });
    console.log("instance");

    modalInstance.result.then(function () {
      $http.get('/admin/problem/delete?problemId=' + problemId)
          .success(function(data) {
            _.remove($scope.problems, function(problem) { return problem.problemId == problemId; });
          })
          .error(function(err) {
            alert("错误:" + err);
          })
    });

  }
})

OJControllers.controller('confirmModalCtrl',
function($scope, $uibModalInstance, $http, title) {
  $scope.title = title;

  $scope.ok = function() {
    uibModalInstance.close();
  };

  $scope.cancel = function() {
    $uibModalInstance.dismiss();
  }
});

OJControllers.controller('adminproblemeditCtrl',
function($scope, $http, $location, $window) {
  var param = $location.search();
  var problemId = param.problemId;
  $scope.problem = { isHidden: true };
  if (problemId) {
    $scope.pageTitle = 'Edit Problem'
    var url = '/admin/problem/data?problemId=' + problemId;
    console.log(url);
    $http.get(url)
    .success(function(data) {
      if (data.problem)
      $scope.problem = data.problem;
    })
    .error(function(err) {
      alert('错误：' + err);
    })
  } else {
    $scope.pageTitle = 'Add Problem';
  }

  $scope.visibles = [{ text: 'Visible', value: false }, { text: 'Invisible', value: true } ];
  $scope.submit = function() {
    if (!$scope.editor.$valid) return;
    console.log($scope.problem.description);
    if (!problemId) {
      //add Problem
      $http.post('/admin/problem/add', { problem: $scope.problem })
      .success(function(data){
        $window.location.href = '/#/admin/problem/';
      })
      .error(function(err){alert('错误:' + err); })
    } else {
      //update Problem

      $http.post('/admin/problem/update', { problem: $scope.problem })
      .success(function(data) {})
      .error(function(err) { alert('错误' + err); })
    }
  }
});

OJControllers.controller('adminproblemdataCtrl',
function($scope, $routeParams, $http, $uibModal, $window, Upload) {
  $scope.problemId = $routeParams.problemId;
  $scope.getDataList = function() {
    $http.get('/admin/problem/data/list?problemId=' + $scope.problemId)
         .success(function(data) {
           $scope.files = data.files;
         })
         .error(function(err) {
           alert("错误:" + err);
         })
  }

  // upload on file select or drop
  $scope.upload = function (file) {
    console.log(file);
    Upload.upload({
      url: '/admin/problem/testdata/upload?problemId=' + $scope.problemId,
      file: file
    }).then(function (resp) {
      $scope.getDataList();
    }, function (resp) {
      console.log('Error status: ' + resp.status);
    }, function (evt) {
      var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
      console.log('progress: ' + progressPercentage + '% ' + evt.config);
    });
  };
  // for multiple files:
  $scope.uploadFiles = function (files) {
    console.log(files);
    if (files && files.length) {
      for (var i = 0; i < files.length; i++) {
        Upload.upload(files[i]);
      }
    }
  }

  $scope.openEdit = function(fileName) {
    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'editDataModal.html',
      controller: 'editDataModalCtrl',
      resolve: {
        problemId: function() {  return $scope.problemId; },
        fileName: function() { return fileName; }
      }
    });

    modalInstance.result.then(function () {
      $scope.getDataList();
    });
  }

  $scope.openDelete = function(fileName) {
    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'deleteDataModal.html',
      controller: 'deleteDataModalCtrl',
      resolve: {
        fileName: function() { return fileName; }
      }
    });

    modalInstance.result.then(function() {
      $http.delete('/admin/problem/testdata?problemId=' + $scope.problemId + "&fileName=" + fileName)
           .success(function(data) {
              $scope.getDataList();
           })
           .error(function(err) {
             alert("错误:" + err);
           })
    })

  }

  $scope.getDataList();

})

OJControllers.controller('editDataModalCtrl',
function($uibModalInstance, $http, $scope, problemId, fileName) {
    $http.get('/admin/problem/testdata?problemId=' + problemId + "&fileName=" +fileName)
         .success(function(data) {
           $scope = _.assign($scope, data);
           $scope.data.problemId = problemId;
           console.log($scope);
         })
         .error(function(err) {
           alert("错误:" + err);
         })


  $scope.save = function() {
    $http.post('/admin/problem/testdata', { data: $scope.data })
         .success(function(data) {
           $uibModalInstance.close();
         })
         .error(function(err) {
           alert("错误: " + err);
         });
  }

  $scope.cancel = function() {
    $uibModalInstance.dismiss();
  }
});


OJControllers.controller('deleteDataModalCtrl',
function($uibModalInstance, $scope, fileName) {
  $scope.fileName = fileName;
  $scope.yes = function() {
    $uibModalInstance.close();
  }

  $scope.no = function() {
    $uibModalInstance.dismiss();
  }
})

OJControllers.controller('admincontestCtrl',
function($scope, $http, $rootScope, $uibModal) {
  $rootScope.getItems = function() {
    $http.get('/admin/contest/list/' + $rootScope.currentPage)
    .success(function(data) {
      $scope.contests = data.contests;
      $rootScope.totalItems = data.contestCount;
    })
    .error(function(err) {
      console.log("错误:" + err);
    })
  }

  $scope.open = function(title, contestId) {
    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'confirmModal.html',
      controller: 'confirmModalCtrl',
      resolve: {
        title: function() {  return title; },
      }
    });
    console.log("instance");

    modalInstance.result.then(function () {
      $http.get('/admin/contest/delete?contestId=' + contestId)
           .success(function(data) {
              _.remove($scope.contests, function(contest) { return contest.contestId == contestId; });
           })
           .error(function(err) {
             alert("错误: " + err);
           })
    });

  }
})
