const express = require('express');

const { parseVoiceText } = require('./services/voiceParser');
const { findCustomerByName } = require('./services/customerMatcher');

const supabase = require('./../config/supabase');

const router = express.Router();


// =====================================================
// POST /api/voice/parse
//
// AI parses voice text
// Then smart-matches the customer
//
// IMPORTANT:
// No customer is created here.
// No transaction is created here.
//
// =====================================================

router.post('/parse', async (req, res) => {
  try {
    const { text, user_id } = req.body;

    // ==========================================
    // 1. VALIDATE INPUT
    // ==========================================

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        reason: 'VOICE_TEXT_MISSING',
        message: 'Voice text is required',
      });
    }

    if (!user_id) {
      return res.status(400).json({
        success: false,
        reason: 'USER_ID_MISSING',
        message: 'user_id is required',
      });
    }

    console.log('-----------------------------------');
    console.log('VOICE PARSE REQUEST');
    console.log('USER ID:', user_id);
    console.log('VOICE TEXT:', text);
    console.log('-----------------------------------');


    // ==========================================
    // 2. AI PARSE
    // ==========================================

    const parsed = await parseVoiceText(text.trim());

    console.log('AI PARSED RESULT:', parsed);


    // ==========================================
    // 3. VALIDATE AI RESULT
    // ==========================================

    if (!parsed) {
      return res.status(400).json({
        success: false,
        reason: 'AI_PARSE_FAILED',
        message: 'Could not understand the voice input',
      });
    }


    // Customer voice flow supports only:
    // credit_given
    // payment_received

    if (
      !parsed.intent ||
      ![
        'credit_given',
        'payment_received',
      ].includes(parsed.intent)
    ) {
      return res.status(400).json({
        success: false,
        reason: 'INVALID_INTENT',
        message:
          'Could not determine whether this is credit given or payment received',
      });
    }


    if (!parsed.person_name || !parsed.person_name.trim()) {
      return res.status(400).json({
        success: false,
        reason: 'PERSON_NAME_MISSING',
        message: 'Could not understand customer name',
      });
    }


    if (!parsed.amount || Number(parsed.amount) <= 0) {
      return res.status(400).json({
        success: false,
        reason: 'AMOUNT_MISSING',
        message: 'Could not understand transaction amount',
      });
    }


    // ==========================================
    // 4. SMART CUSTOMER MATCHING
    // ==========================================

    const matchResult = await findCustomerByName(
      user_id,
      parsed.person_name
    );

    console.log('CUSTOMER MATCH RESULT:', matchResult);


    // ==========================================
    // 5. MULTIPLE CUSTOMERS FOUND
    // ==========================================

    if (matchResult.status === 'multiple_matches') {
      return res.json({
        success: true,

        customer_found: false,

        reason: 'MULTIPLE_MATCHES',

        message:
          'Multiple customers matched. Please select the correct customer.',

        customers: matchResult.customers,

        transaction: {
          intent: parsed.intent,
          person_name: parsed.person_name,
          amount: Number(parsed.amount),
          note: parsed.note || '',
          date: parsed.date || 'today',
        },
      });
    }


    // ==========================================
    // 6. POSSIBLE CUSTOMER MATCH
    // ==========================================

    if (matchResult.status === 'possible_match') {
      return res.json({
        success: true,

        customer_found: false,

        reason: 'POSSIBLE_MATCH',

        message:
          'A similar customer was found. Please confirm.',

        suggested_customer: {
          id: matchResult.customer.id,
          name: matchResult.customer.name,
          mobile: matchResult.customer.mobile,
          confidence: matchResult.confidence,
        },

        transaction: {
          intent: parsed.intent,
          person_name: parsed.person_name,
          amount: Number(parsed.amount),
          note: parsed.note || '',
          date: parsed.date || 'today',
        },
      });
    }


    // ==========================================
    // 7. CUSTOMER FOUND
    // ==========================================

    if (matchResult.status === 'matched') {
      return res.json({
        success: true,

        customer_found: true,

        reason: 'CUSTOMER_FOUND',

        message:
          'Customer found. Ready for confirmation.',

        customer: {
          id: matchResult.customer.id,
          name: matchResult.customer.name,
          mobile: matchResult.customer.mobile,
          is_new: false,
        },

        transaction: {
          intent: parsed.intent,
          person_name: parsed.person_name,
          amount: Number(parsed.amount),
          note: parsed.note || '',
          date: parsed.date || 'today',
        },
      });
    }


    // ==========================================
    // 8. CUSTOMER NOT FOUND
    //
    // Do NOT create customer here.
    // Wait for /confirm.
    // ==========================================

    return res.json({
      success: true,

      customer_found: false,

      reason: 'PERSON_NOT_FOUND',

      message:
        `Customer "${parsed.person_name}" was not found. A new customer can be created after confirmation.`,

      customer: {
        id: null,
        name: parsed.person_name.trim(),
        mobile: null,
        is_new: true,
      },

      transaction: {
        intent: parsed.intent,
        person_name: parsed.person_name,
        amount: Number(parsed.amount),
        note: parsed.note || '',
        date: parsed.date || 'today',
      },
    });


  } catch (error) {
    console.error('===================================');
    console.error('VOICE PARSE ERROR');
    console.error(error);
    console.error('===================================');

    return res.status(500).json({
      success: false,
      reason: 'VOICE_PARSE_SERVER_ERROR',
      message: 'Failed to process voice input',
    });
  }
});


// =====================================================
// POST /api/voice/confirm
//
// Runs ONLY after user confirmation.
//
// Customer intents:
//
// credit_given
//     -> database transaction type = credit
//
// payment_received
//     -> database transaction type = payment
//
// =====================================================

router.post('/confirm', async (req, res) => {
  try {
    const {
      user_id,
      customer_id,
      customer_name,
      intent,
      amount,
      note,
      mobile,
    } = req.body;


    // ==========================================
    // 1. VALIDATION
    // ==========================================

    if (!user_id) {
      return res.status(400).json({
        success: false,
        reason: 'USER_ID_MISSING',
        message: 'user_id is required',
      });
    }


    if (!intent) {
      return res.status(400).json({
        success: false,
        reason: 'INTENT_MISSING',
        message: 'intent is required',
      });
    }


    if (
      ![
        'credit_given',
        'payment_received',
      ].includes(intent)
    ) {
      return res.status(400).json({
        success: false,
        reason: 'INVALID_INTENT',
        message:
          'Invalid intent. Use credit_given or payment_received',
      });
    }


    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        reason: 'INVALID_AMOUNT',
        message: 'Amount must be greater than 0',
      });
    }


    // ==========================================
    // 2. CONVERT INTENT
    // TO EXISTING DATABASE TRANSACTION TYPE
    // ==========================================

    let transactionType;

    if (intent === 'credit_given') {
      transactionType = 'credit';
    }

    if (intent === 'payment_received') {
      transactionType = 'payment';
    }


    // ==========================================
    // 3. CUSTOMER HANDLING
    // ==========================================

    let finalCustomerId = customer_id || null;
    let finalCustomer = null;


    // ==========================================
    // 4. EXISTING CUSTOMER
    // ==========================================

    if (finalCustomerId) {
      const { data: customer, error: customerError } =
        await supabase
          .from('customers')
          .select('id, user_id, name, mobile')
          .eq('id', finalCustomerId)
          .eq('user_id', user_id)
          .single();

      if (customerError || !customer) {
        return res.status(404).json({
          success: false,
          reason: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found',
        });
      }

      finalCustomer = customer;
    }


    // ==========================================
    // 5. NEW CUSTOMER
    // ==========================================

    if (!finalCustomerId) {

      if (!customer_name || !customer_name.trim()) {
        return res.status(400).json({
          success: false,
          reason: 'CUSTOMER_NAME_MISSING',
          message:
            'customer_name is required for a new customer',
        });
      }


      // ----------------------------------------
      // DOUBLE CHECK CUSTOMER
      // ----------------------------------------

      const matchResult = await findCustomerByName(
        user_id,
        customer_name
      );


      // ----------------------------------------
      // MATCHED CUSTOMER FOUND
      // ----------------------------------------

      if (matchResult.status === 'matched') {

        finalCustomerId =
          matchResult.customer.id;

        finalCustomer =
          matchResult.customer;
      }


      // ----------------------------------------
      // CUSTOMER REALLY DOES NOT EXIST
      // ----------------------------------------

      else if (matchResult.status === 'not_found') {

        const {
          data: newCustomer,
          error: customerError,
        } = await supabase
          .from('customers')
          .insert([
            {
              user_id,
              name: customer_name.trim(),
              mobile: mobile || null,
            },
          ])
          .select('id, user_id, name, mobile')
          .single();


        if (customerError) {

          console.error(
            'CREATE VOICE CUSTOMER ERROR:',
            customerError
          );

          return res.status(500).json({
            success: false,
            reason: 'CUSTOMER_CREATE_FAILED',
            message: customerError.message,
          });
        }


        finalCustomerId =
          newCustomer.id;

        finalCustomer =
          newCustomer;
      }


      // ----------------------------------------
      // MULTIPLE / POSSIBLE MATCH
      // ----------------------------------------

      else {

        return res.status(409).json({

          success: false,

          reason: matchResult.status,

          message:
            'A similar customer already exists. Please select the correct customer.',

          matches:
            matchResult.customers ||
            (
              matchResult.customer
                ? [matchResult.customer]
                : []
            ),
        });
      }
    }


    // ==========================================
    // 6. CREATE TRANSACTION
    // ==========================================

    const {
      data: transaction,
      error: transactionError,
    } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: user_id,

          customer_id: finalCustomerId,

          supplier_id: null,

          type: transactionType,

          amount: Number(amount),

          description:
            note && note.trim()
              ? note.trim()
              : 'Voice entry',
        },
      ])
      .select()
      .single();


    // ==========================================
    // 7. TRANSACTION ERROR
    // ==========================================

    if (transactionError) {

      console.error(
        'CREATE VOICE TRANSACTION ERROR:',
        transactionError
      );

      return res.status(500).json({
        success: false,
        reason: 'TRANSACTION_CREATE_FAILED',
        message: transactionError.message,
      });
    }


    // ==========================================
    // 8. SUCCESS
    // ==========================================

    return res.status(201).json({

      success: true,

      message:
        'Voice transaction confirmed successfully',

      customer: {
        id: finalCustomer.id,

        name: finalCustomer.name,

        mobile: finalCustomer.mobile,

        is_new: !customer_id,
      },

      transaction: {

        id: transaction.id,

        user_id: transaction.user_id,

        customer_id: transaction.customer_id,

        type: transaction.type,

        amount: transaction.amount,

        description: transaction.description,

        created_at: transaction.created_at,
      },
    });


  } catch (error) {

    console.error('===================================');

    console.error(
      'VOICE CONFIRM ERROR'
    );

    console.error(error);

    console.error('===================================');


    return res.status(500).json({
      success: false,

      reason: 'VOICE_CONFIRM_SERVER_ERROR',

      message:
        'Failed to confirm voice transaction',
    });
  }
});


module.exports = router;