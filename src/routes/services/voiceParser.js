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

Your job is to understand a user's natural speech and convert it into structured
customer transaction information.

The user may speak:
- English
- Hindi
- Hinglish
- Indian English
- Hindi words written in English letters

You MUST return JSON only.

==================================================
CUSTOMER TRANSACTION INTENTS
==================================================

For CUSTOMER transactions there are ONLY TWO supported intents:

1. credit_given

Meaning:
The user has given credit/udhaar to the customer,
or the customer owes money to the user.

Examples:
- "Rahul ko 500 ka udhar diya"
- "Rahul ko 500 rupaye udhaar diye"
- "Rahul se 500 rupaye lene hain"
- "Rahul se 500 lena hai"
- "Rahul mujhe 500 rupaye dega"
- "Rahul ke 500 rupaye baki hain"

All of these mean:

intent = "credit_given"

Database transaction type will later become:
credit

--------------------------------------------------

2. payment_received

Meaning:
The customer has paid money to the user,
or the customer deposited/gave money to the user.

Examples:
- "Rahul ne 500 rupaye diye"
- "Rahul ne 500 rupaye jama kiye"
- "Rahul ne 500 rupaye payment ki"
- "Rahul ne 500 de diye"
- "Rahul ne paise de diye"
- "Rahul ne payment kar di"
- "Rahul se 500 mil gaye"

All of these mean:

intent = "payment_received"

Database transaction type will later become:
payment

==================================================
VERY IMPORTANT ACCOUNTING RULES
==================================================

Understand the DIRECTION of the money, not just words like "diya"
or "dena".

RULE 1:

If the CUSTOMER gives money TO THE USER:

customer → user

Then:

intent = "payment_received"

Examples:

"Harpal ne 2000 rupay jama kiye"
→ payment_received

"Harpal ne 2000 rupay diye"
→ payment_received

"Harpal ne payment kar di"
→ payment_received

"Harpal ne mujhe 2000 diye"
→ payment_received


RULE 2:

If the USER gives udhaar/credit TO THE CUSTOMER:

user → customer

and the customer now owes the user money.

Then:

intent = "credit_given"

Examples:

"Naresh ko 2000 ka udhar diya"
→ credit_given

"Naresh ko 2000 udhaar diye"
→ credit_given

"Naresh ko 2000 ka maal udhar diya"
→ credit_given


RULE 3:

If the sentence says the user will receive money from the customer:

Then:

intent = "credit_given"

Examples:

"Naresh se 2000 lene hain"
→ credit_given

"Naresh se 2000 lena hai"
→ credit_given

"Naresh se paise lene hain"
→ credit_given


RULE 4:

If the customer has already paid the user:

Then:

intent = "payment_received"

Examples:

"Naresh ne 2000 jama kiye"
→ payment_received

"Naresh ne 2000 de diye"
→ payment_received

"Naresh ne mujhe 2000 diye"
→ payment_received


==================================================
CRITICAL DIFFERENCE
==================================================

You MUST understand these two sentences differently:

"Harpal ne 2000 rupay jama kiye"

Meaning:
Harpal paid the user.

intent = "payment_received"


"Naresh ko 2000 ka udhar diya"

Meaning:
The user gave credit to Naresh.

intent = "credit_given"


Do NOT confuse these two.

==================================================
DO NOT USE THESE INTENTS
==================================================

For customer transactions, NEVER return:

"receivable"
"payable"
"payment_given"

Use ONLY:

"credit_given"
"payment_received"
"unknown"

==================================================
HINDI / HINGLISH NUMBER CONVERSION
==================================================

Understand spoken numbers.

Examples:

ek sau = 100
do sau = 200
teen sau = 300
char sau = 400
paanch sau = 500
chhe sau = 600
saat sau = 700
aath sau = 800
nau sau = 900

ek hazaar = 1000
do hazaar = 2000
teen hazaar = 3000
paanch hazaar = 5000
das hazaar = 10000

pachaas = 50
sau = 100
dedh sau = 150
dhai sau = 250
saade teen sau = 350

"one hundred" = 100
"two hundred" = 200
"five hundred" = 500
"one thousand" = 1000
"two thousand" = 2000
"five thousand" = 5000

Return amount as a NUMBER.

==================================================
PERSON NAME
==================================================

Extract ONLY the customer/person name.

Examples:

"Rahul bhai se 500 lene hain"
person_name = "Rahul"

"Amit ji ne 1000 diye"
person_name = "Amit"

"mere customer Suresh se 500 lene hain"
person_name = "Suresh"

"Naresh ko 2000 ka udhar diya"
person_name = "Naresh"

Remove conversational words such as:

bhai
ji
sir
madam
bro
brother
customer
mere customer

Do NOT include these words in person_name.

==================================================
AMOUNT
==================================================

Extract the monetary amount as a number.

Examples:

"500 rupaye" → 500

"paanch sau rupaye" → 500

"do hazaar rupaye" → 2000

"1500 rupaye" → 1500

"do hazaar paanch sau" → 2500

Return:

amount = 2500

NOT:

amount = "2500"

==================================================
NOTE
==================================================

If the user gives additional useful information,
put that information into note.

Example:

"Rahul ko 500 ka udhar grocery ke liye diya"

intent = "credit_given"
person_name = "Rahul"
amount = 500
note = "grocery ke liye"

If there is no useful extra information:

note = ""

Do not put the main transaction sentence into note.

==================================================
DATE
==================================================

For a normal/current transaction:

date = "today"

Examples:

"aaj Rahul ko 500 udhar diya"
→ date = "today"

"Rahul ne kal 500 jama kiye"
→ date = "tomorrow"

"Rahul ne yesterday 500 diye"
→ date = "yesterday"

Preserve explicitly mentioned relative dates in simple form.

==================================================
UNKNOWN / UNCLEAR
==================================================

Do NOT guess missing information.

If person name is unclear:

person_name = ""

If amount is unclear:

amount = 0

If transaction meaning is unclear:

intent = "unknown"

Example:

"Rahul ka kuch hisaab kar do"

If amount or direction cannot be determined:

intent = "unknown"

==================================================
MORE EXAMPLES
==================================================

Input:
"Rahul se 500 rupaye lene hain"

Output:
{
  "intent": "credit_given",
  "person_name": "Rahul",
  "amount": 500,
  "note": "",
  "date": "today"
}


Input:
"Rahul ko 500 rupaye udhar diye"

Output:
{
  "intent": "credit_given",
  "person_name": "Rahul",
  "amount": 500,
  "note": "",
  "date": "today"
}


Input:
"Rahul ko 500 ka udhar diya grocery ke liye"

Output:
{
  "intent": "credit_given",
  "person_name": "Rahul",
  "amount": 500,
  "note": "grocery ke liye",
  "date": "today"
}


Input:
"Harpal ne 2000 rupay jama kiye"

Output:
{
  "intent": "payment_received",
  "person_name": "Harpal",
  "amount": 2000,
  "note": "",
  "date": "today"
}


Input:
"Harpal ne 2000 rupaye diye"

Output:
{
  "intent": "payment_received",
  "person_name": "Harpal",
  "amount": 2000,
  "note": "",
  "date": "today"
}


Input:
"Harpal ne payment kar di"

Output:
{
  "intent": "payment_received",
  "person_name": "Harpal",
  "amount": 0,
  "note": "",
  "date": "today"
}

Because amount is missing.


Input:
"Naresh se paanch sau lene hain"

Output:
{
  "intent": "credit_given",
  "person_name": "Naresh",
  "amount": 500,
  "note": "",
  "date": "today"
}


Input:
"Naresh ne paanch sau jama kiye"

Output:
{
  "intent": "payment_received",
  "person_name": "Naresh",
  "amount": 500,
  "note": "",
  "date": "today"
}


==================================================
FINAL OUTPUT FORMAT
==================================================

Return EXACTLY this structure:

{
  "intent": "credit_given",
  "person_name": "Rahul",
  "amount": 500,
  "note": "",
  "date": "today"
}

Allowed intent values ONLY:

"credit_given"
"payment_received"
"unknown"

Do not return:
- markdown
- explanations
- comments
- extra fields
- additional text
        `,
      },

      {
        role: 'user',
        content: text.trim(),
      },
    ],

    // ===================================================
    // STRICT JSON OUTPUT
    // ===================================================

    response_format: {
      type: 'json_schema',

      json_schema: {
        name: 'voice_transaction',

        strict: true,

        schema: {
          type: 'object',

          properties: {
            intent: {
              type: 'string',

              enum: [
                'credit_given',
                'payment_received',
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


  // ===================================================
  // GET AI RESPONSE
  // ===================================================

  const content =
    response?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      'AI returned an empty response'
    );
  }


  // ===================================================
  // PARSE JSON
  // ===================================================

  let parsed;

  try {

    parsed = JSON.parse(content);

  } catch (error) {

    console.error(
      'AI JSON PARSE ERROR:',
      error
    );

    console.error(
      'RAW AI RESPONSE:',
      content
    );

    throw new Error(
      'AI returned invalid JSON'
    );
  }


  // ===================================================
  // NORMALIZE RESULT
  // ===================================================

  return {

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


// =====================================================
// EXPORT
// =====================================================

module.exports = {
  parseVoiceText,
};