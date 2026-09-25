// const express = require('express');

// const {
//   parseVoiceText,
//   clarifyVoiceTransaction,
// } = require('./services/voiceParser');

// const {
//   findCustomerByName,
// } = require('./services/customerMatcher');

// const {
//   findSupplierByName,
// } = require('./services/supplierMatcher');


// const supabase = require('../config/supabase');

// const {
//   getBusinessOwnerId,
//   requirePermission,
// } = require('../utils/businessAccess');

// const router = express.Router();


// // =====================================================
// // POST /api/voice/parse
// // =====================================================

// router.post('/parse', async (req, res) => {
//   try {
//     const { text, user_id } = req.body;

//     if (!text || !user_id) {
//       return res.status(400).json({
//         success: false,
//         message: 'text and user_id are required',
//       });
//     }

//     // ======================================
//     // VOICE PERMISSION
//     // ======================================

//     await requirePermission(
//       user_id,
//       'can_use_voice'
//     );

//     const businessOwnerId =
//       await getBusinessOwnerId(user_id);

//     console.log('🎤 Voice Parse');
//     console.log('User ID:', user_id);
//     console.log('Business Owner ID:', businessOwnerId);

//     const parsed = await parseVoiceText(text);

//     console.log('🤖 Parsed:', parsed);

//     if (parsed.needs_clarification) {
//       return res.json({
//         success: true,
//         needs_clarification: true,
//         question: parsed.clarification_question,
//         transaction: parsed,
//       });
//     }

//     if (!parsed.account_type) {
//       return res.status(400).json({
//         success: false,
//         message: 'Account type could not be detected',
//       });
//     }

//     if (!parsed.intent) {
//       return res.status(400).json({
//         success: false,
//         message: 'Transaction intent could not be detected',
//       });
//     }

//     if (!parsed.person_name) {
//       return res.status(400).json({
//         success: false,
//         message: 'Person name could not be detected',
//       });
//     }

//     if (
//       parsed.amount === null ||
//       parsed.amount === undefined ||
//       Number(parsed.amount) <= 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: 'Valid amount could not be detected',
//       });
//     }

//     if (parsed.account_type === 'supplier') {
//       const match = await findSupplierByName(
//         businessOwnerId,
//         parsed.person_name
//       );

//       console.log('🏪 Supplier Match:', match);

//       return res.json({
//         success: true,
//         needs_clarification: false,
//         transaction: {
//           ...parsed,
//           user_id: businessOwnerId,
//         },
//         match,
//       });
//     }

//     if (parsed.account_type === 'customer') {
//       const match = await findCustomerByName(
//         businessOwnerId,
//         parsed.person_name
//       );

//       console.log('👤 Customer Match:', match);

//       return res.json({
//         success: true,
//         needs_clarification: false,
//         transaction: {
//           ...parsed,
//           user_id: businessOwnerId,
//         },
//         match,
//       });
//     }

//     return res.status(400).json({
//       success: false,
//       message: 'Invalid account type',
//     });

//   } catch (error) {
//     console.error('❌ Voice Parse Error:', error);

//     if (error.statusCode === 403) {
//       return res.status(403).json({
//         success: false,
//         message: 'You do not have permission to use voice',
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: 'Failed to parse voice input',
//       error: error.message,
//     });
//   }
// });


// // =====================================================
// // POST /api/voice/confirm
// // =====================================================

// router.post('/confirm', async (req, res) => {
//   try {
//     const {
//       user_id,
//       account_type,
//       customer_id,
//       customer_name,
//       supplier_id,
//       supplier_name,
//       intent,
//       amount,
//       note,
//       mobile,
//     } = req.body;

//     if (!user_id) {
//       return res.status(400).json({
//         success: false,
//         message: 'user_id is required',
//       });
//     }

//     // ======================================
//     // VOICE PERMISSION
//     // ======================================

//     await requirePermission(
//       user_id,
//       'can_use_voice'
//     );

//     // ======================================
//     // TRANSACTION PERMISSION
//     // ======================================

//     await requirePermission(
//       user_id,
//       'can_create_transactions'
//     );

//     if (!account_type) {
//       return res.status(400).json({
//         success: false,
//         message: 'account_type is required',
//       });
//     }

//     if (!intent) {
//       return res.status(400).json({
//         success: false,
//         message: 'intent is required',
//       });
//     }

//     if (
//       amount === undefined ||
//       amount === null ||
//       Number(amount) <= 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: 'Valid amount is required',
//       });
//     }

//     const businessOwnerId =
//       await getBusinessOwnerId(user_id);

//     console.log('✅ Voice Confirm');
//     console.log('User ID:', user_id);
//     console.log('Business Owner ID:', businessOwnerId);

//     // =================================================
//     // CUSTOMER
//     // =================================================

//     if (account_type === 'customer') {
//       let customer = null;

//       if (customer_id) {
//         const { data, error } = await supabase
//           .from('customers')
//           .select('id, user_id, name, mobile')
//           .eq('id', customer_id)
//           .eq('user_id', businessOwnerId)
//           .single();

//         if (error && error.code !== 'PGRST116') {
//           throw error;
//         }

//         customer = data;
//       }

//       if (!customer && customer_name) {
//         const match = await findCustomerByName(
//           businessOwnerId,
//           customer_name
//         );

//         if (match && match.customer) {
//           customer = match.customer;
//         } else if (match && match.id) {
//           customer = match;
//         }
//       }

//       if (!customer) {
//         const { data, error } = await supabase
//           .from('customers')
//           .insert([
//             {
//               user_id: businessOwnerId,
//               name: customer_name,
//               mobile: mobile || null,
//             },
//           ])
//           .select('id, user_id, name, mobile')
//           .single();

//         if (error) {
//           throw error;
//         }

//         customer = data;

//         console.log(
//           '👤 New Customer Created:',
//           customer.id
//         );
//       }

//       let transactionType;

//       if (intent === 'credit_given') {
//         transactionType = 'credit';
//       } else if (intent === 'payment_received') {
//         transactionType = 'payment';
//       } else {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid customer transaction intent',
//         });
//       }

//       const {
//         data: transaction,
//         error: transactionError,
//       } = await supabase
//         .from('transactions')
//         .insert([
//           {
//             user_id: businessOwnerId,
//             customer_id: customer.id,
//             type: transactionType,
//             amount: Number(amount),
//             description: note || null,
//           },
//         ])
//         .select()
//         .single();

//       if (transactionError) {
//         throw transactionError;
//       }

//       console.log(
//         '💰 Customer Transaction Created:',
//         transaction.id
//       );

//       return res.json({
//         success: true,
//         message: 'Customer transaction created successfully',
//         transaction,
//         customer,
//       });
//     }


//     // =================================================
//     // SUPPLIER
//     // =================================================

//     if (account_type === 'supplier') {
//       let supplier = null;

//       if (supplier_id) {
//         const { data, error } = await supabase
//           .from('suppliers')
//           .select('id, user_id, name, mobile')
//           .eq('id', supplier_id)
//           .eq('user_id', businessOwnerId)
//           .single();

//         if (error && error.code !== 'PGRST116') {
//           throw error;
//         }

//         supplier = data;
//       }

//       if (!supplier && supplier_name) {
//         const match = await findSupplierByName(
//           businessOwnerId,
//           supplier_name
//         );

//         if (match && match.supplier) {
//           supplier = match.supplier;
//         } else if (match && match.id) {
//           supplier = match;
//         }
//       }

//       if (!supplier) {
//         const { data, error } = await supabase
//           .from('suppliers')
//           .insert([
//             {
//               user_id: businessOwnerId,
//               name: supplier_name,
//               mobile: mobile || null,
//             },
//           ])
//           .select('id, user_id, name, mobile')
//           .single();

//         if (error) {
//           throw error;
//         }

//         supplier = data;

//         console.log(
//           '🏪 New Supplier Created:',
//           supplier.id
//         );
//       }

//       let transactionType;

//       if (intent === 'purchase_from_supplier') {
//         transactionType = 'purchase';
//       } else if (intent === 'payment_to_supplier') {
//         transactionType = 'payment';
//       } else {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid supplier transaction intent',
//         });
//       }

//       const {
//         data: transaction,
//         error: transactionError,
//       } = await supabase
//         .from('transactions')
//         .insert([
//           {
//             user_id: businessOwnerId,
//             supplier_id: supplier.id,
//             type: transactionType,
//             amount: Number(amount),
//             description: note || null,
//           },
//         ])
//         .select()
//         .single();

//       if (transactionError) {
//         throw transactionError;
//       }

//       console.log(
//         '💰 Supplier Transaction Created:',
//         transaction.id
//       );

//       return res.json({
//         success: true,
//         message: 'Supplier transaction created successfully',
//         transaction,
//         supplier,
//       });
//     }

//     return res.status(400).json({
//       success: false,
//       message: 'Invalid account type',
//     });

//   } catch (error) {
//     console.error('❌ Voice Confirm Error:', error);

//     if (error.statusCode === 403) {
//       return res.status(403).json({
//         success: false,
//         message: 'You do not have permission to use voice transactions',
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: 'Failed to confirm voice transaction',
//       error: error.message,
//     });
//   }
// });


// // =====================================================
// // POST /api/voice/clarify
// // =====================================================

// router.post('/clarify', async (req, res) => {
//   try {
//     const {
//       user_id,
//       original_text,
//       question,
//       answer,
//     } = req.body;

//     if (!user_id) {
//       return res.status(400).json({
//         success: false,
//         message: 'user_id is required',
//       });
//     }

//     // ======================================
//     // VOICE PERMISSION
//     // ======================================

//     await requirePermission(
//       user_id,
//       'can_use_voice'
//     );

//     if (!original_text || !question || !answer) {
//       return res.status(400).json({
//         success: false,
//         message: 'original_text, question and answer are required',
//       });
//     }

//     const businessOwnerId =
//       await getBusinessOwnerId(user_id);

//     console.log('🎤 Voice Clarify');
//     console.log('User ID:', user_id);
//     console.log('Business Owner ID:', businessOwnerId);

//     const clarified = await clarifyVoiceTransaction({
//       originalText: original_text,
//       question,
//       answer,
//     });

//     console.log('🤖 Clarified:', clarified);

//     if (clarified.needs_clarification) {
//       return res.json({
//         success: true,
//         needs_clarification: true,
//         question: clarified.clarification_question,
//         transaction: clarified,
//       });
//     }

//     if (!clarified.account_type) {
//       return res.status(400).json({
//         success: false,
//         message: 'Account type could not be detected',
//       });
//     }

//     if (!clarified.intent) {
//       return res.status(400).json({
//         success: false,
//         message: 'Transaction intent could not be detected',
//       });
//     }

//     if (!clarified.person_name) {
//       return res.status(400).json({
//         success: false,
//         message: 'Person name could not be detected',
//       });
//     }

//     if (
//       clarified.amount === null ||
//       clarified.amount === undefined ||
//       Number(clarified.amount) <= 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: 'Valid amount could not be detected',
//       });
//     }

//     if (clarified.account_type === 'supplier') {
//       const match = await findSupplierByName(
//         businessOwnerId,
//         clarified.person_name
//       );

//       console.log('🏪 Supplier Match:', match);

//       return res.json({
//         success: true,
//         needs_clarification: false,
//         transaction: {
//           ...clarified,
//           user_id: businessOwnerId,
//         },
//         match,
//       });
//     }

//     if (clarified.account_type === 'customer') {
//       const match = await findCustomerByName(
//         businessOwnerId,
//         clarified.person_name
//       );

//       console.log('👤 Customer Match:', match);

//       return res.json({
//         success: true,
//         needs_clarification: false,
//         transaction: {
//           ...clarified,
//           user_id: businessOwnerId,
//         },
//         match,
//       });
//     }

//     return res.status(400).json({
//       success: false,
//       message: 'Invalid account type',
//     });

//   } catch (error) {
//     console.error('❌ Voice Clarify Error:', error);

//     if (error.statusCode === 403) {
//       return res.status(403).json({
//         success: false,
//         message: 'You do not have permission to use voice',
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: 'Failed to clarify voice transaction',
//       error: error.message,
//     });
//   }
// });


// module.exports = router;
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

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
// GROQ
// =====================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


// =====================================================
// AUDIO UPLOAD DIRECTORY
// =====================================================

const uploadDir = path.join(
  __dirname,
  '../tmp'
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}


// =====================================================
// MULTER STORAGE
// IMPORTANT:
// Preserve .m4a / original audio extension.
// =====================================================

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {

    const originalExtension =
      path.extname(
        file.originalname || ''
      );

    const extension =
      originalExtension || '.m4a';

    const uniqueName =
      `voice-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)}${extension}`;

    cb(
      null,
      uniqueName
    );
  },

});


// =====================================================
// MULTER
// =====================================================

const upload = multer({

  storage,

  limits: {
    fileSize:
      25 * 1024 * 1024,
  },

  fileFilter: (
    req,
    file,
    cb
  ) => {

    console.log(
      '🎵 Uploaded audio:',
      {
        originalname:
          file.originalname,

        mimetype:
          file.mimetype,
      }
    );

    cb(
      null,
      true
    );
  },

});


// =====================================================
// POST /api/voice/transcribe
// =====================================================

router.post(
  '/transcribe',
  upload.single('audio'),
  async (req, res) => {

    let filePath = null;

    try {

      const {
        user_id,
        language,
      } = req.body;


      // ======================================
      // LOG
      // ======================================

      console.log('');
      console.log(
        '===================================='
      );
      console.log(
        '🎤 VOICE TRANSCRIPTION'
      );
      console.log(
        '===================================='
      );

      console.log(
        'User ID:',
        user_id
      );

      console.log(
        'Language:',
        language
      );


      // ======================================
      // USER CHECK
      // ======================================

      if (!user_id) {

        return res.status(400).json({
          success: false,
          message:
            'user_id is required',
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
      // AUDIO CHECK
      // ======================================

      if (!req.file) {

        return res.status(400).json({
          success: false,
          message:
            'Audio file is required',
        });

      }


      // ======================================
      // FILE PATH
      // ======================================

      filePath =
        req.file.path;


      console.log(
        '📁 Original file:',
        req.file.originalname
      );

      console.log(
        '📁 Saved file:',
        req.file.filename
      );

      console.log(
        '📁 MIME type:',
        req.file.mimetype
      );

      console.log(
        '📁 Size:',
        req.file.size
      );

      console.log(
        '📁 File path:',
        filePath
      );


      // ======================================
      // FILE EXISTS CHECK
      // ======================================

      if (
        !fs.existsSync(
          filePath
        )
      ) {

        return res.status(500).json({
          success: false,
          message:
            'Uploaded audio file was not found',
        });

      }


      // ======================================
      // LANGUAGE
      // ======================================

 let sttLanguage = null;

if (language) {
  const selectedLanguage =
    String(language).toLowerCase();

  /*
   * Hindi / Hinglish / Indian English
   * can be mixed in the same sentence.
   *
   * Do NOT force Whisper to English
   * because Hindi words like:
   * "se", "ka", "maal", "baaki", "aaya"
   * can get badly interpreted.
   */

  if (
    selectedLanguage === 'hi-in' ||
    selectedLanguage === 'hi'
  ) {
    sttLanguage = 'hi';
  }

  /*
   * For en-IN, leave language empty.
   * Whisper will auto-detect Hindi/Hinglish/English.
   */
  else if (
    selectedLanguage === 'en-in' ||
    selectedLanguage === 'en'
  ) {
    sttLanguage = null;
  }

  else {
    sttLanguage =
      selectedLanguage
        .split('-')[0];
  }
}

      console.log(
        '🌐 STT Language:',
        sttLanguage ||
          'auto-detect'
      );


      // ======================================
      // GROQ WHISPER
      // ======================================

      console.log(
        '🎙️ Sending audio to Groq Whisper...'
      );


      const transcription =
        await groq.audio.transcriptions.create({

          /*
           * IMPORTANT:
           * Because Multer now preserves
           * the .m4a extension, Groq can
           * correctly identify the format.
           */
          file:
            fs.createReadStream(
              filePath
            ),

          model:
            'whisper-large-v3',

          response_format:
            'json',

          ...(sttLanguage
            ? {
                language:
                  sttLanguage,
              }
            : {}),

          temperature: 0,

          prompt:
            'Indian business transaction voice input. ' +

            'Understand Hindi, Hinglish, Roman Hindi, ' +
            'Gujarati, Marathi, Bengali, Tamil, Telugu, ' +
            'Kannada, Malayalam and Indian English. ' +

            'Users may speak in mixed Hindi and English. ' +

            'Preserve customer names, supplier names, ' +
            'shop names and business names accurately. ' +

            'Examples include NK Traders, Paras Medical, ' +
            'Rahul, Suresh, Ramesh, Rakesh Traders, ' +
            'New Star Medical and Khan General Store. ' +

            'Preserve numbers and Indian currency amounts accurately. ' +

            'Common phrases include rupaye, rupees, hazaar, lakh, ' +
            'dena hai, lena hai, maal liya, payment diya, ' +
            'payment mila, baaki, udhaar, jama, receive and credit.',

        });


      // ======================================
      // GET TEXT
      // ======================================

      const text =
        transcription?.text
          ?.trim() || '';


      console.log(
        '📝 TRANSCRIBED TEXT:'
      );

      console.log(
        text
      );


      // ======================================
      // EMPTY TRANSCRIPTION
      // ======================================

      if (!text) {

        return res.status(400).json({
          success: false,
          message:
            'Could not understand the audio',
        });

      }


      // ======================================
      // RESPONSE
      // ======================================

      return res.json({

        success: true,

        text,

        language:
          sttLanguage || null,

      });

    } catch (error) {

      console.error('');

      console.error(
        '===================================='
      );

      console.error(
        '❌ VOICE TRANSCRIPTION ERROR'
      );

      console.error(
        '===================================='
      );

      console.error(
        error
      );


      // ======================================
      // PERMISSION ERROR
      // ======================================

      if (
        error.statusCode === 403
      ) {

        return res.status(403).json({

          success: false,

          message:
            'You do not have permission to use voice',

        });

      }


      // ======================================
      // GROQ ERROR
      // ======================================

      return res.status(500).json({

        success: false,

        message:
          'Failed to transcribe voice input',

        error:
          error?.message ||
          'Unknown transcription error',

      });

    } finally {

      // ======================================
      // DELETE TEMP AUDIO
      // ======================================

      if (filePath) {

        try {

          if (
            fs.existsSync(
              filePath
            )
          ) {

            fs.unlinkSync(
              filePath
            );

            console.log(
              '🗑️ Temporary audio deleted'
            );

          }

        } catch (
          deleteError
        ) {

          console.error(
            '⚠️ Failed to delete temporary audio:',
            deleteError.message
          );

        }

      }

    }

  }
);


// =====================================================
// POST /api/voice/parse
// =====================================================

router.post(
  '/parse',
  async (req, res) => {

    try {

      const {
        text,
        user_id,
      } = req.body;


      // ======================================
      // VALIDATION
      // ======================================

      if (
        !text ||
        !user_id
      ) {

        return res.status(400).json({

          success: false,

          message:
            'text and user_id are required',

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
      // BUSINESS OWNER
      // ======================================

      const businessOwnerId =
        await getBusinessOwnerId(
          user_id
        );


      console.log(
        '🎤 Voice Parse'
      );

      console.log(
        'User ID:',
        user_id
      );

      console.log(
        'Business Owner ID:',
        businessOwnerId
      );


      // ======================================
      // AI PARSER
      // ======================================

      const parsed =
        await parseVoiceText(
          text
        );


      console.log(
        '🤖 Parsed:',
        parsed
      );


      // ======================================
      // CLARIFICATION REQUIRED
      // ======================================

      if (
        parsed.needs_clarification
      ) {

        return res.json({

          success: true,

          needs_clarification:
            true,

          question:
            parsed.clarification_question,

          transaction:
            parsed,

        });

      }


      // ======================================
      // VALIDATION
      // ======================================

      if (
        !parsed.account_type
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Account type could not be detected',

        });

      }


      if (
        !parsed.intent
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Transaction intent could not be detected',

        });

      }


      if (
        !parsed.person_name
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Person name could not be detected',

        });

      }


      if (
        parsed.amount === null ||
        parsed.amount === undefined ||
        Number(parsed.amount) <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Valid amount could not be detected',

        });

      }


      // ======================================
      // SUPPLIER
      // ======================================

      if (
        parsed.account_type ===
        'supplier'
      ) {

        const match =
          await findSupplierByName(
            businessOwnerId,
            parsed.person_name
          );


        console.log(
          '🏪 Supplier Match:',
          match
        );


        return res.json({

          success: true,

          needs_clarification:
            false,

          transaction: {

            ...parsed,

            user_id:
              businessOwnerId,

          },

          match,

        });

      }


      // ======================================
      // CUSTOMER
      // ======================================

      if (
        parsed.account_type ===
        'customer'
      ) {

        const match =
          await findCustomerByName(
            businessOwnerId,
            parsed.person_name
          );


        console.log(
          '👤 Customer Match:',
          match
        );


        return res.json({

          success: true,

          needs_clarification:
            false,

          transaction: {

            ...parsed,

            user_id:
              businessOwnerId,

          },

          match,

        });

      }


      // ======================================
      // INVALID ACCOUNT
      // ======================================

      return res.status(400).json({

        success: false,

        message:
          'Invalid account type',

      });


    } catch (error) {

      console.error(
        '❌ Voice Parse Error:',
        error
      );


      if (
        error.statusCode === 403
      ) {

        return res.status(403).json({

          success: false,

          message:
            'You do not have permission to use voice',

        });

      }


      return res.status(500).json({

        success: false,

        message:
          'Failed to parse voice input',

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// POST /api/voice/confirm
// =====================================================

router.post(
  '/confirm',
  async (req, res) => {

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


      // ======================================
      // USER CHECK
      // ======================================

      if (!user_id) {

        return res.status(400).json({

          success: false,

          message:
            'user_id is required',

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


      // ======================================
      // ACCOUNT TYPE
      // ======================================

      if (!account_type) {

        return res.status(400).json({

          success: false,

          message:
            'account_type is required',

        });

      }


      // ======================================
      // INTENT
      // ======================================

      if (!intent) {

        return res.status(400).json({

          success: false,

          message:
            'intent is required',

        });

      }


      // ======================================
      // AMOUNT
      // ======================================

      if (
        amount === undefined ||
        amount === null ||
        Number(amount) <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Valid amount is required',

        });

      }


      // ======================================
      // BUSINESS OWNER
      // ======================================

      const businessOwnerId =
        await getBusinessOwnerId(
          user_id
        );


      console.log(
        '✅ Voice Confirm'
      );

      console.log(
        'User ID:',
        user_id
      );

      console.log(
        'Business Owner ID:',
        businessOwnerId
      );


      // =================================================
      // CUSTOMER
      // =================================================

      if (
        account_type ===
        'customer'
      ) {

        let customer = null;


        // ======================================
        // FIND CUSTOMER BY ID
        // ======================================

        if (customer_id) {

          const {
            data,
            error,
          } = await supabase

            .from('customers')

            .select(
              'id, user_id, name, mobile'
            )

            .eq(
              'id',
              customer_id
            )

            .eq(
              'user_id',
              businessOwnerId
            )

            .single();


          if (
            error &&
            error.code !==
              'PGRST116'
          ) {

            throw error;

          }


          customer =
            data;

        }


        // ======================================
        // FIND CUSTOMER BY NAME
        // ======================================

        if (
          !customer &&
          customer_name
        ) {

          const match =
            await findCustomerByName(
              businessOwnerId,
              customer_name
            );


          if (
            match &&
            match.customer
          ) {

            customer =
              match.customer;

          } else if (
            match &&
            match.id
          ) {

            customer =
              match;

          }

        }


        // ======================================
        // CREATE CUSTOMER
        // ======================================

        if (!customer) {

          const {
            data,
            error,
          } = await supabase

            .from('customers')

            .insert([
              {

                user_id:
                  businessOwnerId,

                name:
                  customer_name,

                mobile:
                  mobile ||
                  null,

              },
            ])

            .select(
              'id, user_id, name, mobile'
            )

            .single();


          if (error) {
            throw error;
          }


          customer =
            data;


          console.log(
            '👤 New Customer Created:',
            customer.id
          );

        }


        // ======================================
        // TRANSACTION TYPE
        // ======================================

        let transactionType;


        if (
          intent ===
          'credit_given'
        ) {

          transactionType =
            'credit';

        } else if (
          intent ===
          'payment_received'
        ) {

          transactionType =
            'payment';

        } else {

          return res.status(400).json({

            success: false,

            message:
              'Invalid customer transaction intent',

          });

        }


        // ======================================
        // INSERT TRANSACTION
        // ======================================

        const {
          data: transaction,
          error:
            transactionError,
        } = await supabase

          .from('transactions')

          .insert([
            {

              user_id:
                businessOwnerId,

              customer_id:
                customer.id,

              type:
                transactionType,

              amount:
                Number(amount),

              description:
                note ||
                null,

            },
          ])

          .select()

          .single();


        if (
          transactionError
        ) {

          throw transactionError;

        }


        console.log(
          '💰 Customer Transaction Created:',
          transaction.id
        );


        return res.json({

          success: true,

          message:
            'Customer transaction created successfully',

          transaction,

          customer,

        });

      }


      // =================================================
      // SUPPLIER
      // =================================================

      if (
        account_type ===
        'supplier'
      ) {

        let supplier = null;


        // ======================================
        // FIND SUPPLIER BY ID
        // ======================================

        if (supplier_id) {

          const {
            data,
            error,
          } = await supabase

            .from('suppliers')

            .select(
              'id, user_id, name, mobile'
            )

            .eq(
              'id',
              supplier_id
            )

            .eq(
              'user_id',
              businessOwnerId
            )

            .single();


          if (
            error &&
            error.code !==
              'PGRST116'
          ) {

            throw error;

          }


          supplier =
            data;

        }


        // ======================================
        // FIND SUPPLIER BY NAME
        // ======================================

        if (
          !supplier &&
          supplier_name
        ) {

          const match =
            await findSupplierByName(
              businessOwnerId,
              supplier_name
            );


          if (
            match &&
            match.supplier
          ) {

            supplier =
              match.supplier;

          } else if (
            match &&
            match.id
          ) {

            supplier =
              match;

          }

        }


        // ======================================
        // CREATE SUPPLIER
        // ======================================

        if (!supplier) {

          const {
            data,
            error,
          } = await supabase

            .from('suppliers')

            .insert([
              {

                user_id:
                  businessOwnerId,

                name:
                  supplier_name,

                mobile:
                  mobile ||
                  null,

              },
            ])

            .select(
              'id, user_id, name, mobile'
            )

            .single();


          if (error) {
            throw error;
          }


          supplier =
            data;


          console.log(
            '🏪 New Supplier Created:',
            supplier.id
          );

        }


        // ======================================
        // TRANSACTION TYPE
        // ======================================

        let transactionType;


        if (
          intent ===
          'purchase_from_supplier'
        ) {

          transactionType =
            'purchase';

        } else if (
          intent ===
          'payment_to_supplier'
        ) {

          transactionType =
            'payment';

        } else {

          return res.status(400).json({

            success: false,

            message:
              'Invalid supplier transaction intent',

          });

        }


        // ======================================
        // INSERT TRANSACTION
        // ======================================

        const {
          data: transaction,
          error:
            transactionError,
        } = await supabase

          .from('transactions')

          .insert([
            {

              user_id:
                businessOwnerId,

              supplier_id:
                supplier.id,

              type:
                transactionType,

              amount:
                Number(amount),

              description:
                note ||
                null,

            },
          ])

          .select()

          .single();


        if (
          transactionError
        ) {

          throw transactionError;

        }


        console.log(
          '💰 Supplier Transaction Created:',
          transaction.id
        );


        return res.json({

          success: true,

          message:
            'Supplier transaction created successfully',

          transaction,

          supplier,

        });

      }


      // ======================================
      // INVALID ACCOUNT
      // ======================================

      return res.status(400).json({

        success: false,

        message:
          'Invalid account type',

      });


    } catch (error) {

      console.error(
        '❌ Voice Confirm Error:',
        error
      );


      if (
        error.statusCode === 403
      ) {

        return res.status(403).json({

          success: false,

          message:
            'You do not have permission to use voice transactions',

        });

      }


      return res.status(500).json({

        success: false,

        message:
          'Failed to confirm voice transaction',

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// POST /api/voice/clarify
// =====================================================

router.post(
  '/clarify',
  async (req, res) => {

    try {

      const {
        user_id,
        original_text,
        question,
        answer,
      } = req.body;


      // ======================================
      // USER CHECK
      // ======================================

      if (!user_id) {

        return res.status(400).json({

          success: false,

          message:
            'user_id is required',

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
      // REQUIRED FIELDS
      // ======================================

      if (
        !original_text ||
        !question ||
        !answer
      ) {

        return res.status(400).json({

          success: false,

          message:
            'original_text, question and answer are required',

        });

      }


      // ======================================
      // BUSINESS OWNER
      // ======================================

      const businessOwnerId =
        await getBusinessOwnerId(
          user_id
        );


      console.log(
        '🎤 Voice Clarify'
      );

      console.log(
        'User ID:',
        user_id
      );

      console.log(
        'Business Owner ID:',
        businessOwnerId
      );


      // ======================================
      // AI CLARIFICATION
      // ======================================

      const clarified =
        await clarifyVoiceTransaction({

          originalText:
            original_text,

          question:
            question,

          answer:
            answer,

        });


      console.log(
        '🤖 Clarified:',
        clarified
      );


      // ======================================
      // MORE CLARIFICATION
      // ======================================

      if (
        clarified.needs_clarification
      ) {

        return res.json({

          success: true,

          needs_clarification:
            true,

          question:
            clarified.clarification_question,

          transaction:
            clarified,

        });

      }


      // ======================================
      // VALIDATION
      // ======================================

      if (
        !clarified.account_type
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Account type could not be detected',

        });

      }


      if (
        !clarified.intent
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Transaction intent could not be detected',

        });

      }


      if (
        !clarified.person_name
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Person name could not be detected',

        });

      }


      if (
        clarified.amount ===
          null ||
        clarified.amount ===
          undefined ||
        Number(
          clarified.amount
        ) <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Valid amount could not be detected',

        });

      }


      // ======================================
      // SUPPLIER MATCH
      // ======================================

      if (
        clarified.account_type ===
        'supplier'
      ) {

        const match =
          await findSupplierByName(
            businessOwnerId,
            clarified.person_name
          );


        console.log(
          '🏪 Supplier Match:',
          match
        );


        return res.json({

          success: true,

          needs_clarification:
            false,

          transaction: {

            ...clarified,

            user_id:
              businessOwnerId,

          },

          match,

        });

      }


      // ======================================
      // CUSTOMER MATCH
      // ======================================

      if (
        clarified.account_type ===
        'customer'
      ) {

        const match =
          await findCustomerByName(
            businessOwnerId,
            clarified.person_name
          );


        console.log(
          '👤 Customer Match:',
          match
        );


        return res.json({

          success: true,

          needs_clarification:
            false,

          transaction: {

            ...clarified,

            user_id:
              businessOwnerId,

          },

          match,

        });

      }


      // ======================================
      // INVALID ACCOUNT
      // ======================================

      return res.status(400).json({

        success: false,

        message:
          'Invalid account type',

      });

    } catch (error) {

      console.error(
        '❌ Voice Clarify Error:',
        error
      );


      if (
        error.statusCode === 403
      ) {

        return res.status(403).json({

          success: false,

          message:
            'You do not have permission to use voice',

        });

      }


      return res.status(500).json({

        success: false,

        message:
          'Failed to clarify voice transaction',

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;