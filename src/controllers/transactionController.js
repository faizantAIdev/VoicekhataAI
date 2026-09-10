const supabase = require('../config/supabase');

// ======================================
// GET ALL TRANSACTIONS
// ======================================

const getTransactions = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    const { data, error } = await supabase
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

    res.json({
      success: true,
      transactions: data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// CREATE TRANSACTION
// ======================================

const createTransaction = async (req, res) => {
  try {
    const {
      user_id,
      customer_id,
      supplier_id,
      type,
      amount,
      description,
    } = req.body;

    // User ID
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    // Allowed types
    const allowedTypes = [
      'credit',
      'payment',
      'purchase',
      'income',
      'expense',
    ];

    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid transaction type. Use credit, payment, purchase, income or expense',
      });
    }

    // Amount
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    // CREDIT → Customer required
    if (type === 'credit') {
      if (!customer_id) {
        return res.status(400).json({
          success: false,
          message: 'customer_id is required for credit',
        });
      }
    }

    // PAYMENT → Customer OR Supplier
    if (type === 'payment') {
      if (!customer_id && !supplier_id) {
        return res.status(400).json({
          success: false,
          message:
            'customer_id or supplier_id is required for payment',
        });
      }

      if (customer_id && supplier_id) {
        return res.status(400).json({
          success: false,
          message:
            'Use either customer_id or supplier_id for payment, not both',
        });
      }
    }

    // PURCHASE → Supplier required
    if (type === 'purchase') {
      if (!supplier_id) {
        return res.status(400).json({
          success: false,
          message: 'supplier_id is required for purchase',
        });
      }
    }

    // Create transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id,
          customer_id: customer_id || null,
          supplier_id: supplier_id || null,
          type,
          amount: Number(amount),
          description: description || null,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      transaction: data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// GET SINGLE TRANSACTION
// ======================================

const getTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      transaction: data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// UPDATE TRANSACTION
// ======================================

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      type,
      amount,
      description,
      customer_id,
      supplier_id,
    } = req.body;

    // Allowed types
    const allowedTypes = [
      'credit',
      'payment',
      'purchase',
      'income',
      'expense',
    ];

    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction type',
      });
    }

    // Amount
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    // CREDIT → Customer required
    if (type === 'credit') {
      if (!customer_id) {
        return res.status(400).json({
          success: false,
          message: 'customer_id is required for credit',
        });
      }
    }

    // PAYMENT → Customer OR Supplier
    if (type === 'payment') {
      if (!customer_id && !supplier_id) {
        return res.status(400).json({
          success: false,
          message:
            'customer_id or supplier_id is required for payment',
        });
      }

      if (customer_id && supplier_id) {
        return res.status(400).json({
          success: false,
          message:
            'Use either customer_id or supplier_id for payment, not both',
        });
      }
    }

    // PURCHASE → Supplier required
    if (type === 'purchase') {
      if (!supplier_id) {
        return res.status(400).json({
          success: false,
          message: 'supplier_id is required for purchase',
        });
      }
    }

    // Update transaction
    const { data, error } = await supabase
      .from('transactions')
      .update({
        customer_id: customer_id || null,
        supplier_id: supplier_id || null,
        type,
        amount: Number(amount),
        description: description || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// DELETE TRANSACTION
// ======================================

const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('transactions')
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
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// EXPORT
// ======================================

module.exports = {
  getTransactions,
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
};