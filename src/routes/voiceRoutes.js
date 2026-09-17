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

const supabase = require('./../config/supabase');

const router = express.Router();


// =====================================================
// POST /api/voice/parse
// =====================================================

router.post('/parse', async (req, res) => {

  try {

    const {
      text,
      user_id,
    } = req.body;


    // =================================================
    // VALIDATION
    // =================================================

    if (
      !text ||
      typeof text !== 'string' ||
      !text.trim()
    ) {

      return res.status(400).json({

        success: false,

        reason:
          'VOICE_TEXT_MISSING',

        message:
          'Voice text is required',

      });

    }


    if (!user_id) {

      return res.status(400).json({

        success: false,

        reason:
          'USER_ID_MISSING',

        message:
          'user_id is required',

      });

    }


    console.log(
      '-----------------------------------'
    );

    console.log(
      'VOICE PARSE REQUEST'
    );

    console.log(
      'USER ID:',
      user_id
    );

    console.log(
      'VOICE TEXT:',
      text
    );

    console.log(
      '-----------------------------------'
    );


    // =================================================
    // AI PARSE
    // =================================================

    const parsed =
      await parseVoiceText(
        text.trim()
      );


    console.log(
      'AI PARSED RESULT:',
      parsed
    );


    // =================================================
    // CLARIFICATION REQUIRED
    // =================================================

    /*
      IMPORTANT:

      If AI cannot confidently understand the transaction,
      do NOT return an error.

      Return the clarification question to frontend.

      Example:

      "Ramesh ko 3000 payment kar di"

      -->

      {
        needs_clarification: true,
        clarification_question:
          "Ramesh customer hai ya supplier?"
      }
    */

    if (
      parsed.needs_clarification
    ) {

      console.log(
        'VOICE NEEDS CLARIFICATION:',
        parsed.clarification_question
      );


      return res.json({

        success: true,

        needs_clarification:
          true,

        clarification_question:
          parsed.clarification_question ||
          'Aapne kya bola?',

        missing_field:
          parsed.missing_field || '',

        original_text:
          text.trim(),

        transaction: {

          account_type:
            parsed.account_type ||
            'unknown',

          intent:
            parsed.intent ||
            'unknown',

          person_name:
            parsed.person_name ||
            '',

          amount:
            Number(parsed.amount) || 0,

          note:
            parsed.note || '',

          date:
            parsed.date ||
            'today',

        },

      });

    }


    // =================================================
    // VALIDATE ACCOUNT TYPE
    // =================================================

    if (
      ![
        'customer',
        'supplier',
      ].includes(
        parsed.account_type
      )
    ) {

      return res.status(400).json({

        success: false,

        reason:
          'INVALID_ACCOUNT_TYPE',

        message:
          'Could not determine customer or supplier',

      });

    }


    // =================================================
    // VALIDATE INTENT
    // =================================================

    const validCustomerIntents = [

      'credit_given',

      'payment_received',

    ];


    const validSupplierIntents = [

      'purchase_from_supplier',

      'payment_to_supplier',

    ];


    // =================================================
    // CUSTOMER INTENT VALIDATION
    // =================================================

    if (
      parsed.account_type ===
      'customer'
    ) {

      if (
        !validCustomerIntents.includes(
          parsed.intent
        )
      ) {

        return res.status(400).json({

          success: false,

          reason:
            'INVALID_INTENT',

          message:
            'Could not understand customer transaction',

        });

      }

    }


    // =================================================
    // SUPPLIER INTENT VALIDATION
    // =================================================

    if (
      parsed.account_type ===
      'supplier'
    ) {

      if (
        !validSupplierIntents.includes(
          parsed.intent
        )
      ) {

        return res.status(400).json({

          success: false,

          reason:
            'INVALID_INTENT',

          message:
            'Could not understand supplier transaction',

        });

      }

    }


    // =================================================
    // PERSON NAME
    // =================================================

    if (
      !parsed.person_name ||
      !parsed.person_name.trim()
    ) {

      return res.status(400).json({

        success: false,

        reason:
          'PERSON_NAME_MISSING',

        message:
          `Could not understand ${
            parsed.account_type
          } name`,

      });

    }


    // =================================================
    // AMOUNT
    // =================================================

    if (
      !parsed.amount ||
      Number(parsed.amount) <= 0
    ) {

      return res.status(400).json({

        success: false,

        reason:
          'AMOUNT_MISSING',

        message:
          'Could not understand transaction amount',

      });

    }


    // =================================================
    // SUPPLIER FLOW
    // =================================================

    if (
      parsed.account_type ===
      'supplier'
    ) {

      const matchResult =
        await findSupplierByName(
          user_id,
          parsed.person_name
        );


      console.log(
        'SUPPLIER MATCH RESULT:',
        matchResult
      );


      // ===============================================
      // MULTIPLE SUPPLIERS
      // ===============================================

      if (
        matchResult.status ===
        'multiple_matches'
      ) {

        return res.json({

          success: true,

          needs_clarification:
            false,

          account_type:
            'supplier',

          supplier_found:
            false,

          reason:
            'MULTIPLE_MATCHES',

          message:
            'Multiple suppliers matched. Please select the correct supplier.',

          suppliers:
            matchResult.suppliers,

          transaction: {

            account_type:
              'supplier',

            intent:
              parsed.intent,

            person_name:
              parsed.person_name,

            amount:
              Number(parsed.amount),

            note:
              parsed.note || '',

            date:
              parsed.date || 'today',

          },

        });

      }


      // ===============================================
      // POSSIBLE SUPPLIER
      // ===============================================

      if (
        matchResult.status ===
        'possible_match'
      ) {

        return res.json({

          success: true,

          needs_clarification:
            false,

          account_type:
            'supplier',

          supplier_found:
            false,

          reason:
            'POSSIBLE_MATCH',

          message:
            'A similar supplier was found. Please confirm.',

          suggested_supplier: {

            id:
              matchResult.supplier.id,

            name:
              matchResult.supplier.name,

            mobile:
              matchResult.supplier.mobile,

            confidence:
              matchResult.confidence,

          },

          transaction: {

            account_type:
              'supplier',

            intent:
              parsed.intent,

            person_name:
              parsed.person_name,

            amount:
              Number(parsed.amount),

            note:
              parsed.note || '',

            date:
              parsed.date || 'today',

          },

        });

      }


      // ===============================================
      // SUPPLIER FOUND
      // ===============================================

      if (
        matchResult.status ===
        'matched'
      ) {

        return res.json({

          success: true,

          needs_clarification:
            false,

          account_type:
            'supplier',

          supplier_found:
            true,

          reason:
            'SUPPLIER_FOUND',

          message:
            'Supplier found. Ready for confirmation.',

          supplier: {

            id:
              matchResult.supplier.id,

            name:
              matchResult.supplier.name,

            mobile:
              matchResult.supplier.mobile,

            is_new:
              false,

          },

          transaction: {

            account_type:
              'supplier',

            intent:
              parsed.intent,

            person_name:
              parsed.person_name,

            amount:
              Number(parsed.amount),

            note:
              parsed.note || '',

            date:
              parsed.date || 'today',

          },

        });

      }


      // ===============================================
      // SUPPLIER NOT FOUND
      // ===============================================

      return res.json({

        success: true,

        needs_clarification:
          false,

        account_type:
          'supplier',

        supplier_found:
          false,

        reason:
          'PERSON_NOT_FOUND',

        message:
          `Supplier "${parsed.person_name}" was not found. A new supplier can be created after confirmation.`,

        supplier: {

          id:
            null,

          name:
            parsed.person_name.trim(),

          mobile:
            null,

          is_new:
            true,

        },

        transaction: {

          account_type:
            'supplier',

          intent:
            parsed.intent,

          person_name:
            parsed.person_name,

          amount:
            Number(parsed.amount),

          note:
            parsed.note || '',

          date:
            parsed.date || 'today',

        },

      });

    }


    // =================================================
    // CUSTOMER FLOW
    // =================================================

    const matchResult =
      await findCustomerByName(
        user_id,
        parsed.person_name
      );


    console.log(
      'CUSTOMER MATCH RESULT:',
      matchResult
    );


    // =================================================
    // MULTIPLE CUSTOMERS
    // =================================================

    if (
      matchResult.status ===
      'multiple_matches'
    ) {

      return res.json({

        success: true,

        needs_clarification:
          false,

        account_type:
          'customer',

        customer_found:
          false,

        reason:
          'MULTIPLE_MATCHES',

        message:
          'Multiple customers matched. Please select the correct customer.',

        customers:
          matchResult.customers,

        transaction: {

          account_type:
            'customer',

          intent:
            parsed.intent,

          person_name:
            parsed.person_name,

          amount:
            Number(parsed.amount),

          note:
            parsed.note || '',

          date:
            parsed.date || 'today',

        },

      });

    }


    // =================================================
    // POSSIBLE CUSTOMER
    // =================================================

    if (
      matchResult.status ===
      'possible_match'
    ) {

      return res.json({

        success: true,

        needs_clarification:
          false,

        account_type:
          'customer',

        customer_found:
          false,

        reason:
          'POSSIBLE_MATCH',

        message:
          'A similar customer was found. Please confirm.',

        suggested_customer: {

          id:
            matchResult.customer.id,

          name:
            matchResult.customer.name,

          mobile:
            matchResult.customer.mobile,

          confidence:
            matchResult.confidence,

        },

        transaction: {

          account_type:
            'customer',

          intent:
            parsed.intent,

          person_name:
            parsed.person_name,

          amount:
            Number(parsed.amount),

          note:
            parsed.note || '',

          date:
            parsed.date || 'today',

        },

      });

    }


    // =================================================
    // CUSTOMER FOUND
    // =================================================

    if (
      matchResult.status ===
      'matched'
    ) {

      return res.json({

        success: true,

        needs_clarification:
          false,

        account_type:
          'customer',

        customer_found:
          true,

        reason:
          'CUSTOMER_FOUND',

        message:
          'Customer found. Ready for confirmation.',

        customer: {

          id:
            matchResult.customer.id,

          name:
            matchResult.customer.name,

          mobile:
            matchResult.customer.mobile,

          is_new:
            false,

        },

        transaction: {

          account_type:
            'customer',

          intent:
            parsed.intent,

          person_name:
            parsed.person_name,

          amount:
            Number(parsed.amount),

          note:
            parsed.note || '',

          date:
            parsed.date || 'today',

        },

      });

    }


    // =================================================
    // CUSTOMER NOT FOUND
    // =================================================

    return res.json({

      success: true,

      needs_clarification:
        false,

      account_type:
        'customer',

      customer_found:
        false,

      reason:
        'PERSON_NOT_FOUND',

      message:
        `Customer "${parsed.person_name}" was not found. A new customer can be created after confirmation.`,

      customer: {

        id:
          null,

        name:
          parsed.person_name.trim(),

        mobile:
          null,

        is_new:
          true,

      },

      transaction: {

        account_type:
          'customer',

        intent:
          parsed.intent,

        person_name:
          parsed.person_name,

        amount:
          Number(parsed.amount),

        note:
          parsed.note || '',

        date:
          parsed.date || 'today',

      },

    });


  } catch (error) {

    console.error(
      '==================================='
    );

    console.error(
      'VOICE PARSE ERROR'
    );

    console.error(error);

    console.error(
      '==================================='
    );


    return res.status(500).json({

      success: false,

      reason:
        'VOICE_PARSE_SERVER_ERROR',

      message:
        error.message ||
        'Failed to process voice input',

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


    // =================================================
    // VALIDATE USER
    // =================================================

    if (!user_id) {

      return res.status(400).json({

        success: false,

        reason:
          'USER_ID_MISSING',

        message:
          'user_id is required',

      });

    }


    // =================================================
    // VALIDATE ACCOUNT TYPE
    // =================================================

    if (
      ![
        'customer',
        'supplier',
      ].includes(
        account_type
      )
    ) {

      return res.status(400).json({

        success: false,

        reason:
          'INVALID_ACCOUNT_TYPE',

        message:
          'account_type must be customer or supplier',

      });

    }


    // =================================================
    // VALIDATE INTENT
    // =================================================

    const validIntents =
      account_type === 'customer'

        ? [
            'credit_given',
            'payment_received',
          ]

        : [
            'purchase_from_supplier',
            'payment_to_supplier',
          ];


    if (
      !validIntents.includes(
        intent
      )
    ) {

      return res.status(400).json({

        success: false,

        reason:
          'INVALID_INTENT',

        message:
          'Invalid transaction intent',

      });

    }


    // =================================================
    // VALIDATE AMOUNT
    // =================================================

    if (
      !amount ||
      Number(amount) <= 0
    ) {

      return res.status(400).json({

        success: false,

        reason:
          'INVALID_AMOUNT',

        message:
          'Amount must be greater than 0',

      });

    }


    // =================================================
    // CUSTOMER
    // =================================================

    if (
      account_type ===
      'customer'
    ) {

      let finalCustomerId =
        customer_id || null;

      let finalCustomer = null;


      // ===============================================
      // EXISTING CUSTOMER
      // ===============================================

      if (
        finalCustomerId
      ) {

        const {

          data: customer,

          error: customerError,

        } = await supabase

          .from('customers')

          .select(
            'id, user_id, name, mobile'
          )

          .eq(
            'id',
            finalCustomerId
          )

          .eq(
            'user_id',
            user_id
          )

          .single();


        if (
          customerError ||
          !customer
        ) {

          return res.status(404).json({

            success: false,

            reason:
              'CUSTOMER_NOT_FOUND',

            message:
              'Customer not found',

          });

        }


        finalCustomer =
          customer;

      }


      // ===============================================
      // NEW CUSTOMER
      // ===============================================

      if (
        !finalCustomerId
      ) {

        if (
          !customer_name ||
          !customer_name.trim()
        ) {

          return res.status(400).json({

            success: false,

            reason:
              'CUSTOMER_NAME_MISSING',

            message:
              'customer_name is required',

          });

        }


        const matchResult =
          await findCustomerByName(
            user_id,
            customer_name
          );


        // =============================================
        // MATCHED
        // =============================================

        if (
          matchResult.status ===
          'matched'
        ) {

          finalCustomerId =
            matchResult.customer.id;

          finalCustomer =
            matchResult.customer;

        }


        // =============================================
        // NOT FOUND -> CREATE
        // =============================================

        else if (
          matchResult.status ===
          'not_found'
        ) {

          const {

            data: newCustomer,

            error:
              customerError,

          } = await supabase

            .from('customers')

            .insert([
              {

                user_id,

                name:
                  customer_name.trim(),

                mobile:
                  mobile || null,

              },
            ])

            .select(
              'id, user_id, name, mobile'
            )

            .single();


          if (
            customerError
          ) {

            console.error(
              'CREATE VOICE CUSTOMER ERROR:',
              customerError
            );


            return res.status(500).json({

              success: false,

              reason:
                'CUSTOMER_CREATE_FAILED',

              message:
                customerError.message,

            });

          }


          finalCustomerId =
            newCustomer.id;

          finalCustomer =
            newCustomer;

        }


        // =============================================
        // MULTIPLE / POSSIBLE
        // =============================================

        else {

          return res.status(409).json({

            success: false,

            reason:
              matchResult.status,

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


      // ===============================================
      // CUSTOMER TRANSACTION TYPE
      // ===============================================

      let transactionType;


      if (
        intent ===
        'credit_given'
      ) {

        transactionType =
          'credit';

      }


      if (
        intent ===
        'payment_received'
      ) {

        transactionType =
          'payment';

      }


      // ===============================================
      // SAFETY CHECK
      // ===============================================

      if (!transactionType) {

        return res.status(400).json({

          success: false,

          reason:
            'TRANSACTION_TYPE_INVALID',

          message:
            'Could not determine customer transaction type',

        });

      }


      // ===============================================
      // CREATE CUSTOMER TRANSACTION
      // ===============================================

      const {

        data: transaction,

        error:
          transactionError,

      } = await supabase

        .from('transactions')

        .insert([
          {

            user_id,

            customer_id:
              finalCustomerId,

            supplier_id:
              null,

            type:
              transactionType,

            amount:
              Number(amount),

            description:
              note &&
              note.trim()

                ? note.trim()

                : 'Voice entry',

          },
        ])

        .select()

        .single();


      if (
        transactionError
      ) {

        console.error(
          'CREATE VOICE CUSTOMER TRANSACTION ERROR:',
          transactionError
        );


        return res.status(500).json({

          success: false,

          reason:
            'TRANSACTION_CREATE_FAILED',

          message:
            transactionError.message,

        });

      }


      // ===============================================
      // CUSTOMER SUCCESS
      // ===============================================

      return res.status(201).json({

        success: true,

        account_type:
          'customer',

        message:
          'Voice customer transaction confirmed successfully',

        customer: {

          id:
            finalCustomer.id,

          name:
            finalCustomer.name,

          mobile:
            finalCustomer.mobile,

          is_new:
            !customer_id,

        },

        transaction: {

          id:
            transaction.id,

          user_id:
            transaction.user_id,

          customer_id:
            transaction.customer_id,

          supplier_id:
            transaction.supplier_id,

          type:
            transaction.type,

          amount:
            transaction.amount,

          description:
            transaction.description,

          created_at:
            transaction.created_at,

        },

      });

    }


    // =================================================
    // SUPPLIER
    // =================================================

    if (
      account_type ===
      'supplier'
    ) {

      let finalSupplierId =
        supplier_id || null;

      let finalSupplier = null;


      // ===============================================
      // EXISTING SUPPLIER
      // ===============================================

      if (
        finalSupplierId
      ) {

        const {

          data: supplier,

          error:
            supplierError,

        } = await supabase

          .from('suppliers')

          .select(
            'id, user_id, name, mobile'
          )

          .eq(
            'id',
            finalSupplierId
          )

          .eq(
            'user_id',
            user_id
          )

          .single();


        if (
          supplierError ||
          !supplier
        ) {

          return res.status(404).json({

            success: false,

            reason:
              'SUPPLIER_NOT_FOUND',

            message:
              'Supplier not found',

          });

        }


        finalSupplier =
          supplier;

      }


      // ===============================================
      // NEW SUPPLIER
      // ===============================================

      if (
        !finalSupplierId
      ) {

        if (
          !supplier_name ||
          !supplier_name.trim()
        ) {

          return res.status(400).json({

            success: false,

            reason:
              'SUPPLIER_NAME_MISSING',

            message:
              'supplier_name is required',

          });

        }


        const matchResult =
          await findSupplierByName(
            user_id,
            supplier_name
          );


        // =============================================
        // MATCHED
        // =============================================

        if (
          matchResult.status ===
          'matched'
        ) {

          finalSupplierId =
            matchResult.supplier.id;

          finalSupplier =
            matchResult.supplier;

        }


        // =============================================
        // NOT FOUND -> CREATE
        // =============================================

        else if (
          matchResult.status ===
          'not_found'
        ) {

          const {

            data: newSupplier,

            error:
              supplierError,

          } = await supabase

            .from('suppliers')

            .insert([
              {

                user_id,

                name:
                  supplier_name.trim(),

                mobile:
                  mobile || null,

              },
            ])

            .select(
              'id, user_id, name, mobile'
            )

            .single();


          if (
            supplierError
          ) {

            console.error(
              'CREATE VOICE SUPPLIER ERROR:',
              supplierError
            );


            return res.status(500).json({

              success: false,

              reason:
                'SUPPLIER_CREATE_FAILED',

              message:
                supplierError.message,

            });

          }


          finalSupplierId =
            newSupplier.id;

          finalSupplier =
            newSupplier;

        }


        // =============================================
        // MULTIPLE / POSSIBLE
        // =============================================

        else {

          return res.status(409).json({

            success: false,

            reason:
              matchResult.status,

            message:
              'A similar supplier already exists. Please select the correct supplier.',

            matches:
              matchResult.suppliers ||
              (
                matchResult.supplier
                  ? [matchResult.supplier]
                  : []
              ),

          });

        }

      }


      // ===============================================
      // SUPPLIER TRANSACTION TYPE
      // ===============================================

      let transactionType;


      if (
        intent ===
        'purchase_from_supplier'
      ) {

        /*
          IMPORTANT:

          Supplier purchase is stored as
          "purchase", NOT "debit".

          This matches SupplierLedgerScreen.
        */

        transactionType =
          'purchase';

      }


      if (
        intent ===
        'payment_to_supplier'
      ) {

        transactionType =
          'payment';

      }


      // ===============================================
      // SAFETY CHECK
      // ===============================================

      if (!transactionType) {

        return res.status(400).json({

          success: false,

          reason:
            'TRANSACTION_TYPE_INVALID',

          message:
            'Could not determine supplier transaction type',

        });

      }


      // ===============================================
      // CREATE SUPPLIER TRANSACTION
      // ===============================================

      const {

        data: transaction,

        error:
          transactionError,

      } = await supabase

        .from('transactions')

        .insert([
          {

            user_id,

            customer_id:
              null,

            supplier_id:
              finalSupplierId,

            type:
              transactionType,

            amount:
              Number(amount),

            description:
              note &&
              note.trim()

                ? note.trim()

                : 'Voice entry',

          },
        ])

        .select()

        .single();


      if (
        transactionError
      ) {

        console.error(
          'CREATE VOICE SUPPLIER TRANSACTION ERROR:',
          transactionError
        );


        return res.status(500).json({

          success: false,

          reason:
            'SUPPLIER_TRANSACTION_CREATE_FAILED',

          message:
            transactionError.message,

        });

      }


      // ===============================================
      // SUPPLIER SUCCESS
      // ===============================================

      return res.status(201).json({

        success: true,

        account_type:
          'supplier',

        message:
          'Voice supplier transaction confirmed successfully',

        supplier: {

          id:
            finalSupplier.id,

          name:
            finalSupplier.name,

          mobile:
            finalSupplier.mobile,

          is_new:
            !supplier_id,

        },

        transaction: {

          id:
            transaction.id,

          user_id:
            transaction.user_id,

          customer_id:
            transaction.customer_id,

          supplier_id:
            transaction.supplier_id,

          type:
            transaction.type,

          amount:
            transaction.amount,

          description:
            transaction.description,

          created_at:
            transaction.created_at,

        },

      });

    }


  } catch (error) {

    console.error(
      '==================================='
    );

    console.error(
      'VOICE CONFIRM ERROR'
    );

    console.error(error);

    console.error(
      '==================================='
    );


    return res.status(500).json({

      success: false,

      reason:
        'VOICE_CONFIRM_SERVER_ERROR',

      message:
        error.message ||
        'Failed to confirm voice transaction',

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


    // =================================================
    // VALIDATION
    // =================================================

    if (!user_id) {

      return res.status(400).json({

        success: false,

        reason:
          'USER_ID_MISSING',

        message:
          'user_id is required',

      });

    }


    if (
      !original_text ||
      typeof original_text !== 'string' ||
      !original_text.trim()
    ) {

      return res.status(400).json({

        success: false,

        reason:
          'ORIGINAL_TEXT_MISSING',

        message:
          'original_text is required',

      });

    }


    if (
      !answer ||
      typeof answer !== 'string' ||
      !answer.trim()
    ) {

      return res.status(400).json({

        success: false,

        reason:
          'CLARIFICATION_ANSWER_MISSING',

        message:
          'answer is required',

      });

    }


    console.log(
      '-----------------------------------'
    );

    console.log(
      'VOICE CLARIFICATION REQUEST'
    );

    console.log(
      'USER ID:',
      user_id
    );

    console.log(
      'ORIGINAL TEXT:',
      original_text
    );

    console.log(
      'QUESTION:',
      question
    );

    console.log(
      'ANSWER:',
      answer
    );

    console.log(
      '-----------------------------------'
    );


    // =================================================
    // AI CLARIFICATION
    // =================================================

    const clarified =
      await clarifyVoiceTransaction({

        originalText:
          original_text.trim(),

        question:
          typeof question === 'string'
            ? question.trim()
            : '',

        answer:
          answer.trim(),

      });


    console.log(
      'CLARIFIED RESULT:',
      clarified
    );


    // =================================================
    // STILL NEEDS CLARIFICATION
    // =================================================

    if (
      clarified.needs_clarification
    ) {

      return res.json({

        success: true,

        needs_clarification:
          true,

        clarification_question:
          clarified.clarification_question,

        missing_field:
          clarified.missing_field,

        transaction: {

          account_type:
            clarified.account_type,

          intent:
            clarified.intent,

          person_name:
            clarified.person_name,

          amount:
            Number(
              clarified.amount
            ) || 0,

          note:
            clarified.note || '',

          date:
            clarified.date || 'today',

        },

      });

    }


    // =================================================
    // VALIDATE ACCOUNT TYPE
    // =================================================

    if (
      ![
        'customer',
        'supplier',
      ].includes(
        clarified.account_type
      )
    ) {

      return res.status(400).json({

        success: false,

        reason:
          'INVALID_ACCOUNT_TYPE',

        message:
          'Could not determine customer or supplier',

      });

    }


    // =================================================
    // VALIDATE INTENT
    // =================================================

    const validCustomerIntents = [

      'credit_given',

      'payment_received',

    ];


    const validSupplierIntents = [

      'purchase_from_supplier',

      'payment_to_supplier',

    ];


    if (
      clarified.account_type ===
      'customer'
    ) {

      if (
        !validCustomerIntents.includes(
          clarified.intent
        )
      ) {

        return res.status(400).json({

          success: false,

          reason:
            'INVALID_INTENT',

          message:
            'Could not understand customer transaction',

        });

      }

    }


    if (
      clarified.account_type ===
      'supplier'
    ) {

      if (
        !validSupplierIntents.includes(
          clarified.intent
        )
      ) {

        return res.status(400).json({

          success: false,

          reason:
            'INVALID_INTENT',

          message:
            'Could not understand supplier transaction',

        });

      }

    }


    // =================================================
    // VALIDATE PERSON
    // =================================================

    if (
      !clarified.person_name ||
      !clarified.person_name.trim()
    ) {

      return res.status(400).json({

        success: false,

        reason:
          'PERSON_NAME_MISSING',

        message:
          'Could not understand person name',

      });

    }


    // =================================================
    // VALIDATE AMOUNT
    // =================================================

    if (
      !clarified.amount ||
      Number(clarified.amount) <= 0
    ) {

      return res.status(400).json({

        success: false,

        reason:
          'AMOUNT_MISSING',

        message:
          'Could not understand transaction amount',

      });

    }


    // =================================================
    // SUPPLIER MATCH
    // =================================================

    if (
      clarified.account_type ===
      'supplier'
    ) {

      const matchResult =
        await findSupplierByName(
          user_id,
          clarified.person_name
        );


      console.log(
        'CLARIFICATION SUPPLIER MATCH:',
        matchResult
      );


      // ===============================================
      // MULTIPLE
      // ===============================================

      if (
        matchResult.status ===
        'multiple_matches'
      ) {

        return res.json({

          success: true,

          needs_clarification:
            false,

          account_type:
            'supplier',

          supplier_found:
            false,

          reason:
            'MULTIPLE_MATCHES',

          message:
            'Multiple suppliers matched. Please select the correct supplier.',

          suppliers:
            matchResult.suppliers,

          transaction: {

            account_type:
              'supplier',

            intent:
              clarified.intent,

            person_name:
              clarified.person_name,

            amount:
              Number(
                clarified.amount
              ),

            note:
              clarified.note || '',

            date:
              clarified.date || 'today',

          },

        });

      }


      // ===============================================
      // POSSIBLE MATCH
      // ===============================================

      if (
        matchResult.status ===
        'possible_match'
      ) {

        return res.json({

          success: true,

          needs_clarification:
            false,

          account_type:
            'supplier',

          supplier_found:
            false,

          reason:
            'POSSIBLE_MATCH',

          message:
            'A similar supplier was found. Please confirm.',

          suggested_supplier: {

            id:
              matchResult.supplier.id,

            name:
              matchResult.supplier.name,

            mobile:
              matchResult.supplier.mobile,

            confidence:
              matchResult.confidence,

          },

          transaction: {

            account_type:
              'supplier',

            intent:
              clarified.intent,

            person_name:
              clarified.person_name,

            amount:
              Number(
                clarified.amount
              ),

            note:
              clarified.note || '',

            date:
              clarified.date || 'today',

          },

        });

      }


      // ===============================================
      // MATCHED
      // ===============================================

      if (
        matchResult.status ===
        'matched'
      ) {

        return res.json({

          success: true,

          needs_clarification:
            false,

          account_type:
            'supplier',

          supplier_found:
            true,

          reason:
            'SUPPLIER_FOUND',

          message:
            'Supplier found. Ready for confirmation.',

          supplier: {

            id:
              matchResult.supplier.id,

            name:
              matchResult.supplier.name,

            mobile:
              matchResult.supplier.mobile,

            is_new:
              false,

          },

          transaction: {

            account_type:
              'supplier',

            intent:
              clarified.intent,

            person_name:
              clarified.person_name,

            amount:
              Number(
                clarified.amount
              ),

            note:
              clarified.note || '',

            date:
              clarified.date || 'today',

          },

        });

      }


      // ===============================================
      // NOT FOUND
      // ===============================================

      return res.json({

        success: true,

        needs_clarification:
          false,

        account_type:
          'supplier',

        supplier_found:
          false,

        reason:
          'PERSON_NOT_FOUND',

        message:
          `Supplier "${clarified.person_name}" was not found. A new supplier can be created after confirmation.`,

        supplier: {

          id:
            null,

          name:
            clarified.person_name.trim(),

          mobile:
            null,

          is_new:
            true,

        },

        transaction: {

          account_type:
            'supplier',

          intent:
            clarified.intent,

          person_name:
            clarified.person_name,

          amount:
            Number(
              clarified.amount
            ),

          note:
            clarified.note || '',

          date:
            clarified.date || 'today',

        },

      });

    }


    // =================================================
    // CUSTOMER MATCH
    // =================================================

    const matchResult =
      await findCustomerByName(
        user_id,
        clarified.person_name
      );


    console.log(
      'CLARIFICATION CUSTOMER MATCH:',
      matchResult
    );


    // =================================================
    // MULTIPLE
    // =================================================

    if (
      matchResult.status ===
      'multiple_matches'
    ) {

      return res.json({

        success: true,

        needs_clarification:
          false,

        account_type:
          'customer',

        customer_found:
          false,

        reason:
          'MULTIPLE_MATCHES',

        message:
          'Multiple customers matched. Please select the correct customer.',

        customers:
          matchResult.customers,

        transaction: {

          account_type:
            'customer',

          intent:
            clarified.intent,

          person_name:
            clarified.person_name,

          amount:
            Number(
              clarified.amount
            ),

          note:
            clarified.note || '',

          date:
            clarified.date || 'today',

        },

      });

    }


    // =================================================
    // POSSIBLE MATCH
    // =================================================

    if (
      matchResult.status ===
      'possible_match'
    ) {

      return res.json({

        success: true,

        needs_clarification:
          false,

        account_type:
          'customer',

        customer_found:
          false,

        reason:
          'POSSIBLE_MATCH',

        message:
          'A similar customer was found. Please confirm.',

        suggested_customer: {

          id:
            matchResult.customer.id,

          name:
            matchResult.customer.name,

          mobile:
            matchResult.customer.mobile,

          confidence:
            matchResult.confidence,

        },

        transaction: {

          account_type:
            'customer',

          intent:
            clarified.intent,

          person_name:
            clarified.person_name,

          amount:
            Number(
              clarified.amount
            ),

          note:
            clarified.note || '',

          date:
            clarified.date || 'today',

        },

      });

    }


    // =================================================
    // MATCHED
    // =================================================

    if (
      matchResult.status ===
      'matched'
    ) {

      return res.json({

        success: true,

        needs_clarification:
          false,

        account_type:
          'customer',

        customer_found:
          true,

        reason:
          'CUSTOMER_FOUND',

        message:
          'Customer found. Ready for confirmation.',

        customer: {

          id:
            matchResult.customer.id,

          name:
            matchResult.customer.name,

          mobile:
            matchResult.customer.mobile,

          is_new:
            false,

        },

        transaction: {

          account_type:
            'customer',

          intent:
            clarified.intent,

          person_name:
            clarified.person_name,

          amount:
            Number(
              clarified.amount
            ),

          note:
            clarified.note || '',

          date:
            clarified.date || 'today',

        },

      });

    }


    // =================================================
    // NOT FOUND
    // =================================================

    return res.json({

      success: true,

      needs_clarification:
        false,

      account_type:
        'customer',

      customer_found:
        false,

      reason:
        'PERSON_NOT_FOUND',

      message:
        `Customer "${clarified.person_name}" was not found. A new customer can be created after confirmation.`,

      customer: {

        id:
          null,

        name:
          clarified.person_name.trim(),

        mobile:
          null,

        is_new:
          true,

      },

      transaction: {

        account_type:
          'customer',

        intent:
          clarified.intent,

        person_name:
          clarified.person_name,

        amount:
          Number(
            clarified.amount
          ),

        note:
          clarified.note || '',

        date:
          clarified.date || 'today',

      },

    });


  } catch (error) {

    console.error(
      '==================================='
    );

    console.error(
      'VOICE CLARIFICATION ERROR'
    );

    console.error(error);

    console.error(
      '==================================='
    );


    return res.status(500).json({

      success: false,

      reason:
        'VOICE_CLARIFY_SERVER_ERROR',

      message:
        error.message ||
        'Failed to clarify voice input',

    });

  }

});

module.exports = router;