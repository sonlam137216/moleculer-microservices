const _ = require("lodash");
const MoleculerError = require("moleculer").Errors;
const moment = require("moment");

module.exports = async function (ctx) {
	try {
		const userId = ctx.meta.auth.credentials.userId;

		const userInfo = await this.broker.call("v1.UserInfoModel.findOne", [
			{ id: userId },
		]);

		if (!userInfo) {
			return {
				code: 1001,
				data: {
					message: "User không tồn tại!",
				},
			};
		}

		// check login session
		const now = new Date();
		if (
			userInfo.loginSession.userId === null ||
			userInfo.loginSession.expiredAt === null
		) {
			return {
				code: 1001,
				data: {
					message: "Phiên đăng nhập đã hết, hãy đăng nhập lại!",
				},
			};
		}

		if (!moment(userInfo.loginSession.expiredAt).isAfter(now)) {
			return {
				code: 1001,
				data: {
					message: "Token đã bị hết hạn",
				},
			};
		}

		return {
			code: 1000,
			data: {
				message: "Lấy thông tin thành công!",
				userInfo,
			},
		};
	} catch (err) {
		console.log("ERR", err);
		if (err.name === "MoleculerError") throw err;
		throw new MoleculerError(`[MiniProgram] Create Order: ${err.message}`);
	}
};
