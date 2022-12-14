const _ = require("lodash");
const { MoleculerError } = require("moleculer").Errors;
const moment = require("moment");
const insightConstant = require("../constant/insight.constant");

module.exports = async function (ctx) {
	try {
		const { fromDate, toDate, accountId } = ctx.params.body;

		const inputFromDate = moment(fromDate).startOf("day").toISOString();
		const inputToDate = moment(toDate).endOf("day").toISOString();

		const dateCompareQuery = {
			$expr: {
				$and: [
					{
						$gte: [
							"$createdAt",
							{
								$dateFromString: {
									dateString: inputFromDate,
								},
							},
						],
					},
					{
						$lte: [
							"$createdAt",
							{
								$dateFromString: {
									dateString: inputToDate,
								},
							},
						],
					},
				],
			},
		};

		const methodQuery = accountId ? { userId: accountId } : {};

		const paymentGroupByAccount = await this.broker.call(
			"v1.PaymentInfoModel.aggregate",
			[
				[
					{
						$match: {
							...dateCompareQuery,
							...methodQuery,
						},
					},
					{
						$group: {
							_id: {
								userId: "$userId",
								status: "$status",
							},
							totalCount: { $sum: 1 },
						},
					},
				],
			],
			{ timeout: 90000 }
		);

		if (!paymentGroupByAccount) {
			return {
				code: 1001,
				message: this.__(insightConstant.ERROR_GROUP_ACCOUNT),
			};
		}

		const accountTransactions = [];
		let totalTransaction = 0;
		let totalTransactionSuccess = 0;
		const length = paymentGroupByAccount.length;
		let userInfoItem;
		for (let i = 0; i < length; i++) {
			// filter status and userId
			if (
				accountTransactions[accountTransactions.length - 1]?.id !==
				paymentGroupByAccount[i]._id.userId
			) {
				userInfoItem = {
					id: paymentGroupByAccount[i]._id.userId,
					totalTransaction: 0,
					totalTransactionSuccess: 0,
				};

				accountTransactions.push(userInfoItem);
			}

			let accountTransactionsLength = accountTransactions.length;

			// existing
			if (paymentGroupByAccount[i]._id.status === "PAID") {
				accountTransactions[
					accountTransactionsLength - 1
				].totalTransactionSuccess =
					accountTransactions[accountTransactionsLength - 1]
						.totalTransactionSuccess +
					paymentGroupByAccount[i].totalCount;

				totalTransactionSuccess += paymentGroupByAccount[i].totalCount;
			}

			totalTransaction += paymentGroupByAccount[i].totalCount;
			accountTransactions[
				accountTransactionsLength - 1
			].totalTransaction =
				accountTransactions[accountTransactionsLength - 1]
					.totalTransaction + paymentGroupByAccount[i].totalCount;
		}

		const accountIds = accountTransactions.map((item) => item.id);

		const userAccounts = await this.broker.call(
			"v1.UserInfoModel.findMany",
			[
				{
					id: { $in: accountIds },
				},
				"fullName id email -_id",
			],
			{ timeout: 90000 }
		);

		if (!userAccounts) {
			return {
				code: 1001,
				message: this.__(insightConstant.ERROR_GROUP_ACCOUNT),
			};
		}

		const accountsAndPayment = _.merge(userAccounts, accountTransactions);
		const accountsAndPaymentSorted = _.orderBy(
			accountsAndPayment,
			[
				"fullName",
				"id",
				"email",
				"totalTransaction",
				"totalTransactionSuccess",
			],
			["asc", "asc", "esc", "desc", "desc"]
		);

		return {
			code: 1000,
			message: this.__(insightConstant.INSIGHT_CREATE_SUCCESS),
			data: {
				totalTransaction,
				totalTransactionSuccess,
				accountsAndPayments: accountsAndPaymentSorted,
			},
		};
	} catch (err) {
		console.log("ERR", err);
		if (err.name === "MoleculerError") throw err;
		throw new MoleculerError(`[MiniProgram] Create Order: ${err.message}`);
	}
};
