
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
    $uibModalInstance.close();
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

OJControllers.controller('admincontesteditCtrl',
function($scope, $http, $location, $window) {


  $scope.visibles = [{ text: 'Visible', value: false }, { text: 'Invisible', value: true } ];
  $scope.auths = [{ text: 'Public', value: false }, { text: 'Private', value: true } ];
  $scope.contest = {};
  $scope.contest.isPrivate = $scope.contest.isHidden = false;
  $scope.authorizee = "";
  $scope.pageTitle = "";
  $scope.duration = {};
  $scope.duration.day = $scope.duration.minute = 0;
  $scope.duration.hour = 5;
  $scope.contest.startTime = (new Date()).getTime();
  $scope.contest.startTime -= $scope.contest.startTime % (60 * 1000) - 2 * 60 * 1000;
  $scope.contest.startTime = new Date($scope.contest.startTime);

  $scope.problems = [];

  var param = $location.search();
  console.log(param);
  var contestId = param.contestId;
  console.log(contestId);

  if (contestId) {
    $scope.contest.contestId = contestId;
    $http.get('/admin/contest/data?contestId=' + contestId)
         .success(function(data) {
           var contest = data.contest;
           if (contest) {
             $scope.pageTitle = "Edit Contest";
             $scope.contest = data.contest;
             var length = data.contest.endTime - data.contest.startTime;
             $scope.duration.day = parseInt(length / (24 * 60 * 60 * 1000));
             length %= (24 * 60 * 60 * 1000);
             $scope.duration.hour = parseInt(length / (60 * 60 * 1000));
             length %= (60 * 60 * 1000);
             $scope.duration.minute = parseInt(length / (60 * 1000));
             for (var i in data.contest.problemId) {
               $scope.problems.push({ id: data.contest.problemId[i] })
             }
           }
         })
  }

  if (!$scope.pageTitle) {
    $scope.pageTitle = "Add Contest";
  }

  $scope.getChar = function(x) {
    return String.fromCharCode(x);
  }

  $scope.getTitle = function(problemId, idx) {
    if (!problemId) return;
    $http.get("/problem/data/" + problemId)
         .success(function(data) {
           var problem = data.problem;
           if (problem) {
             $scope.problems[idx].title = problem.title;
             $scope.problems[idx].isFound = true;
           }
         })
         .error(function(err) {
             $scope.problems[idx].title = "No Such Problem";

         })
  }

  $scope.add = function() {
    var lastProblem = _.last($scope.problems);
    var newProblem = {};

    if (lastProblem && lastProblem.id) {
      newProblem.id = parseInt(lastProblem.id) + 1;
    }

    $scope.problems.push(newProblem);
  }

  $scope.remove = function(idx) {
    $scope.problems.splice(idx, 1);
  }

  function getDuration() {
    return (($scope.duration.day * 24 + $scope.duration.hour) * 60 + $scope.duration.minute) * 60 * 1000;
  }

  $scope.submit = function() {
    if (typeof $scope.contest.startTime) {
      $scope.contest.startTime = $scope.contest.startTime.getTime();
    }
    $scope.contest.endTime = $scope.contest.startTime + getDuration();
    $scope.contest.problemId = [];
    for (var i in $scope.problems) {
      $scope.contest.problemId.push($scope.problems[i].id);
    }
    console.log($scope.authorizee);
    $scope.contest.authorizee = $scope.authorizee.split(/\s+|,/);


    if ($scope.pageTitle == "Add Contest")  {
      $http.put('/admin/contest', { contest: $scope.contest })
           .success(function(data) {
              alert("添加成功");
              $window.location.href = "/#/admin/contest";
           })
           .error(function(err) {
             alert("错误: " + err);
           });
    } else {
      $http.post('/admin/contest/data', { contest: $scope.contest })
           .success(function(data) {
             alert("修改成功");
             $window.location.href = "/#/admin/contest";
           })
           .error(function(err) {
             alert("错误: " + err);
           })
    }
  }
});


OJControllers.controller('contestlstCtrl',
function($scope, $rootScope, $http) {
  $rootScope.currentPage = 1;
  $rootScope.getItems = function() {
    $http.get('/contest/list/' + $rootScope.currentPage)
    .success(function(data) {
      for (var i in data.contests) {
        var contest = data.contests[i];
        contest.status = $scope.getStatus(contest.startTime, contest.endTime);
      }

      $scope.contests = data.contests;

      $rootScope.totalItems = data.contestCount;
    })
    .error(function(err) {
      alert("错误:" + err);
    })
  }

  $scope.getStatus = function(startTime, endTime) {
    var currentTime = new Date().getTime();
    if (currentTime < startTime) return "Pending";
    else if (currentTime < endTime) return "Running";
    else return "Finished";
  }
  function sprintf() {
    var i = 0, a, f = arguments[i++], o = [], m, p, c, x, s = '';
    while (f) {
      if (m = /^[^\x25]+/.exec(f)) {
        o.push(m[0]);
      }
      else if (m = /^\x25{2}/.exec(f)) {
        o.push('%');
      }
      else if (m = /^\x25(?:(\d+)\$)?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(f)) {
        if (((a = arguments[m[1] || i++]) == null) || (a == undefined)) {
          throw('Too few arguments.');
        }
        if (/[^s]/.test(m[7]) && (typeof(a) != 'number')) {
          throw('Expecting number but found ' + typeof(a));
        }
        switch (m[7]) {
          case 'b': a = a.toString(2); break;
          case 'c': a = String.fromCharCode(a); break;
          case 'd': a = parseInt(a); break;
          case 'e': a = m[6] ? a.toExponential(m[6]) : a.toExponential(); break;
          case 'f': a = m[6] ? parseFloat(a).toFixed(m[6]) : parseFloat(a); break;
          case 'o': a = a.toString(8); break;
          case 's': a = ((a = String(a)) && m[6] ? a.substring(0, m[6]) : a); break;
          case 'u': a = Math.abs(a); break;
          case 'x': a = a.toString(16); break;
          case 'X': a = a.toString(16).toUpperCase(); break;
        }
        a = (/[def]/.test(m[7]) && m[2] && a >= 0 ? '+'+ a : a);
        c = m[3] ? m[3] == '0' ? '0' : m[3].charAt(1) : ' ';
        x = m[5] - String(a).length - s.length;
        p = m[5] ? _.repeat(c, x) : '';
        o.push(s + (m[4] ? a + p : p + a));
      }
      else {
        throw('Huh ?!');
      }
      f = f.substring(m[0].length);
    }
    return o.join('');
  }
  $scope.getDuration = function(duration) {
    var days = parseInt(duration / (24 * 60 * 60 * 1000));
    duration %= (24 * 60 * 60 * 1000);
    var hours = parseInt(duration / (60 * 60 * 1000));
    duration %= (60 * 60 * 1000);
    var minute = parseInt(duration / (60 * 1000));
    var res = "";
    if (days) res += days + " day "
    res += sprintf("%d:%02d:00", hours, minute);
    return res;
  }
})
