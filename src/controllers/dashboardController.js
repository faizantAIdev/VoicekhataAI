const supabase = require('../config/supabase');

// ======================================
// GET DASHBOARD
// ======================================

const getDashboard = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    // Get all transactions of this user
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customers (
          id,
          name,
          mobile
        ),
        suppliers (
          id,
          name,
          mobile
        )
      `)
      .eq('user_id', user_id)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    // ======================================
    // CALCULATE CUSTOMER RECEIVABLE
    // ======================================

    let totalCredit = 0;
    let totalCustomerPayment = 0;

    // ======================================
    // CALCULATE SUPPLIER PAYABLE
    // ======================================

    let totalPurchase = 0;
    let totalSupplierPayment = 0;

    transactions.forEach((transaction) => {
      const amount = Number(transaction.amount);

      // Customer
      if (transaction.type === 'credit') {
        totalCredit += amount;
      }

      if (
        transaction.type === 'payment' &&
        transaction.customer_id
      ) {
        totalCustomerPayment += amount;
      }

      // Supplier
      if (transaction.type === 'purchase') {
        totalPurchase += amount;
      }

      if (
        transaction.type === 'payment' &&
        transaction.supplier_id
      ) {
        totalSupplierPayment += amount;
      }
    });

    const totalReceivable =
      totalCredit - totalCustomerPayment;

    const totalPayable =
      totalPurchase - totalSupplierPayment;

    // ======================================
    // TODAY'S TRANSACTIONS
    // ======================================

    const today = new Date();

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const todayTransactions = transactions.filter(
      (transaction) => {
        const transactionDate =
          new Date(transaction.created_at);

        return (
          transactionDate >= startOfDay &&
          transactionDate <= endOfDay
        );
      }
    );

    // ======================================
    // RECENT TRANSACTIONS
    // ======================================

    const recentTransactions =
      transactions.slice(0, 10);

    // ======================================
    // RESPONSE
    // ======================================

    res.json({
      success: true,

      summary: {
        total_receivable: totalReceivable,
        total_payable: totalPayable,
      },

      today: {
        total_transactions: todayTransactions.length,
        transactions: todayTransactions,
      },

      recent_transactions: recentTransactions,
    });

  } catch (error) {
    console.error(
      'Dashboard Error:',
      error
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getDashboard,
};