const _ = require("lodash");

module.exports = {
	name: "User.rest",

	version: 1,

	settings: {
		salt: "secret_salt",
	},

	dependencies: [],

	hooks: {
		before: {
			getUserInfo: ["checkValidDeviceId"],
		},
		// error: {
		// 	"*": function (ctx, error) {
		// 		return {
		// 			data: [],
		// 			succeeded: false,
		// 			message: error.message || String(error),
		// 		};
		// 	},
		// },
	},

	methods: {
		checkValidDeviceId: require("./hooks/checkValidDeviceId.hook"),
	},

	actions: {
		// Start define auth strategies
		default: {
			registry: {
				auth: {
					name: "Default",
					jwtKey: "SECRET_KEY_CHANGE_IN_PRODUCTION",
				},
			},
			handler: require("./actionAuthStrategies/default.rest.action"),
		},

		// End define auth strategies
		register: {
			rest: {
				method: "POST",
				fullPath: "/v1/External/User/Register",
				auth: false,
			},

			params: {
				body: {
					$$type: "object",
					fullName: "string",
					email: "string",
					phone: "string",
					password: "string",
					gender: "string",
					deviceId: "string",
				},
			},

			handler: require("./actions/register.rest.action"),
		},

		login: {
			rest: {
				method: "POST",
				fullPath: "/v1/External/User/Login",
				auth: false,
			},

			params: {
				body: {
					$$type: "object",
					email: "string",
					password: "string",
					deviceId: "string",
				},
			},
			handler: require("./actions/login.rest.action"),
		},

		forgotPassword: {
			rest: {
				method: "POST",
				fullPath: "/v1/External/User/ForgotPassword",
				auth: false,
			},

			params: {
				body: {
					$$type: "object",
					email: "string",
				},
			},

			handler: require("./actions/forgotPassword.rest.action"),
		},

		resetPassword: {
			rest: {
				method: "POST",
				fullPath: "/v1/External/User/ResetPassword",
				auth: false,
			},

			params: {
				body: {
					$$type: "object",
					email: "string",
					password: "string",
					otp: "string",
				},
			},

			handler: require("./actions/resetPassword.rest.action"),
		},

		logout: {
			rest: {
				method: "POST",
				fullPath: "/v1/External/User/Logout",
				auth: {
					strategies: ["Default"],
					mode: "required",
				},
			},

			params: {},

			handler: require("./actions/logout.rest.action"),
		},

		getUserInfo: {
			rest: {
				method: "GET",
				fullPath: "/v1/External/User/UserInfo",
				auth: {
					strategies: ["Default"],
					mode: "required",
				},
			},

			params: {},

			handler: require("./actions/getUserInfo.rest.action"),
		},

		updateUser: {
			rest: {
				method: "POST",
				fullPath: "/v1/External/User/UpdateUserInfo",
				auth: {
					strategies: ["Default"],
					mode: "required",
				},
			},

			params: {
				body: {
					$$type: "object",
					fullName: "string",
					gender: "string",
				},
			},

			handler: require("./actions/updateUser.rest.action"),
		},
	},
};
