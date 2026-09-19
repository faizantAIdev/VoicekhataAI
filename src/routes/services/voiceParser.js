const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =====================================================
// CONSTANTS
// =====================================================

const VALID_ACCOUNT_TYPES = [
  'customer',
  'supplier',
  'unknown',
];

const VALID_INTENTS = [
  'credit_given',
  'payment_received',
  'purchase_from_supplier',
  'payment_to_supplier',
  'unknown',
];

const VALID_MISSING_FIELDS = [
  'account_type',
  'intent',
  'person_name',
  'amount',
  '',
];

// =====================================================
// FALLBACK QUESTION
// =====================================================

const getFallbackQuestion = (
  missingField,
  {
    accountType,
    personName,
  } = {}
) => {
  switch (missingField) {
    case 'account_type':
      return personName
        ? `${personName} customer hai ya supplier?`
        : 'Ye customer hai ya supplier?';

    case 'intent':
      return 'Aapko paise lene hain ya dene hain?';

    case 'person_name':
      return 'Kis customer ya supplier ke account mein entry karni hai?';

    case 'amount':
      return 'Kitne rupaye?';

    default:
      if (accountType === 'unknown') {
        return 'Ye customer hai ya supplier?';
      }

      return 'Thoda aur clearly bataiye.';
  }
};

// =====================================================
// NORMALIZE RESULT
// =====================================================

const normalizeResult = (parsed) => {
  const accountType = VALID_ACCOUNT_TYPES.includes(
    parsed?.account_type
  )
    ? parsed.account_type
    : 'unknown';

  const intent = VALID_INTENTS.includes(
    parsed?.intent
  )
    ? parsed.intent
    : 'unknown';

  const personName =
    typeof parsed?.person_name === 'string'
      ? parsed.person_name.trim()
      : '';

  const amount =
    typeof parsed?.amount === 'number'
      ? parsed.amount
      : Number(parsed?.amount) || 0;

  const note =
    typeof parsed?.note === 'string'
      ? parsed.note.trim()
      : '';

  const date =
    typeof parsed?.date === 'string' &&
    parsed.date.trim()
      ? parsed.date.trim()
      : 'today';

  let needsClarification =
    Boolean(parsed?.needs_clarification);

  let clarificationQuestion =
    typeof parsed?.clarification_question === 'string'
      ? parsed.clarification_question.trim()
      : '';

  let missingField =
    VALID_MISSING_FIELDS.includes(parsed?.missing_field)
      ? parsed.missing_field
      : '';

  // ===================================================
  // SAFETY VALIDATION
  // ===================================================

  if (accountType === 'unknown') {
    needsClarification = true;

    if (!missingField) {
      missingField = 'account_type';
    }
  }

  if (intent === 'unknown') {
    needsClarification = true;

    if (!missingField) {
      missingField = 'intent';
    }
  }

  if (!personName) {
    needsClarification = true;

    if (!missingField) {
      missingField = 'person_name';
    }
  }

  if (amount <= 0) {
    needsClarification = true;

    if (!missingField) {
      missingField = 'amount';
    }
  }

  // ===================================================
  // FALLBACK QUESTION
  // ===================================================

  if (
    needsClarification &&
    !clarificationQuestion
  ) {
    clarificationQuestion =
      getFallbackQuestion(missingField, {
        accountType,
        personName,
      });
  }

  return {
    account_type: accountType,
    intent,
    person_name: personName,
    amount,
    note,
    date,
    needs_clarification: needsClarification,
    clarification_question: needsClarification
      ? clarificationQuestion
      : '',
    missing_field: needsClarification
      ? missingField
      : '',
  };
};

// =====================================================
// PARSE VOICE TEXT
// =====================================================

const parseVoiceText = async (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Voice text is required');
  }

  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error('Voice text is required');
  }

  const response =
    await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',

      temperature: 0,

      messages: [
        {
          role: 'system',

          content: `
You are the transaction understanding AI for an Indian digital khata app called Voice Khata.

Your ONLY job is to understand a user's spoken transaction and convert it into the exact JSON structure requested below.

The user can speak naturally. Do not expect perfect grammar.

==================================================
LANGUAGES
==================================================

The user may use:

- English
- Hindi
- Hinglish
- Roman Hindi
- Indian English
- Devanagari Hindi
- Mixed English + Hindi
- Informal Indian speech
- Short sentences
- Incomplete sentences
- Local/business vocabulary

Examples:

"Rahul se 500 lene hain"
"Rahul ko 500 dene hain"
"Rahul ka 500 ka hisaab daal do"
"Ramesh se maal uthaya"
"Ramesh ko payment maar di"
"bhai Rahul ke account mein 500 add karo"
"Rahul ne paise de diye"
"Rahul se paise mil gaye"
"Ramesh se 5000 ka maal liya"

Understand the meaning, NOT just exact keywords.

==================================================
LANGUAGE OF CLARIFICATION
==================================================

The clarification question MUST follow the user's language/style.

If the user speaks English:
Ask in English.

Example:
"Is Rahul a customer or a supplier?"

If the user speaks Roman Hindi/Hinglish:
Ask naturally in Roman Hindi/Hinglish.

Example:
"Rahul customer hai ya supplier?"

If the user speaks Hindi in Devanagari:
Ask in Hindi.

Example:
"राहुल ग्राहक है या सप्लायर?"

Do NOT unnecessarily translate the user's language.

For Roman Hindi/Hinglish:
DO NOT use Devanagari unless the user used Devanagari.

Keep clarification questions short and natural.

==================================================
MAIN GOAL
==================================================

Understand:

1. account_type
2. intent
3. person_name
4. amount
5. note
6. date

There are TWO account types:

"customer"
"supplier"

There are FOUR valid intents:

CUSTOMER:

"credit_given"
"payment_received"

SUPPLIER:

"purchase_from_supplier"
"payment_to_supplier"

==================================================
CUSTOMER: CREDIT GIVEN
==================================================

Intent:

credit_given

Meaning:

The USER gave goods or money on credit to the customer.

The CUSTOMER owes money to the USER.

Examples:

"Rahul ko 500 ka udhar diya"

"Rahul ko 500 rupaye udhaar diye"

"Rahul se 500 rupaye lene hain"

"Rahul se 500 rupaye lena hai"

"Rahul mujhe 500 rupaye dega"

"Rahul ke 500 rupaye baki hain"

"Rahul ke account mein 500 udhaar hai"

"Rahul ko 500 ka maal udhaar diya"

Return:

account_type = "customer"

intent = "credit_given"

==================================================
CUSTOMER: PAYMENT RECEIVED
==================================================

Intent:

payment_received

Meaning:

The CUSTOMER paid money to the USER.

Examples:

"Rahul ne 500 rupaye diye"

"Rahul ne 500 rupaye jama kiye"

"Rahul ne 500 rupaye payment ki"

"Rahul ne 500 de diye"

"Rahul ne paise de diye"

"Rahul ne payment kar di"

"Rahul se 500 mil gaye"

"Rahul se paise mil gaye"

"Rahul ne mera 500 de diya"

Return:

account_type = "customer"

intent = "payment_received"

==================================================
SUPPLIER: PURCHASE
==================================================

Intent:

purchase_from_supplier

Meaning:

The USER purchased or received goods from the supplier.

supplier -> goods -> user

The USER now owes the supplier.

Examples:

"Ramesh supplier se 5000 ka maal liya"

"Ramesh se 5000 ka maal kharida"

"Ramesh se 5000 rupaye ka saman liya"

"Ramesh supplier se 5000 ka saman liya"

"Ramesh se 5000 ki purchase ki"

"Ramesh ka 5000 ka maal liya"

"Ramesh se 5000 ka maal udhar liya"

"Ramesh se maal uthaya"

"Ramesh se maal mangaya"

"Ramesh se grocery ka maal liya"

Return:

account_type = "supplier"

intent = "purchase_from_supplier"

IMPORTANT:

Backend transaction type for this intent is:

"purchase"

==================================================
SUPPLIER: PAYMENT
==================================================

Intent:

payment_to_supplier

Meaning:

The USER paid money TO the supplier.

user -> money -> supplier

Examples:

"Ramesh ko 5000 rupaye de diye"

"Ramesh supplier ko 5000 diye"

"Ramesh ko 5000 payment kar di"

"Ramesh ko 5000 rupaye payment ki"

"Ramesh supplier ko payment kar di"

"Ramesh ko paise de diye"

"Ramesh ko 3000 de diye"

"Supplier Ramesh ko payment kar di"

Return:

account_type = "supplier"

intent = "payment_to_supplier"

IMPORTANT:

Backend transaction type for this intent is:

"payment"

==================================================
VERY IMPORTANT: DIRECTION
==================================================

Always determine WHO gives money and WHO receives money.

Customer:

USER gives credit to customer:
customer owes user
=> credit_given

Customer pays user:
customer gives money to user
=> payment_received

Supplier:

USER buys goods from supplier:
supplier gives goods to user
=> purchase_from_supplier

USER pays supplier:
user gives money to supplier
=> payment_to_supplier

Do NOT classify only from the word "payment".

Understand the direction.

==================================================
CUSTOMER VS SUPPLIER
==================================================

Strong supplier signals:

supplier
vendor
maal supplier
supplier se
supplier ko
vendor se
vendor ko
purchase
purchase ki
purchase kara
maal liya
maal uthaya
maal kharida
saman liya
samaan liya
kharida
supplier payment

Strong customer signals:

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
customer ne paise diye
paise mil gaye

IMPORTANT:

Do NOT decide based only on the person's name.

Do NOT assume every unknown person is a customer.

Do NOT assume every unknown person is a supplier.

Use transaction context.

==================================================
IMPORTANT AMBIGUITY RULE
==================================================

If there is not enough information to know whether the person is a customer or supplier:

account_type = "unknown"

intent = "unknown"

needs_clarification = true

missing_field = "account_type"

Ask ONE short question.

Roman Hindi/Hinglish example:

"Ramesh customer hai ya supplier?"

English:

"Is Ramesh a customer or a supplier?"

Hindi:

"रमेश ग्राहक है या सप्लायर?"

==================================================
PAYMENT DIRECTION AMBIGUITY
==================================================

Example:

"Rahul ko payment kar di"

This indicates money went TO Rahul.

But account type may still be unknown.

Therefore:

account_type = "unknown"
intent = "unknown"
needs_clarification = true
missing_field = "account_type"

Do NOT ask for amount if amount is already present.

Example:

"Rahul ko 500 payment kar di"

Question should be:

"Rahul customer hai ya supplier?"

NOT:

"Kitne rupaye?"

==================================================
MISSING AMOUNT
==================================================

If person and transaction are clear but amount is missing:

amount = 0

needs_clarification = true

missing_field = "amount"

Ask only:

"Kitne rupaye?"

Example:

"Ramesh se maal liya"

=> supplier
=> purchase_from_supplier
=> Ramesh
=> amount = 0
=> ask amount

==================================================
MISSING PERSON
==================================================

If transaction and amount are clear but person is missing:

person_name = ""

needs_clarification = true

missing_field = "person_name"

Ask:

"Kis customer ya supplier ke account mein entry karni hai?"

English:

"Which customer or supplier should I add this to?"

==================================================
MISSING INTENT
==================================================

If account type is known but transaction direction is genuinely unclear:

intent = "unknown"

needs_clarification = true

missing_field = "intent"

Ask ONE short question.

Roman Hindi:

"Payment aapne di hai ya aapko mili hai?"

English:

"Did you make the payment or receive it?"

==================================================
DO NOT OVER-ASK
==================================================

If all required information is clear:

needs_clarification = false

Do NOT ask anything.

Example:

"Ramesh supplier se 5000 ka maal liya"

Return:

account_type = "supplier"
intent = "purchase_from_supplier"
person_name = "Ramesh"
amount = 5000
needs_clarification = false

Example:

"Rahul ne 500 rupaye diye"

Return:

account_type = "customer"
intent = "payment_received"
person_name = "Rahul"
amount = 500
needs_clarification = false

==================================================
PERSON NAME
==================================================

Extract ONLY the person's name.

Remove words such as:

bhai
bhaiya
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
mera customer
mere supplier
mera supplier

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

"2.5 hazaar" = 2500

"2.5k" = 2500

"1 lakh" = 100000

"1.5 lakh" = 150000

If amount cannot be understood:

amount = 0

needs_clarification = true

missing_field = "amount"

==================================================
NOTE
==================================================

If useful additional transaction information exists,
put it in note.

Example:

"Ramesh se 5000 ka grocery maal liya"

note = "grocery maal"

If no useful extra information:

note = ""

Do not put the person's name or amount inside note.

==================================================
DATE
==================================================

If no date is specified:

date = "today"

"aaj" = "today"

"today" = "today"

"yesterday" = "yesterday"

"kal" can mean yesterday OR tomorrow.

Only use "tomorrow" when the sentence clearly refers to the future.

If "kal" is ambiguous, prefer "today" rather than inventing a future date.

Do not invent dates.

==================================================
MULTIPLE MISSING FIELDS
==================================================

Ask ONLY ONE question.

Priority:

1. account_type
2. intent
3. person_name
4. amount

Never ask multiple questions in one clarification.

==================================================
FINAL VALID VALUES
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
FINAL JSON
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
          content: cleanText,
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

  const content =
    response?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI returned an empty response');
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error('AI JSON PARSE ERROR:', error);
    console.error('RAW AI RESPONSE:', content);

    throw new Error('AI returned invalid JSON');
  }

  return normalizeResult(parsed);
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

  const cleanOriginalText =
    originalText.trim();

  const cleanAnswer =
    answer.trim();

  const response =
    await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',

      temperature: 0,

      messages: [
        {
          role: 'system',

          content: `
You are the clarification AI for an Indian digital khata app called Voice Khata.

Your job is to combine:

1. Original transaction
2. Clarification question
3. User's answer

and produce the FINAL transaction.

The user may speak:

- English
- Hindi
- Hinglish
- Roman Hindi
- Indian English
- Devanagari Hindi
- Mixed Hindi + English
- Informal speech

==================================================
MOST IMPORTANT RULE
==================================================

DO NOT THROW AWAY THE ORIGINAL TRANSACTION.

The original transaction contains information such as:

- person
- amount
- transaction direction
- goods
- date
- account context

The clarification answer usually provides only the missing information.

Combine BOTH.

==================================================
LANGUAGE
==================================================

The user may answer in a different style from the original.

Understand the answer semantically.

For any NEW clarification question:

Use the language/style of the user's latest answer.

If latest answer is English:
ask English.

If latest answer is Roman Hindi/Hinglish:
ask Roman Hindi/Hinglish.

If latest answer is Devanagari Hindi:
ask Hindi in Devanagari.

Do NOT unnecessarily translate.

==================================================
VALID ACCOUNT TYPES
==================================================

"customer"
"supplier"
"unknown"

==================================================
VALID INTENTS
==================================================

"credit_given"

"payment_received"

"purchase_from_supplier"

"payment_to_supplier"

"unknown"

==================================================
CUSTOMER: CREDIT GIVEN
==================================================

User gave credit/udhaar to customer.

Customer owes user.

Examples:

"udhaar diya"
"udhar diya"
"credit diya"
"lene hain"
"lena hai"

=> credit_given

==================================================
CUSTOMER: PAYMENT RECEIVED
==================================================

Customer paid user.

Examples:

"paise mil gaye"
"payment received"
"customer ne paise diye"
"Rahul ne payment kar di"
"Rahul ne paise de diye"

=> payment_received

==================================================
SUPPLIER: PURCHASE
==================================================

User bought/received goods from supplier.

Examples:

"maal liya"
"maal uthaya"
"saman liya"
"samaan liya"
"kharida"
"purchase ki"

=> purchase_from_supplier

==================================================
SUPPLIER: PAYMENT
==================================================

User paid supplier.

Examples:

"supplier ko paise diye"
"supplier ko payment ki"
"supplier ko de diye"
"supplier ko payment kar di"

=> payment_to_supplier

==================================================
DIRECTION
==================================================

Always determine money direction.

Customer:

USER -> credit -> CUSTOMER
=> credit_given

CUSTOMER -> money -> USER
=> payment_received

Supplier:

SUPPLIER -> goods -> USER
=> purchase_from_supplier

USER -> money -> SUPPLIER
=> payment_to_supplier

==================================================
EXAMPLE 1
==================================================

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
EXAMPLE 2
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
EXAMPLE 3
==================================================

Original:

"Rahul se 500 lene hain"

Question:

"Rahul customer hai ya supplier?"

Answer:

"Customer"

Final:

account_type = "customer"
intent = "credit_given"
person_name = "Rahul"
amount = 500

==================================================
EXAMPLE 4
==================================================

Original:

"Rahul ko 500 payment kar di"

Question:

"Rahul customer hai ya supplier?"

Answer:

"Supplier"

Final:

account_type = "supplier"
intent = "payment_to_supplier"
person_name = "Rahul"
amount = 500

==================================================
EXAMPLE 5
==================================================

Original:

"Rahul ne payment ki"

Question:

"Kitne rupaye?"

Answer:

"500"

Final:

If Rahul is already clearly established as customer:

account_type = "customer"
intent = "payment_received"
person_name = "Rahul"
amount = 500

Otherwise do NOT invent account type.

==================================================
ACCOUNT TYPE ANSWERS
==================================================

If user says:

"customer"
"customer hai"
"mera customer"
"customer ke account mein"
"haan customer hai"

=> customer

If user says:

"supplier"
"supplier hai"
"mera supplier"
"supplier ke account mein"
"vendor"
"vendor hai"

=> supplier

==================================================
SHORT ANSWERS
==================================================

The answer may be extremely short.

Examples:

"customer"

"supplier"

"500"

"paanch sau"

"haan"

"kal"

Interpret it according to the clarification question.

Do NOT require a full sentence.

==================================================
AMOUNT
==================================================

Extract amount from ORIGINAL text OR ANSWER.

Examples:

"500" = 500

"paanch sau" = 500

"do hazaar" = 2000

"teen hazaar" = 3000

"five thousand" = 5000

"2.5k" = 2500

"1 lakh" = 100000

"1.5 lakh" = 150000

==================================================
PERSON NAME
==================================================

Extract person from original text first.

Do not replace it unless the clarification explicitly corrects the person.

Remove:

bhai
bhaiya
ji
sir
madam
customer
supplier
vendor

==================================================
DATE
==================================================

Preserve date information from original text.

If answer provides a date, use it when appropriate.

"aaj" = "today"

"today" = "today"

"yesterday" = "yesterday"

"tomorrow" = "tomorrow"

If "kal" is ambiguous, do not invent a future date.

Default:

"today"

==================================================
NOTE
==================================================

Keep useful transaction details.

Otherwise:

note = ""

==================================================
STILL UNCLEAR
==================================================

If the transaction is still missing required information:

needs_clarification = true

Ask ONLY ONE question.

missing_field must identify the most important missing field.

Priority:

1. account_type
2. intent
3. person_name
4. amount

If fully understood:

needs_clarification = false

clarification_question = ""

missing_field = ""

==================================================
DO NOT GUESS
==================================================

If customer/supplier cannot be determined:

account_type = "unknown"

Do not randomly choose.

If intent cannot be determined:

intent = "unknown"

Do not randomly choose.

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
ORIGINAL TRANSACTION:
${cleanOriginalText}

CLARIFICATION QUESTION:
${question || ''}

USER ANSWER:
${cleanAnswer}
`,
        },
      ],

      response_format: {
        type: 'json_schema',

        json_schema: {
          name: 'clarified_voice_transaction',

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

  const content =
    response?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      'AI returned an empty clarification response'
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error(
      'CLARIFICATION JSON ERROR:',
      error
    );

    console.error(
      'RAW CLARIFICATION RESPONSE:',
      content
    );

    throw new Error(
      'AI returned invalid clarification JSON'
    );
  }

  return normalizeResult(parsed);
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  parseVoiceText,
  clarifyVoiceTransaction,
};