(function () {
	'use strict';
	
	angular
		.module('PLMApp')
		.factory('toasterUtils', toasterUtils);
	
	toasterUtils.$inject = ['toaster', '$timeout'];
	
	function toasterUtils(toaster, $timeout) {
		
		var service = {
				success: success,
                warning: warning,
				error: error
		};
		return service;
        
		function success(title, message) {
		    $timeout(function () {
                toaster.pop('success', title, message);
            }, 0);
		}
		
        function warning(title, message) {
		    $timeout(function () {
                toaster.pop('warning', title, message);
            }, 0);
		}
        
        function error(title, message) {
		    $timeout(function () {
                toaster.pop('error', title, message, -1);
            }, 0);
		}
	}
})();