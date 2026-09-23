const express = require('express');

const {
  parseVoiceText,
  clarifyVoiceTransaction,
} = require('./services/voiceParser');

const {
  findCustomerByName,
} = require('./services/customerMatcher');

const {
  findSupplierByName,
} = require('./services/supplierMatcher');


const supabase = require('../config/supabase');

const {
  getBusinessOwnerId,
  requirePermission,
} = require('../utils/businessAccess');

const router = express.Router();


// =====================================================
// POST /api/voice/parse
// =====================================================

router.post('/parse', async (req, res) => {
  try {
    const { text, user_id } = req.body;

    if (!text || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'text and user_id are required',
      });
    }

    // ======================================
    // VOICE PERMISSION
    // ======================================

    await requirePermission(
      user_id,
      'can_use_voice'
    );

    const businessOwnerId =
      await getBusinessOwnerId(user_id);

    console.log('🎤 Voice Parse');
    console.log('User ID:', user_id);
    console.log('Business Owner ID:', businessOwnerId);

    const parsed = await parseVoiceText(text);

    console.log('🤖 Parsed:', parsed);

    if (parsed.needs_clarification) {
      return res.json({
        success: true,
        needs_clarification: true,
        question: parsed.clarification_question,
        transaction: parsed,
      });
    }

    if (!parsed.account_type) {
      return res.status(400).json({
        success: false,
        message: 'Account type could not be detected',
      });
    }

    if (!parsed.intent) {
      return res.status(400).json({
        success: false,
        message: 'Transaction intent could not be detected',
      });
    }

    if (!parsed.person_name) {
      return res.status(400).json({
        success: false,
        message: 'Person name could not be detected',
      });
    }

    if (
      parsed.amount === null ||
      parsed.amount === undefined ||
      Number(parsed.amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount could not be detected',
      });
    }

    if (parsed.account_type === 'supplier') {
      const match = await findSupplierByName(
        businessOwnerId,
        parsed.person_name
      );

      console.log('🏪 Supplier Match:', match);

      return res.json({
        success: true,
        needs_clarification: false,
        transaction: {
          ...parsed,
          user_id: businessOwnerId,
        },
        match,
      });
    }

    if (parsed.account_type === 'customer') {
      const match = await findCustomerByName(
        businessOwnerId,
        parsed.person_name
      );

      console.log('👤 Customer Match:', match);

      return res.json({
        success: true,
        needs_clarification: false,
        transaction: {
          ...parsed,
          user_id: businessOwnerId,
        },
        match,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid account type',
    });

  } catch (error) {
    console.error('❌ Voice Parse Error:', error);

    if (error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to use voice',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to parse voice input',
      error: error.message,
    });
  }
});


// =====================================================
// POST /api/voice/confirm
// =====================================================

router.post('/confirm', async (req, res) => {
  try {
    const {
      user_id,
      account_type,
      customer_id,
      customer_name,
      supplier_id,
      supplier_name,
      intent,
      amount,
      note,
      mobile,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    // ======================================
    // VOICE PERMISSION
    // ======================================

    await requirePermission(
      user_id,
      'can_use_voice'
    );

    // ======================================
    // TRANSACTION PERMISSION
    // ======================================

    await requirePermission(
      user_id,
      'can_create_transactions'
    );

    if (!account_type) {
      return res.status(400).json({
        success: false,
        message: 'account_type is required',
      });
    }

    if (!intent) {
      return res.status(400).json({
        success: false,
        message: 'intent is required',
      });
    }

    if (
      amount === undefined ||
      amount === null ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
      });
    }

    const businessOwnerId =
      await getBusinessOwnerId(user_id);

    console.log('✅ Voice Confirm');
    console.log('User ID:', user_id);
    console.log('Business Owner ID:', businessOwnerId);

    // =================================================
    // CUSTOMER
    // =================================================

    if (account_type === 'customer') {
      let customer = null;

      if (customer_id) {
        const { data, error } = await supabase
          .from('customers')
          .select('id, user_id, name, mobile')
          .eq('id', customer_id)
          .eq('user_id', businessOwnerId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        customer = data;
      }

      if (!customer && customer_name) {
        const match = await findCustomerByName(
          businessOwnerId,
          customer_name
        );

        if (match && match.customer) {
          customer = match.customer;
        } else if (match && match.id) {
          customer = match;
        }
      }

      if (!customer) {
        const { data, error } = await supabase
          .from('customers')
          .insert([
            {
              user_id: businessOwnerId,
              name: customer_name,
              mobile: mobile || null,
            },
          ])
          .select('id, user_id, name, mobile')
          .single();

        if (error) {
          throw error;
        }

        customer = data;

        console.log(
          '👤 New Customer Created:',
          customer.id
        );
      }

      let transactionType;

      if (intent === 'credit_given') {
        transactionType = 'credit';
      } else if (intent === 'payment_received') {
        transactionType = 'payment';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer transaction intent',
        });
      }

      const {
        data: transaction,
        error: transactionError,
      } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: businessOwnerId,
            customer_id: customer.id,
            type: transactionType,
            amount: Number(amount),
            description: note || null,
          },
        ])
        .select()
        .single();

      if (transactionError) {
        throw transactionError;
      }

      console.log(
        '💰 Customer Transaction Created:',
        transaction.id
      );

      return res.json({
        success: true,
        message: 'Customer transaction created successfully',
        transaction,
        customer,
      });
    }


    // =================================================
    // SUPPLIER
    // =================================================

    if (account_type === 'supplier') {
      let supplier = null;

      if (supplier_id) {
        const { data, error } = await supabase
          .from('suppliers')
          .select('id, user_id, name, mobile')
          .eq('id', supplier_id)
          .eq('user_id', businessOwnerId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        supplier = data;
      }

      if (!supplier && supplier_name) {
        const match = await findSupplierByName(
          businessOwnerId,
          supplier_name
        );

        if (match && match.supplier) {
          supplier = match.supplier;
        } else if (match && match.id) {
          supplier = match;
        }
      }

      if (!supplier) {
        const { data, error } = await supabase
          .from('suppliers')
          .insert([
            {
              user_id: businessOwnerId,
              name: supplier_name,
              mobile: mobile || null,
            },
          ])
          .select('id, user_id, name, mobile')
          .single();

        if (error) {
          throw error;
        }

        supplier = data;

        console.log(
          '🏪 New Supplier Created:',
          supplier.id
        );
      }

      let transactionType;

      if (intent === 'purchase_from_supplier') {
        transactionType = 'purchase';
      } else if (intent === 'payment_to_supplier') {
        transactionType = 'payment';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid supplier transaction intent',
        });
      }

      const {
        data: transaction,
        error: transactionError,
      } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: businessOwnerId,
            supplier_id: supplier.id,
            type: transactionType,
            amount: Number(amount),
            description: note || null,
          },
        ])
        .select()
        .single();

      if (transactionError) {
        throw transactionError;
      }

      console.log(
        '💰 Supplier Transaction Created:',
        transaction.id
      );

      return res.json({
        success: true,
        message: 'Supplier transaction created successfully',
        transaction,
        supplier,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid account type',
    });

  } catch (error) {
    console.error('❌ Voice Confirm Error:', error);

    if (error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to use voice transactions',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to confirm voice transaction',
      error: error.message,
    });
  }
});


// =====================================================
// POST /api/voice/clarify
// =====================================================

router.post('/clarify', async (req, res) => {
  try {
    const {
      user_id,
      original_text,
      question,
      answer,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    // ======================================
    // VOICE PERMISSION
    // ======================================

    await requirePermission(
      user_id,
      'can_use_voice'
    );

    if (!original_text || !question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'original_text, question and answer are required',
      });
    }

    const businessOwnerId =
      await getBusinessOwnerId(user_id);

    console.log('🎤 Voice Clarify');
    console.log('User ID:', user_id);
    console.log('Business Owner ID:', businessOwnerId);

    const clarified = await clarifyVoiceTransaction({
      originalText: original_text,
      question,
      answer,
    });

    console.log('🤖 Clarified:', clarified);

    if (clarified.needs_clarification) {
      return res.json({
        success: true,
        needs_clarification: true,
        question: clarified.clarification_question,
        transaction: clarified,
      });
    }

    if (!clarified.account_type) {
      return res.status(400).json({
        success: false,
        message: 'Account type could not be detected',
      });
    }

    if (!clarified.intent) {
      return res.status(400).json({
        success: false,
        message: 'Transaction intent could not be detected',
      });
    }

    if (!clarified.person_name) {
      return res.status(400).json({
        success: false,
        message: 'Person name could not be detected',
      });
    }

    if (
      clarified.amount === null ||
      clarified.amount === undefined ||
      Number(clarified.amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount could not be detected',
      });
    }

    if (clarified.account_type === 'supplier') {
      const match = await findSupplierByName(
        businessOwnerId,
        clarified.person_name
      );

      console.log('🏪 Supplier Match:', match);

      return res.json({
        success: true,
        needs_clarification: false,
        transaction: {
          ...clarified,
          user_id: businessOwnerId,
        },
        match,
      });
    }

    if (clarified.account_type === 'customer') {
      const match = await findCustomerByName(
        businessOwnerId,
        clarified.person_name
      );

      console.log('👤 Customer Match:', match);

      return res.json({
        success: true,
        needs_clarification: false,
        transaction: {
          ...clarified,
          user_id: businessOwnerId,
        },
        match,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid account type',
    });

  } catch (error) {
    console.error('❌ Voice Clarify Error:', error);

    if (error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to use voice',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to clarify voice transaction',
      error: error.message,
    });
  }
});


module.exports = router;