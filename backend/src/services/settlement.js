// Greedy match: largest debtors pay largest creditors until all nets are zero.
// Produces a small set of transfers (at most one less than the number of people with non-zero net).

function optimizeSettlementsFromNet(netByUserId) {
  const creditors = [];
  const debtors = [];

  for (const [userIdStr, netPaise] of Object.entries(netByUserId)) {
    const net = BigInt(netPaise);
    const userId = Number(userIdStr);
    if (net > 0n) {
      creditors.push({ userId, amount: net });
    } else if (net < 0n) {
      debtors.push({ userId, amount: -net });
    }
  }

  const byAmountDesc = (a, b) => (a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : 0);
  creditors.sort(byAmountDesc);
  debtors.sort(byAmountDesc);

  const payments = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const pay = debtor.amount < creditor.amount ? debtor.amount : creditor.amount;

    if (pay > 0n) {
      payments.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountPaise: pay,
      });
      debtor.amount -= pay;
      creditor.amount -= pay;
    }

    if (debtor.amount === 0n) debtorIndex += 1;
    if (creditor.amount === 0n) creditorIndex += 1;
  }

  return payments;
}

module.exports = { optimizeSettlementsFromNet };
