const supabase = require('../config/supabase');

// ======================================
// GET ALL CUSTOMERS
// ======================================

const getCustomers = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error('Supabase Error:', error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      customers: data,
    });

  } catch (error) {
    console.error('Get Customers Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// CREATE CUSTOMER
// ======================================

const createCustomer = async (req, res) => {
  try {
    const {
      user_id,
      name,
      mobile,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required',
      });
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          user_id,
          name,
          mobile: mobile || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase Error:', error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: data,
    });

  } catch (error) {
    console.error('Create Customer Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// GET SINGLE CUSTOMER
// ======================================

const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      customer: data,
    });

  } catch (error) {
    console.error('Get Customer Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// DELETE CUSTOMER
// ======================================

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });

  } catch (error) {
    console.error('Delete Customer Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
// ======================================
// UPDATE CUSTOMER
// ======================================

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required',
      });
    }

    const { data, error } = await supabase
      .from('customers')
      .update({
        name,
        mobile: mobile || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase Error:', error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      customer: data,
    });

  } catch (error) {
    console.error('Update Customer Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
// ======================================
// GET CUSTOMER LEDGER
// ======================================

const getCustomerLedger = async (req, res) => {
  try {
    const { id } = req.params;

    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, mobile')
      .eq('id', id)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Get transactions
    const { data: transactions, error: transactionError } =
      await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', {
          ascending: false,
        });

    if (transactionError) {
      console.error('Supabase Error:', transactionError);

      return res.status(500).json({
        success: false,
        message: transactionError.message,
      });
    }

    // Calculate balance
    let totalCredit = 0;
    let totalPayment = 0;

    transactions.forEach((transaction) => {
      const amount = Number(transaction.amount);

      if (transaction.type === 'credit') {
        totalCredit += amount;
      }

      if (transaction.type === 'payment') {
        totalPayment += amount;
      }
    });

    const balance = totalCredit - totalPayment;

    res.json({
      success: true,

      customer: {
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
      },

      summary: {
        total_credit: totalCredit,
        total_payment: totalPayment,
        balance: balance,
      },

      transactions: transactions,
    });

  } catch (error) {
    console.error('Get Customer Ledger Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
module.exports = {
  getCustomers,
  createCustomer,
  getCustomer,
  deleteCustomer,
  updateCustomer,
  getCustomerLedger
};