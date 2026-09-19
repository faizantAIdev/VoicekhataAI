const supabase = require('../config/supabase');

// ======================================
// GET ALL SUPPLIERS
// ======================================

const getSuppliers = async (req, res) => {
  const startTime = Date.now();

  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    const queryStart = Date.now();

    const { data, error } = await supabase
      .from('suppliers')
      .select('id, user_id, name, mobile, created_at')
      .eq('user_id', user_id)
      .order('created_at', {
        ascending: false,
      });

    const queryTime = Date.now() - queryStart;

    console.log(`🟢 Suppliers Supabase Query: ${queryTime}ms`);

    if (error) {
      console.error('Supabase Error:', error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    console.log(
      `⏱️ Suppliers Controller Total: ${Date.now() - startTime}ms`
    );

    res.json({
      success: true,
      suppliers: data,
    });

  } catch (error) {
    console.error('Get Suppliers Error:', error);

    console.log(
      `❌ Suppliers Controller Failed: ${Date.now() - startTime}ms`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// CREATE SUPPLIER
// ======================================

const createSupplier = async (req, res) => {
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
        message: 'Supplier name is required',
      });
    }

    const { data, error } = await supabase
      .from('suppliers')
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
      message: 'Supplier created successfully',
      supplier: data,
    });

  } catch (error) {
    console.error('Create Supplier Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// GET SINGLE SUPPLIER
// ======================================

const getSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    res.json({
      success: true,
      supplier: data,
    });

  } catch (error) {
    console.error('Get Supplier Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// UPDATE SUPPLIER
// ======================================

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required',
      });
    }

    const { data, error } = await supabase
      .from('suppliers')
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
      message: 'Supplier updated successfully',
      supplier: data,
    });

  } catch (error) {
    console.error('Update Supplier Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// DELETE SUPPLIER
// ======================================

const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase Error:', error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Supplier deleted successfully',
    });

  } catch (error) {
    console.error('Delete Supplier Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
// ======================================
// GET SUPPLIER LEDGER
// ======================================

const getSupplierLedger = async (req, res) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    // -----------------------------
    // 1. Supplier info query
    // -----------------------------
    const supplierQueryStart = Date.now();

    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name, mobile')
      .eq('id', id)
      .single();

    const supplierQueryTime = Date.now() - supplierQueryStart;

    console.log(
      `🟢 Supplier Info Query: ${supplierQueryTime}ms`
    );

    if (supplierError || !supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    // -----------------------------
    // 2. Transactions query
    // -----------------------------
    const transactionQueryStart = Date.now();

    const { data: transactions, error: transactionError } =
      await supabase
        .from('transactions')
        .select('*')
        .eq('supplier_id', id)
        .order('created_at', {
          ascending: false,
        });

    const transactionQueryTime =
      Date.now() - transactionQueryStart;

    console.log(
      `🟢 Supplier Transactions Query: ${transactionQueryTime}ms`
    );

    if (transactionError) {
      console.error(
        'Supabase Error:',
        transactionError
      );

      return res.status(500).json({
        success: false,
        message: transactionError.message,
      });
    }

    // -----------------------------
    // 3. Processing
    // -----------------------------
    const processingStart = Date.now();

    let totalPurchase = 0;
    let totalPayment = 0;

    transactions.forEach((transaction) => {
      const amount = Number(transaction.amount);

      if (transaction.type === 'purchase') {
        totalPurchase += amount;
      }

      if (transaction.type === 'payment') {
        totalPayment += amount;
      }
    });

    const balance = totalPurchase - totalPayment;

    const processingTime =
      Date.now() - processingStart;

    console.log(
      `🟢 Supplier Processing: ${processingTime}ms`
    );

    // -----------------------------
    // 4. Total controller time
    // -----------------------------
    console.log(
      `⏱️ Supplier Controller Total: ${Date.now() - startTime}ms`
    );

    res.json({
      success: true,

      supplier: {
        id: supplier.id,
        name: supplier.name,
        mobile: supplier.mobile,
      },

      summary: {
        total_purchase: totalPurchase,
        total_payment: totalPayment,
        balance: balance,
      },

      transactions: transactions,
    });

  } catch (error) {
    console.error(
      'Get Supplier Ledger Error:',
      error
    );

    console.log(
      `❌ Supplier Controller Failed: ${Date.now() - startTime}ms`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getSuppliers,
  createSupplier,
  getSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierLedger
};