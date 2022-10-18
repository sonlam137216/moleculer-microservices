const { default: axios } = require("axios");
const _ = require("lodash");
const generateTransactionId = require("../../../utils/generateTransactionId");
const updateWalletConstant = require("../constant/updateWallet.constant");
const { MoleculerError } = require("moleculer").Errors;

module.exports = async function (ctx) {
	try {
		const { userId } = ctx.meta.auth.credentials;

		const { transactionAmount } = ctx.params.body;

		const existingUser = await this.broker.call(
			"v1.UserInfoModel.findOne",
			[{ id: userId }]
		);

		if (!existingUser) {
			return {
				code: 1001,
				data: {
					message: "User không tồn tại",
				},
			};
		}

		// check existing wallet
		const existingWallet = await this.broker.call(
			"v1.WalletInfoModel.findOne",
			[{ ownerId: userId }]
		);

		if (!existingWallet) {
			return {
				code: 1001,
				data: {
					message: "User chưa tạo ví",
				},
			};
		}

		if (existingWallet.balanceAvailable - transactionAmount < 0) {
			return {
				code: 1001,
				data: {
					message:
						"Số dư hiện tại không đủ, vui lòng nạp thêm tiền vào tài khoản!",
				},
			};
		}

		// create local transaction
		const randomTransactionId = generateTransactionId();
		const transactionCreateObj = {
			transactionInfo: {
				transactionId: randomTransactionId,
				transactionAmount,
				status: updateWalletConstant.TRANSACTION_STATUS.PENDING,
				transferType: updateWalletConstant.WALLET_ACTION_TYPE.SUB,
			},
		};
		const transactionCreate = await this.broker.call(
			"v1.UpdateWalletInfoModel.create",
			[transactionCreateObj]
		);

		console.log("transactionCreate", transactionCreate);

		if (_.get(transactionCreate, "id", null) === null) {
			return {
				code: 1001,
				data: {
					message: "Tạo transaction không thành công!",
				},
			};
		}

		const userInfo = _.pick(existingUser, ["id", "email", "phone"]);
		const walletInfo = _.pick(transactionCreate, [
			"id",
			"transferType",
			"transactionAmount",
		]);

		const transactionResponseFromBank = await this.broker.call(
			"v1.Bank.createRequestPayment",
			{ phone: userInfo.phone, transactionAmount }
		);

		console.log(
			"transactionResponseFromBank",
			transactionResponseFromBank.data
		);

		if (!transactionResponseFromBank) {
			return {
				code: 1001,
				data: {
					message: "Tạo giao dịch với ngân hàng không thành công!",
				},
			};
		}

		// update transaction
		const updatedTransaction = await this.broker.call(
			"v1.UpdateWalletInfoModel.findOneAndUpdate",
			[
				{
					"transactionInfo.status":
						updateWalletConstant.TRANSACTION_STATUS.PENDING,
					"transactionInfo.transactionId": randomTransactionId,
				},
				{
					transactionInfoFromSupplier: {
						transactionId:
							transactionResponseFromBank.data.transactionInfo
								.transactionId,
						transactionAmount:
							transactionResponseFromBank.data.transactionInfo
								.transactionAmount,
						status: transactionResponseFromBank.data.data
							.transactionInfo.status,
					},
				},
			]
		);

		console.log("updatedTransaction", updatedTransaction);

		if (_.get(updatedTransaction, "id", null) === null) {
			return {
				code: 1001,
				data: {
					message: "Cập nhật giao dịch không thành công!",
				},
			};
		}

		return {
			code: 1000,
			data: {
				message: "Gửi thông tin qua ngân hàng!",
				userInfo,
				walletInfo,
				transactionInfo: updatedTransaction,
				responseFromBank: transactionResponseFromBank.data,
			},
		};
	} catch (err) {
		console.log("ERR", err);
		if (err.name === "MoleculerError") throw err;
		throw new MoleculerError(`[MiniProgram] Create Order: ${err.message}`);
	}
};