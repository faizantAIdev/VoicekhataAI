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
transaction information.

The user may speak:
- English
- Hindi
- Hinglish
- Indian English
- Hindi words written in English letters

You MUST return JSON only.

==================================================
TRANSACTION INTENTS
==================================================

There are only two supported intents:

1. receivable
   Meaning: the user will RECEIVE money from the person.

2. payable
   Meaning: the user will GIVE/PAY money to the person.

==================================================
IMPORTANT EXAMPLES
==================================================

"Rahul se 500 rupaye lene hain"
→ receivable

"Rahul se 500 lena hai"
→ receivable

"Rahul mujhe 500 dega"
→ receivable

"Rahul se paanch sau lene hain"
→ receivable

"Amit ko 1000 rupaye diye"
→ payable

"Amit ko 1000 dene hain"
→ payable

"Amit ko paanch sau diye"
→ payable

"Mohan ko do hazaar dena hai"
→ payable

==================================================
HINDI / HINGLISH NUMBER CONVERSION
==================================================

Understand common spoken numbers:

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

"one thousand" = 1000
"two thousand" = 2000
"five hundred" = 500

==================================================
PERSON NAME
==================================================

Extract only the person's/customer name.

Examples:

"Rahul bhai se 500 lene hain"
person_name = "Rahul"

"Amit ji ko 1000 diye"
person_name = "Amit"

"mere customer Suresh se 500 lene hain"
person_name = "Suresh"

Remove conversational words such as:
bhai
ji
sir
madam
bro
brother

Do NOT include those words in person_name.

==================================================
AMOUNT
==================================================

Extract the monetary amount as a number.

Examples:

"500 rupaye" → 500
"paanch sau rupaye" → 500
"do hazaar rupaye" → 2000
"1500" → 1500

Return a number, not a string.

==================================================
NOTE
==================================================

If the user gives an additional useful description, put it into note.

Example:

"Rahul se 500 lene hain for grocery"
→ note = "for grocery"

Otherwise:

note = ""

==================================================
DATE
==================================================

For normal/current transactions:

date = "today"

If the user explicitly mentions a date, preserve it in a simple readable form.

Examples:

"aaj Rahul se 500 lene hain"
→ date = "today"

"kal Rahul se 500 lene hain"
→ date = "tomorrow"

"yesterday Amit ko 500 diye"
→ date = "yesterday"

==================================================
UNKNOWN / UNCLEAR
==================================================

Do NOT invent information.

If the person's name cannot be understood:
person_name = ""

If the amount cannot be understood:
amount = 0

If transaction intent cannot be determined:
intent = "unknown"

==================================================
OUTPUT FORMAT
==================================================

Return exactly this structure:

{
  "intent": "receivable",
  "person_name": "Rahul",
  "amount": 500,
  "note": "",
  "date": "today"
}

Allowed intent values:

"receivable"
"payable"
"unknown"

Do not return markdown.
Do not return explanations.
Do not return extra fields.
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
            intent: {
              type: 'string',
              enum: [
                'receivable',
                'payable',
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

  const content = response?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI returned an empty response');
  }


  // ===================================================
  // PARSE JSON
  // ===================================================

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error('AI JSON PARSE ERROR:', error);
    console.error('RAW AI RESPONSE:', content);

    throw new Error('AI returned invalid JSON');
  }


  // ===================================================
  // NORMALIZE RESULT
  // ===================================================

  return {
    intent: parsed.intent || 'unknown',

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