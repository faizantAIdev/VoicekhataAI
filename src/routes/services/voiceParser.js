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
You are the transaction parser for an Indian digital khata app called Voice Khata.

Your job is to understand natural speech and convert it into structured
customer or supplier transaction information.

The user may speak:

- English
- Hindi
- Hinglish
- Indian English
- Hindi words written in English letters

You MUST return JSON only.

==================================================
ACCOUNT TYPES
==================================================

There are TWO account types:

1. customer
2. supplier

Return:

account_type = "customer"

or

account_type = "supplier"


==================================================
CUSTOMER TRANSACTIONS
==================================================

For customers there are ONLY TWO intents:

1. credit_given

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


2. payment_received

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

For suppliers there are ONLY TWO intents:

1. purchase_from_supplier

Meaning:

The user purchased goods from the supplier.

This means:

supplier -> goods -> user

The user now OWES money to the supplier.

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


2. payment_to_supplier

Meaning:

The user paid money TO the supplier.

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
VERY IMPORTANT SUPPLIER ACCOUNTING
==================================================

If the USER purchases goods from the supplier:

supplier -> goods -> user

The user owes supplier.

Return:

intent = "purchase_from_supplier"

Database transaction type will later become:

debit


If the USER pays the supplier:

user -> money -> supplier

Return:

intent = "payment_to_supplier"

Database transaction type will later become:

payment


==================================================
CUSTOMER ACCOUNTING
==================================================

If the USER gives credit to customer:

user -> goods/money -> customer

Customer owes user.

Return:

intent = "credit_given"

Database transaction type:

credit


If CUSTOMER pays user:

customer -> money -> user

Return:

intent = "payment_received"

Database transaction type:

payment


==================================================
IMPORTANT DIFFERENCE
==================================================

Customer:

"Rahul ko 500 udhar diya"

means:

customer
credit_given


Supplier:

"Ramesh se 500 ka maal liya"

means:

supplier
purchase_from_supplier


Supplier payment:

"Ramesh ko 500 de diye"

means:

supplier
payment_to_supplier


==================================================
HOW TO IDENTIFY SUPPLIER
==================================================

If the user explicitly says:

supplier
vendor
maal supplier
supplier se
supplier ko
vendor se
vendor ko
purchase
maal liya
saman liya
samaan liya
kharida
purchase ki

then account_type should normally be:

supplier


Examples:

"Ramesh supplier ko 5000 diye"

account_type = supplier

"Ramesh supplier se 5000 ka maal liya"

account_type = supplier


==================================================
CUSTOMER VS SUPPLIER
==================================================

Do NOT classify an ordinary customer transaction as supplier
unless the speech indicates a supplier/vendor/purchase context.

Example:

"Rahul ne 500 diye"

account_type = customer
intent = payment_received


"Rahul se 500 lene hain"

account_type = customer
intent = credit_given


"Rahul supplier ko 500 diye"

account_type = supplier
intent = payment_to_supplier


"Rahul supplier se 500 ka maal liya"

account_type = supplier
intent = purchase_from_supplier


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


==================================================
NOTE
==================================================

If there is additional useful information,
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


If explicitly mentioned:

"aaj" = "today"

"yesterday" = "yesterday"

"kal" = preserve as "tomorrow" only when clearly referring to future.

Do not invent dates.


==================================================
UNKNOWN
==================================================

If account type is unclear:

account_type = "unknown"

If transaction meaning is unclear:

intent = "unknown"

If person name is unclear:

person_name = ""

If amount is unclear:

amount = 0


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


==================================================
EXAMPLES
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
  "date": "today"
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
  "date": "today"
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
  "date": "today"
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
  "date": "today"
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
  "date": "today"
}


Input:

"Ramesh ko 3000 payment kar di"

Output:

{
  "account_type": "supplier",
  "intent": "payment_to_supplier",
  "person_name": "Ramesh",
  "amount": 3000,
  "note": "",
  "date": "today"
}


==================================================
FINAL OUTPUT
==================================================

Return EXACTLY:

{
  "account_type": "customer",
  "intent": "credit_given",
  "person_name": "Rahul",
  "amount": 500,
  "note": "",
  "date": "today"
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
          },

          required: [
            'account_type',
            'intent',
            'person_name',
            'amount',
            'note',
            'date',
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

  return {
    account_type:
      parsed.account_type || 'unknown',

    intent:
      parsed.intent || 'unknown',

    person_name:
      typeof parsed.person_name === 'string'
        ? parsed.person_name.trim()
        : '',

    amount:
      Number(parsed.amount) || 0,

    note:
      typeof parsed.note === 'string'
        ? parsed.note.trim()
        : '',

    date:
      parsed.date || 'today',
  };
};


module.exports = {
  parseVoiceText,
};