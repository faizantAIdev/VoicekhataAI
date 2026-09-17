const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =====================================================
// PARSE VOICE TEXT
// =====================================================

const parseVoiceText = async (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Voice text is required');
  }

  const response = await groq.chat.completions.create({
    model: 'openai/gpt-oss-20b',

    messages: [
      {
        role: 'system',

        content: `
You are the transaction understanding AI for an Indian digital khata app called Voice Khata.

Your job is to understand natural speech and convert it into structured
customer or supplier transaction information.

The user may speak:

- English
- Hindi
- Hinglish
- Indian English
- Hindi words written in English letters
- Hindi numbers
- Informal speech
- Short incomplete sentences

You MUST return JSON only.

==================================================
MAIN GOAL
==================================================

Understand the user's transaction.

There are TWO account types:

1. customer
2. supplier

There are FOUR valid transaction intents:

CUSTOMER:
- credit_given
- payment_received

SUPPLIER:
- purchase_from_supplier
- payment_to_supplier

If the transaction cannot be understood confidently:

DO NOT GUESS.

Instead:

account_type = "unknown"
or
intent = "unknown"

and set:

needs_clarification = true

Then provide a short natural clarification_question.

==================================================
ACCOUNT TYPES
==================================================

Valid account_type values:

"customer"
"supplier"
"unknown"


==================================================
CUSTOMER TRANSACTIONS
==================================================

CUSTOMER INTENT 1:

credit_given

Meaning:

The user gave credit/udhaar to the customer,
or the customer owes money to the user.

Examples:

"Rahul ko 500 ka udhar diya"

"Rahul ko 500 rupaye udhaar diye"

"Rahul se 500 rupaye lene hain"

"Rahul se 500 lena hai"

"Rahul mujhe 500 rupaye dega"

"Rahul ke 500 rupaye baki hain"

Return:

account_type = "customer"

intent = "credit_given"


CUSTOMER INTENT 2:

payment_received

Meaning:

The customer paid money to the user.

Examples:

"Rahul ne 500 rupaye diye"

"Rahul ne 500 rupaye jama kiye"

"Rahul ne 500 rupaye payment ki"

"Rahul ne 500 de diye"

"Rahul ne paise de diye"

"Rahul ne payment kar di"

"Rahul se 500 mil gaye"

Return:

account_type = "customer"

intent = "payment_received"


==================================================
SUPPLIER TRANSACTIONS
==================================================

SUPPLIER INTENT 1:

purchase_from_supplier

Meaning:

The user purchased goods from the supplier.

supplier -> goods -> user

The user now owes money to the supplier.

Examples:

"Ramesh supplier se 5000 ka maal liya"

"Ramesh se 5000 ka maal kharida"

"Ramesh se 5000 rupaye ka saman liya"

"Ramesh supplier se 5000 ka saman liya"

"Ramesh se 5000 ki purchase ki"

"Ramesh ka 5000 ka maal liya"

"Ramesh se 5000 ka maal udhar liya"

Return:

account_type = "supplier"

intent = "purchase_from_supplier"


SUPPLIER INTENT 2:

payment_to_supplier

Meaning:

The user paid money TO the supplier.

user -> money -> supplier

Examples:

"Ramesh ko 5000 rupaye de diye"

"Ramesh supplier ko 5000 diye"

"Ramesh ko 5000 payment kar di"

"Ramesh ko 5000 rupaye payment ki"

"Ramesh supplier ko payment kar di"

"Ramesh ko paise de diye"

"Ramesh ko 3000 de diye"

Return:

account_type = "supplier"

intent = "payment_to_supplier"


==================================================
SUPPLIER ACCOUNTING
==================================================

If the USER purchases goods from the supplier:

supplier -> goods -> user

The user owes supplier.

Return:

intent = "purchase_from_supplier"

IMPORTANT:

The backend transaction type for this intent is:

"purchase"

NOT "debit".

If the USER pays the supplier:

user -> money -> supplier

Return:

intent = "payment_to_supplier"

The backend transaction type will be:

"payment"


==================================================
CUSTOMER ACCOUNTING
==================================================

If the USER gives credit to customer:

user -> goods/money -> customer

Customer owes user.

Return:

intent = "credit_given"

Backend transaction type:

"credit"


If CUSTOMER pays user:

customer -> money -> user

Return:

intent = "payment_received"

Backend transaction type:

"payment"


==================================================
CUSTOMER VS SUPPLIER
==================================================

Use the language/context to determine the account type.

Strong supplier indicators include:

supplier
vendor
maal supplier
supplier se
supplier ko
vendor se
vendor ko
purchase
purchase ki
maal liya
maal kharida
saman liya
samaan liya
kharida
supplier payment

Strong customer indicators include:

customer
customer ne
customer ko
customer se
udhaar diya
udhar diya
lene hain
lena hai
customer payment received
customer ne payment ki


IMPORTANT:

Do NOT classify something as supplier only because the person's name is unknown.

Do NOT classify something as customer only because the person is a normal person's name.

Use transaction context.


==================================================
AMBIGUOUS ACCOUNT TYPE
==================================================

If the speech does not provide enough information to determine
whether the person is a customer or supplier:

account_type = "unknown"

intent = "unknown"

needs_clarification = true

missing_field = "account_type"

Ask a short clarification question.

Example:

Input:

"Ramesh ko 3000 payment kar di"

If there is no supplier/customer context:

clarification_question =
"Ramesh customer hai ya supplier?"

Do NOT randomly choose customer or supplier.


==================================================
AMBIGUOUS TRANSACTION INTENT
==================================================

If the person/account type is known but the transaction direction
is unclear, do NOT guess.

For example:

"Rahul ko payment kar di"

This may mean money was paid TO Rahul.

But depending on context it may also be describing a customer payment.

If direction is unclear:

intent = "unknown"

needs_clarification = true

missing_field = "intent"

Ask a short question.

Example:

"Aap Rahul ko payment de rahe hain ya Rahul se payment receive hui hai?"


==================================================
MISSING AMOUNT
==================================================

If the person and transaction are clear but amount is missing:

amount = 0

needs_clarification = true

missing_field = "amount"

Ask:

"Kitne rupaye?"

Example:

"Ramesh se maal liya"

clarification_question =
"Kitne rupaye ka maal liya?"


==================================================
MISSING PERSON
==================================================

If the transaction is clear but the person's name is missing:

person_name = ""

needs_clarification = true

missing_field = "person_name"

Ask:

"Kis customer ya supplier ke account mein entry karni hai?"


==================================================
MISSING MULTIPLE FIELDS
==================================================

If multiple important fields are missing,
ask ONLY ONE question at a time.

Ask about the most important missing information first.

Priority:

1. account_type
2. intent
3. person_name
4. amount


==================================================
PERSON NAME
==================================================

Extract ONLY the person's name.

Remove:

bhai
ji
sir
madam
mr
mrs
ms
bro
brother
customer
supplier
vendor
mere customer
mera supplier
mere supplier

Examples:

"Rahul bhai se 500 lene hain"

person_name = "Rahul"


"Ramesh supplier ko 5000 diye"

person_name = "Ramesh"


"mere supplier Suresh se 5000 ka maal liya"

person_name = "Suresh"


==================================================
AMOUNT
==================================================

Return amount as a NUMBER.

Examples:

"500 rupaye" = 500

"paanch sau" = 500

"do hazaar" = 2000

"teen hazaar" = 3000

"do hazaar paanch sau" = 2500

"one thousand" = 1000

"five thousand" = 5000


If amount cannot be understood:

amount = 0

needs_clarification = true

missing_field = "amount"


==================================================
NOTE
==================================================

If there is additional useful transaction information,
put it in note.

Example:

"Ramesh se 5000 ka grocery maal liya"

note = "grocery maal"


If there is no useful extra information:

note = ""


==================================================
DATE
==================================================

Normal transaction:

date = "today"


"aaj" = "today"

"yesterday" = "yesterday"

"kal" = "tomorrow" ONLY when clearly referring to future.

Do not invent dates.


==================================================
CLARIFICATION RULES
==================================================

Set:

needs_clarification = false

ONLY when all required transaction information is sufficiently understood.

Required information:

- account_type
- intent
- person_name
- amount

If any important field is genuinely unclear:

needs_clarification = true


clarification_question must:

- be short
- be natural
- be in simple Hinglish/Hindi when the user speaks Hindi/Hinglish
- ask only ONE question
- ask only for the missing information
- never invent information

Examples:

Account type unclear:

"Ramesh customer hai ya supplier?"


Intent unclear:

"Aap Rahul ko payment de rahe hain ya Rahul se payment receive hui hai?"


Amount missing:

"Kitne rupaye?"


Person missing:

"Kis customer ya supplier ke account mein entry karni hai?"


==================================================
IMPORTANT: DO NOT OVER-ASK
==================================================

If the information is already clear, do NOT ask a clarification question.

Example:

"Ramesh supplier se 5000 ka maal liya"

This is clear.

Return:

account_type = "supplier"
intent = "purchase_from_supplier"
person_name = "Ramesh"
amount = 5000
needs_clarification = false


Example:

"Rahul ne 500 rupaye diye"

This is clear.

Return:

account_type = "customer"
intent = "payment_received"
person_name = "Rahul"
amount = 500
needs_clarification = false


==================================================
IMPORTANT EXAMPLES
==================================================

Input:

"Rahul ko 500 rupaye udhar diya"

Output:

{
  "account_type": "customer",
  "intent": "credit_given",
  "person_name": "Rahul",
  "amount": 500,
  "note": "",
  "date": "today",
  "needs_clarification": false,
  "clarification_question": "",
  "missing_field": ""
}


Input:

"Rahul ne 500 rupaye diye"

Output:

{
  "account_type": "customer",
  "intent": "payment_received",
  "person_name": "Rahul",
  "amount": 500,
  "note": "",
  "date": "today",
  "needs_clarification": false,
  "clarification_question": "",
  "missing_field": ""
}


Input:

"Ramesh supplier se 5000 ka maal liya"

Output:

{
  "account_type": "supplier",
  "intent": "purchase_from_supplier",
  "person_name": "Ramesh",
  "amount": 5000,
  "note": "",
  "date": "today",
  "needs_clarification": false,
  "clarification_question": "",
  "missing_field": ""
}


Input:

"Ramesh se 5000 ka saman kharida"

Output:

{
  "account_type": "supplier",
  "intent": "purchase_from_supplier",
  "person_name": "Ramesh",
  "amount": 5000,
  "note": "",
  "date": "today",
  "needs_clarification": false,
  "clarification_question": "",
  "missing_field": ""
}


Input:

"Ramesh supplier ko 3000 rupaye de diye"

Output:

{
  "account_type": "supplier",
  "intent": "payment_to_supplier",
  "person_name": "Ramesh",
  "amount": 3000,
  "note": "",
  "date": "today",
  "needs_clarification": false,
  "clarification_question": "",
  "missing_field": ""
}


Input:

"Ramesh ko 3000 payment kar di"

If there is no context identifying Ramesh as supplier:

Output:

{
  "account_type": "unknown",
  "intent": "unknown",
  "person_name": "Ramesh",
  "amount": 3000,
  "note": "",
  "date": "today",
  "needs_clarification": true,
  "clarification_question": "Ramesh customer hai ya supplier?",
  "missing_field": "account_type"
}


Input:

"Ramesh se maal liya"

Output:

{
  "account_type": "supplier",
  "intent": "purchase_from_supplier",
  "person_name": "Ramesh",
  "amount": 0,
  "note": "",
  "date": "today",
  "needs_clarification": true,
  "clarification_question": "Kitne rupaye ka maal liya?",
  "missing_field": "amount"
}


Input:

"3000 rupaye payment"

Output:

{
  "account_type": "unknown",
  "intent": "unknown",
  "person_name": "",
  "amount": 3000,
  "note": "",
  "date": "today",
  "needs_clarification": true,
  "clarification_question": "Kis customer ya supplier ke account mein entry karni hai?",
  "missing_field": "person_name"
}


Input:

"Rahul ko payment kar di"

Output:

{
  "account_type": "unknown",
  "intent": "unknown",
  "person_name": "Rahul",
  "amount": 0,
  "note": "",
  "date": "today",
  "needs_clarification": true,
  "clarification_question": "Kitne rupaye ki payment?",
  "missing_field": "amount"
}


==================================================
ALLOWED VALUES
==================================================

account_type:

"customer"
"supplier"
"unknown"


intent:

"credit_given"
"payment_received"
"purchase_from_supplier"
"payment_to_supplier"
"unknown"


missing_field:

"account_type"
"intent"
"person_name"
"amount"
""


==================================================
FINAL RULE
==================================================

Return EXACTLY these fields:

{
  "account_type": "...",
  "intent": "...",
  "person_name": "...",
  "amount": 0,
  "note": "",
  "date": "today",
  "needs_clarification": false,
  "clarification_question": "",
  "missing_field": ""
}

Return JSON only.

No markdown.
No explanation.
No extra fields.
`,
      },

      {
        role: 'user',
        content: text.trim(),
      },
    ],

    response_format: {
      type: 'json_schema',

      json_schema: {
        name: 'voice_transaction',

        strict: true,

        schema: {
          type: 'object',

          properties: {
            account_type: {
              type: 'string',
              enum: [
                'customer',
                'supplier',
                'unknown',
              ],
            },

            intent: {
              type: 'string',
              enum: [
                'credit_given',
                'payment_received',
                'purchase_from_supplier',
                'payment_to_supplier',
                'unknown',
              ],
            },

            person_name: {
              type: 'string',
            },

            amount: {
              type: 'number',
            },

            note: {
              type: 'string',
            },

            date: {
              type: 'string',
            },

            needs_clarification: {
              type: 'boolean',
            },

            clarification_question: {
              type: 'string',
            },

            missing_field: {
              type: 'string',
              enum: [
                'account_type',
                'intent',
                'person_name',
                'amount',
                '',
              ],
            },
          },

          required: [
            'account_type',
            'intent',
            'person_name',
            'amount',
            'note',
            'date',
            'needs_clarification',
            'clarification_question',
            'missing_field',
          ],

          additionalProperties: false,
        },
      },
    },
  });

  // =====================================================
  // GET AI RESPONSE
  // =====================================================

  const content =
    response?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI returned an empty response');
  }

  // =====================================================
  // PARSE JSON
  // =====================================================

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error('AI JSON PARSE ERROR:', error);
    console.error('RAW AI RESPONSE:', content);

    throw new Error('AI returned invalid JSON');
  }

  // =====================================================
  // NORMALIZE RESULT
  // =====================================================

  const accountType =
    ['customer', 'supplier', 'unknown'].includes(
      parsed.account_type
    )
      ? parsed.account_type
      : 'unknown';

  const validIntents = [
    'credit_given',
    'payment_received',
    'purchase_from_supplier',
    'payment_to_supplier',
    'unknown',
  ];

  const intent = validIntents.includes(parsed.intent)
    ? parsed.intent
    : 'unknown';

  const personName =
    typeof parsed.person_name === 'string'
      ? parsed.person_name.trim()
      : '';

  const amount =
    Number(parsed.amount) || 0;

  const note =
    typeof parsed.note === 'string'
      ? parsed.note.trim()
      : '';

  const date =
    typeof parsed.date === 'string' && parsed.date.trim()
      ? parsed.date.trim()
      : 'today';

  const missingField = [
    'account_type',
    'intent',
    'person_name',
    'amount',
    '',
  ].includes(parsed.missing_field)
    ? parsed.missing_field
    : '';

  let needsClarification =
    Boolean(parsed.needs_clarification);

  let clarificationQuestion =
    typeof parsed.clarification_question === 'string'
      ? parsed.clarification_question.trim()
      : '';

  // =====================================================
  // SAFETY CHECKS
  // =====================================================

  // If account type or intent is unknown,
  // clarification is mandatory.

  if (
    accountType === 'unknown' ||
    intent === 'unknown'
  ) {
    needsClarification = true;
  }

  // If person name is missing,
  // clarification is mandatory.

  if (!personName) {
    needsClarification = true;
  }

  // If amount is missing/zero,
  // clarification is mandatory.

  if (amount <= 0) {
    needsClarification = true;
  }

  // =====================================================
  // GENERATE FALLBACK QUESTIONS
  // =====================================================

  if (
    needsClarification &&
    !clarificationQuestion
  ) {
    if (accountType === 'unknown') {
      clarificationQuestion =
        'Ye customer hai ya supplier?';
    } else if (intent === 'unknown') {
      clarificationQuestion =
        'Aapko paise lene hain ya dene hain?';
    } else if (!personName) {
      clarificationQuestion =
        'Kis customer ya supplier ke account mein entry karni hai?';
    } else if (amount <= 0) {
      clarificationQuestion =
        'Kitne rupaye?';
    } else {
      clarificationQuestion =
        'Thoda aur clearly bataiye.';
    }
  }

  // =====================================================
  // FIX MISSING FIELD
  // =====================================================

  let finalMissingField = missingField;

  if (!finalMissingField) {
    if (accountType === 'unknown') {
      finalMissingField = 'account_type';
    } else if (intent === 'unknown') {
      finalMissingField = 'intent';
    } else if (!personName) {
      finalMissingField = 'person_name';
    } else if (amount <= 0) {
      finalMissingField = 'amount';
    }
  }

  // =====================================================
  // FINAL RESULT
  // =====================================================

  return {
    account_type: accountType,

    intent,

    person_name: personName,

    amount,

    note,

    date,

    needs_clarification: needsClarification,

    clarification_question:
      needsClarification
        ? clarificationQuestion
        : '',

    missing_field:
      needsClarification
        ? finalMissingField
        : '',
  };
};
// =====================================================
// CLARIFY VOICE TRANSACTION
// =====================================================

const clarifyVoiceTransaction = async ({
  originalText,
  question,
  answer,
}) => {

  if (
    !originalText ||
    typeof originalText !== 'string'
  ) {
    throw new Error(
      'Original voice text is required'
    );
  }

  if (
    !answer ||
    typeof answer !== 'string'
  ) {
    throw new Error(
      'Clarification answer is required'
    );
  }


  const response =
    await groq.chat.completions.create({

      model:
        'openai/gpt-oss-20b',

      messages: [

        {
          role: 'system',

          content: `
You are the clarification AI for an Indian digital khata app called Voice Khata.

The original voice entry was not fully understood.

You will receive:

1. Original user voice/text
2. The clarification question asked by the AI
3. The user's clarification answer

Your job is to combine all three and produce the FINAL transaction.

The user may speak:

- English
- Hindi
- Hinglish
- Indian English
- Hindi written in English letters
- Informal speech

Return JSON only.

==================================================
VALID ACCOUNT TYPES
==================================================

"customer"
"supplier"
"unknown"


==================================================
VALID INTENTS
==================================================

CUSTOMER:

"credit_given"

Meaning:
User gave credit/udhaar to customer.
Customer owes user.

"payment_received"

Meaning:
Customer paid user.


SUPPLIER:

"purchase_from_supplier"

Meaning:
User purchased goods from supplier.

"payment_to_supplier"

Meaning:
User paid supplier.


==================================================
IMPORTANT
==================================================

Use the ORIGINAL TEXT and the CLARIFICATION ANSWER together.

Do not ignore information from the original text.

The clarification answer normally provides the missing information.

Example:

Original:
"Ramesh ko 3000 payment kar di"

Question:
"Ramesh customer hai ya supplier?"

Answer:
"Supplier hai"

Final:

account_type = "supplier"
intent = "payment_to_supplier"
person_name = "Ramesh"
amount = 3000


==================================================
ANOTHER EXAMPLE
==================================================

Original:
"Ramesh se maal liya"

Question:
"Kitne rupaye ka maal liya?"

Answer:
"5000 rupaye"

Final:

account_type = "supplier"
intent = "purchase_from_supplier"
person_name = "Ramesh"
amount = 5000


==================================================
ANOTHER EXAMPLE
==================================================

Original:
"Rahul ko payment kar di"

Question:
"Kitne rupaye ki payment?"

Answer:
"500 rupaye"

Final:

If original context clearly indicates customer:
account_type = "customer"
intent = "payment_received"

Otherwise:

account_type = "unknown"
intent = "unknown"

Do NOT randomly guess customer or supplier.


==================================================
ACCOUNT TYPE RULE
==================================================

If clarification explicitly says:

"customer"
"customer hai"
"mera customer"
"customer ke account mein"

then:

account_type = "customer"


If clarification says:

"supplier"
"supplier hai"
"mera supplier"
"supplier ke account mein"
"vendor"

then:

account_type = "supplier"


==================================================
INTENT RULE
==================================================

Customer:

User gives credit:

"udhaar diya"
"credit diya"
"lene hain"
"lena hai"

=> credit_given


Customer pays user:

"payment received"
"paise mil gaye"
"customer ne paise diye"

=> payment_received


Supplier goods purchase:

"maal liya"
"saman liya"
"kharida"
"purchase ki"

=> purchase_from_supplier


Supplier payment:

"supplier ko paise diye"
"supplier ko payment ki"
"supplier ko de diye"

=> payment_to_supplier


==================================================
AMOUNT
==================================================

Extract amount from original text OR clarification answer.

Examples:

"500" = 500

"paanch sau" = 500

"do hazaar" = 2000

"teen hazaar" = 3000

"five thousand" = 5000


==================================================
PERSON NAME
==================================================

Extract person name from original text first.

Example:

"Ramesh ko 3000 payment kar di"

person_name = "Ramesh"


==================================================
NOTE
==================================================

Keep useful additional information.

Otherwise:

note = ""


==================================================
DATE
==================================================

Use original date information.

If nothing is specified:

date = "today"


==================================================
CLARIFICATION RESULT
==================================================

If the transaction is now completely understood:

needs_clarification = false

clarification_question = ""

missing_field = ""


If it is STILL unclear:

needs_clarification = true

Ask only ONE short question.

Do not guess.


==================================================
FINAL JSON
==================================================

Return EXACTLY:

{
  "account_type": "...",
  "intent": "...",
  "person_name": "...",
  "amount": 0,
  "note": "",
  "date": "today",
  "needs_clarification": false,
  "clarification_question": "",
  "missing_field": ""
}

Return JSON only.
No markdown.
No explanation.
No extra fields.
`,
        },


        {
          role: 'user',

          content: `
ORIGINAL TEXT:
${originalText.trim()}

CLARIFICATION QUESTION:
${question || ''}

USER ANSWER:
${answer.trim()}
`,
        },

      ],


      response_format: {

        type:
          'json_schema',

        json_schema: {

          name:
            'clarified_voice_transaction',

          strict:
            true,

          schema: {

            type:
              'object',

            properties: {

              account_type: {

                type:
                  'string',

                enum: [
                  'customer',
                  'supplier',
                  'unknown',
                ],

              },

              intent: {

                type:
                  'string',

                enum: [

                  'credit_given',

                  'payment_received',

                  'purchase_from_supplier',

                  'payment_to_supplier',

                  'unknown',

                ],

              },

              person_name: {

                type:
                  'string',

              },

              amount: {

                type:
                  'number',

              },

              note: {

                type:
                  'string',

              },

              date: {

                type:
                  'string',

              },

              needs_clarification: {

                type:
                  'boolean',

              },

              clarification_question: {

                type:
                  'string',

              },

              missing_field: {

                type:
                  'string',

                enum: [

                  'account_type',

                  'intent',

                  'person_name',

                  'amount',

                  '',

                ],

              },

            },

            required: [

              'account_type',

              'intent',

              'person_name',

              'amount',

              'note',

              'date',

              'needs_clarification',

              'clarification_question',

              'missing_field',

            ],

            additionalProperties:
              false,

          },

        },

      },

    });


  const content =
    response?.choices?.[0]?.message?.content;


  if (!content) {

    throw new Error(
      'AI returned an empty clarification response'
    );

  }


  let parsed;


  try {

    parsed =
      JSON.parse(content);

  } catch (error) {

    console.error(
      'CLARIFICATION JSON ERROR:',
      error
    );

    console.error(
      'RAW RESPONSE:',
      content
    );

    throw new Error(
      'AI returned invalid clarification JSON'
    );

  }


  const accountType =
    [
      'customer',
      'supplier',
      'unknown',
    ].includes(
      parsed.account_type
    )
      ? parsed.account_type
      : 'unknown';


  const validIntents = [

    'credit_given',

    'payment_received',

    'purchase_from_supplier',

    'payment_to_supplier',

    'unknown',

  ];


  const intent =
    validIntents.includes(
      parsed.intent
    )
      ? parsed.intent
      : 'unknown';


  const personName =
    typeof parsed.person_name === 'string'
      ? parsed.person_name.trim()
      : '';


  const amount =
    Number(parsed.amount) || 0;


  const note =
    typeof parsed.note === 'string'
      ? parsed.note.trim()
      : '';


  const date =
    typeof parsed.date === 'string' &&
    parsed.date.trim()
      ? parsed.date.trim()
      : 'today';


  let needsClarification =
    Boolean(
      parsed.needs_clarification
    );


  let clarificationQuestion =
    typeof parsed.clarification_question === 'string'
      ? parsed.clarification_question.trim()
      : '';


  let missingField =
    [
      'account_type',
      'intent',
      'person_name',
      'amount',
      '',
    ].includes(
      parsed.missing_field
    )
      ? parsed.missing_field
      : '';


  // =================================================
  // SAFETY VALIDATION
  // =================================================

  if (
    accountType === 'unknown'
  ) {

    needsClarification =
      true;

    missingField =
      'account_type';

  }


  if (
    intent === 'unknown'
  ) {

    needsClarification =
      true;

    if (!missingField) {

      missingField =
        'intent';

    }

  }


  if (!personName) {

    needsClarification =
      true;

    if (!missingField) {

      missingField =
        'person_name';

    }

  }


  if (amount <= 0) {

    needsClarification =
      true;

    if (!missingField) {

      missingField =
        'amount';

    }

  }


  // =================================================
  // FALLBACK QUESTION
  // =================================================

  if (
    needsClarification &&
    !clarificationQuestion
  ) {

    if (
      missingField ===
      'account_type'
    ) {

      clarificationQuestion =
        'Ye customer hai ya supplier?';

    }

    else if (
      missingField ===
      'intent'
    ) {

      clarificationQuestion =
        'Aapko paise lene hain ya dene hain?';

    }

    else if (
      missingField ===
      'person_name'
    ) {

      clarificationQuestion =
        'Kis customer ya supplier ke account mein entry karni hai?';

    }

    else if (
      missingField ===
      'amount'
    ) {

      clarificationQuestion =
        'Kitne rupaye?';

    }

  }


  return {

    account_type:
      accountType,

    intent,

    person_name:
      personName,

    amount,

    note,

    date,

    needs_clarification:
      needsClarification,

    clarification_question:
      needsClarification
        ? clarificationQuestion
        : '',

    missing_field:
      needsClarification
        ? missingField
        : '',

  };

};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  parseVoiceText,
  clarifyVoiceTransaction,
};