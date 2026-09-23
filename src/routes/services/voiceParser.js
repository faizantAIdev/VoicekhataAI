const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =====================================================
// CONSTANTS
// =====================================================

const VALID_LANGUAGES = [
  'en',
  'hi',
  'gu',
  'mr',
  'bn',
  'ta',
  'te',
  'kn',
  'ml',
];

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
// LANGUAGE NORMALIZER
// =====================================================

const normalizeLanguage = (language) => {
  if (
    typeof language === 'string' &&
    VALID_LANGUAGES.includes(language.trim().toLowerCase())
  ) {
    return language.trim().toLowerCase();
  }

  return 'en';
};

// =====================================================
// FALLBACK QUESTION
// =====================================================

const getFallbackQuestion = (
  missingField,
  {
    accountType,
    personName,
    language = 'en',
  } = {}
) => {
  const lang = normalizeLanguage(language);

  switch (lang) {
    // =================================================
    // ENGLISH
    // =================================================

    case 'en':
      switch (missingField) {
        case 'account_type':
          return personName
            ? `Is ${personName} a customer or a supplier?`
            : 'Is this a customer or a supplier?';

        case 'intent':
          return 'Did you receive the money or make the payment?';

        case 'person_name':
          return 'Which customer or supplier should I add this to?';

        case 'amount':
          return 'How much is the amount?';

        default:
          if (accountType === 'unknown') {
            return 'Is this a customer or a supplier?';
          }

          return 'Please tell me a little more clearly.';
      }

    // =================================================
    // HINDI / HINGLISH
    // =================================================

    case 'hi':
      switch (missingField) {
        case 'account_type':
          return personName
            ? `${personName} customer hai ya supplier?`
            : 'Ye customer hai ya supplier?';

        case 'intent':
          return 'Payment aapne di hai ya aapko mili hai?';

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

    // =================================================
    // GUJARATI
    // =================================================

    case 'gu':
      switch (missingField) {
        case 'account_type':
          return personName
            ? `${personName} ગ્રાહક છે કે સપ્લાયર?`
            : 'આ ગ્રાહક છે કે સપ્લાયર?';

        case 'intent':
          return 'પેમેન્ટ તમે આપી છે કે તમને મળી છે?';

        case 'person_name':
          return 'કયા ગ્રાહક અથવા સપ્લાયરના ખાતામાં એન્ટ્રી કરવી છે?';

        case 'amount':
          return 'કેટલા રૂપિયા?';

        default:
          if (accountType === 'unknown') {
            return 'આ ગ્રાહક છે કે સપ્લાયર?';
          }

          return 'થોડું વધુ સ્પષ્ટ કહો.';
      }

    // =================================================
    // MARATHI
    // =================================================

    case 'mr':
      switch (missingField) {
        case 'account_type':
          return personName
            ? `${personName} ग्राहक आहे की सप्लायर?`
            : 'हा ग्राहक आहे की सप्लायर?';

        case 'intent':
          return 'पेमेंट तुम्ही दिले आहे की तुम्हाला मिळाले आहे?';

        case 'person_name':
          return 'कोणत्या ग्राहक किंवा सप्लायरच्या खात्यात एंट्री करायची आहे?';

        case 'amount':
          return 'किती रुपये?';

        default:
          if (accountType === 'unknown') {
            return 'हा ग्राहक आहे की सप्लायर?';
          }

          return 'थोडे अधिक स्पष्ट सांगा.';
      }

    // =================================================
    // BENGALI
    // =================================================

    case 'bn':
      switch (missingField) {
        case 'account_type':
          return personName
            ? `${personName} কাস্টমার নাকি সাপ্লায়ার?`
            : 'এটা কাস্টমার নাকি সাপ্লায়ার?';

        case 'intent':
          return 'পেমেন্ট আপনি দিয়েছেন নাকি আপনি পেয়েছেন?';

        case 'person_name':
          return 'কোন কাস্টমার বা সাপ্লায়ারের অ্যাকাউন্টে এন্ট্রি করতে হবে?';

        case 'amount':
          return 'কত টাকা?';

        default:
          if (accountType === 'unknown') {
            return 'এটা কাস্টমার নাকি সাপ্লায়ার?';
          }

          return 'আরও একটু পরিষ্কার করে বলুন।';
      }

    // =================================================
    // TAMIL
    // =================================================

    case 'ta':
      switch (missingField) {
        case 'account_type':
          return personName
            ? `${personName} கஸ்டமரா அல்லது சப்ளையரா?`
            : 'இவர் கஸ்டமரா அல்லது சப்ளையரா?';

        case 'intent':
          return 'பணம் நீங்கள் கொடுத்தீர்களா அல்லது பெற்றீர்களா?';

        case 'person_name':
          return 'எந்த கஸ்டமர் அல்லது சப்ளையர் கணக்கில் பதிவு செய்ய வேண்டும்?';

        case 'amount':
          return 'எவ்வளவு ரூபாய்?';

        default:
          if (accountType === 'unknown') {
            return 'இவர் கஸ்டமரா அல்லது சப்ளையரா?';
          }

          return 'கொஞ்சம் தெளிவாக சொல்லுங்கள்.';
      }

    // =================================================
    // TELUGU
    // =================================================

    case 'te':
      switch (missingField) {
        case 'account_type':
          return personName
            ? `${personName} కస్టమరా లేదా సప్లయరా?`
            : 'ఇది కస్టమరా లేదా సప్లయరా?';

        case 'intent':
          return 'డబ్బు మీరు ఇచ్చారా లేదా మీకు వచ్చిందా?';

        case 'person_name':
          return 'ఏ కస్టమర్ లేదా సప్లయర్ ఖాతాలో ఎంట్రీ చేయాలి?';

        case 'amount':
          return 'ఎంత రూపాయలు?';

        default:
          if (accountType === 'unknown') {
            return 'ఇది కస్టమరా లేదా సప్లయరా?';
          }

          return 'కొంచెం స్పష్టంగా చెప్పండి.';
      }

    // =================================================
    // KANNADA
    // =================================================

    case 'kn':
      switch (missingField) {
        case 'account_type':
          return personName
            ? `${personName} ಗ್ರಾಹಕರಾ ಅಥವಾ ಸಪ್ಲೈಯರಾ?`
            : 'ಇವರು ಗ್ರಾಹಕರಾ ಅಥವಾ ಸಪ್ಲೈಯರಾ?';

        case 'intent':
          return 'ಹಣವನ್ನು ನೀವು ಕೊಟ್ಟಿದ್ದೀರಾ ಅಥವಾ ನಿಮಗೆ ಬಂದಿದೆಯಾ?';

        case 'person_name':
          return 'ಯಾವ ಗ್ರಾಹಕ ಅಥವಾ ಸಪ್ಲೈಯರ್ ಖಾತೆಗೆ ಎಂಟ್ರಿ ಮಾಡಬೇಕು?';

        case 'amount':
          return 'ಎಷ್ಟು ರೂಪಾಯಿ?';

        default:
          if (accountType === 'unknown') {
            return 'ಇವರು ಗ್ರಾಹಕರಾ ಅಥವಾ ಸಪ್ಲೈಯರಾ?';
          }

          return 'ಸ್ವಲ್ಪ ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಿ.';
      }

    // =================================================
    // MALAYALAM
    // =================================================

    case 'ml':
      switch (missingField) {
        case 'account_type':
          return personName
            ? `${personName} കസ്റ്റമറാണോ സപ്ലയറാണോ?`
            : 'ഇത് കസ്റ്റമറാണോ സപ്ലയറാണോ?';

        case 'intent':
          return 'പണം നിങ്ങൾ കൊടുത്തതാണോ അല്ലെങ്കിൽ നിങ്ങൾക്ക് ലഭിച്ചതാണോ?';

        case 'person_name':
          return 'ഏത് കസ്റ്റമർ അല്ലെങ്കിൽ സപ്ലയർ അക്കൗണ്ടിലാണ് എൻട്രി ചെയ്യേണ്ടത്?';

        case 'amount':
          return 'എത്ര രൂപ?';

        default:
          if (accountType === 'unknown') {
            return 'ഇത് കസ്റ്റമറാണോ സപ്ലയറാണോ?';
          }

          return 'കുറച്ച് കൂടി വ്യക്തമായി പറയൂ.';
      }

    // =================================================
    // DEFAULT
    // =================================================

    default:
      return personName
        ? `Is ${personName} a customer or a supplier?`
        : 'Is this a customer or a supplier?';
  }
};

// =====================================================
// NORMALIZE RESULT
// =====================================================

const normalizeResult = (parsed) => {
  const language = normalizeLanguage(
    parsed?.language
  );

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
    VALID_MISSING_FIELDS.includes(
      parsed?.missing_field
    )
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
        language,
      });
  }

  return {
    language,

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
SUPPORTED LANGUAGES
==================================================

The user may speak:

- English
- Hindi
- Hinglish
- Roman Hindi
- Indian English
- Gujarati
- Marathi
- Bengali
- Tamil
- Telugu
- Kannada
- Malayalam
- Mixed English + Indian language
- Mixed Indian languages
- Native scripts
- Roman/transliterated Indian languages

Understand the MEANING, not just exact keywords.

The user may speak informal local/business language.

Examples:

Hindi:
"Rahul se 500 rupaye lene hain"

Hinglish:
"Rahul ko 500 dene hain"

Gujarati:
"Rahul pase thi 500 leva na che"

Gujarati script:
"રાહુલ પાસેથી 500 લેવાના છે"

Marathi:
"राहुलकडून 500 रुपये घ्यायचे आहेत"

Bengali:
"রাহুলের কাছ থেকে 500 টাকা নিতে হবে"

Tamil:
"ராகுலிடம் இருந்து 500 ரூபாய் வாங்க வேண்டும்"

Telugu:
"రాహుల్ దగ్గర నుంచి 500 రూపాయలు తీసుకోవాలి"

Kannada:
"ರಾಹುಲ್‌ನಿಂದ 500 ರೂಪಾಯಿ ಪಡೆಯಬೇಕು"

Malayalam:
"രാഹുലിൽ നിന്ന് 500 രൂപ വാങ്ങണം"

==================================================
LANGUAGE DETECTION
==================================================

Return the primary language of the user's input in:

language

Allowed values:

"en"
"hi"
"gu"
"mr"
"bn"
"ta"
"te"
"kn"
"ml"

Rules:

English => "en"

Hindi / Roman Hindi / Hinglish => "hi"

Gujarati => "gu"

Marathi => "mr"

Bengali => "bn"

Tamil => "ta"

Telugu => "te"

Kannada => "kn"

Malayalam => "ml"

If multiple languages are mixed, use the dominant language.

If Roman Hindi is mixed with English, return:

"hi"

The language value is used by the app for clarification and voice response.

==================================================
LANGUAGE OF CLARIFICATION
==================================================

The clarification question MUST follow the user's language/style.

English:

"Is Rahul a customer or a supplier?"

Roman Hindi / Hinglish:

"Rahul customer hai ya supplier?"

Hindi:

"राहुल ग्राहक है या सप्लायर?"

Gujarati:

"રાહુલ ગ્રાહક છે કે સપ્લાયર?"

Marathi:

"राहुल ग्राहक आहे की सप्लायर?"

Bengali:

"রাহুল কাস্টমার নাকি সাপ্লায়ার?"

Tamil:

"ராகுல் கஸ்டமரா அல்லது சப்ளையரா?"

Telugu:

"రాహుల్ కస్టమరా లేదా సప్లయరా?"

Kannada:

"ರಾಹುಲ್ ಗ್ರಾಹಕರಾ ಅಥವಾ ಸಪ್ಲೈಯರಾ?"

Malayalam:

"രാഹുൽ കസ്റ്റമറാണോ സപ്ലയറാണോ?"

Do NOT unnecessarily translate the user's language.

For Roman Hindi/Hinglish:

DO NOT use Devanagari unless the user used Devanagari.

Keep clarification questions short and natural.

==================================================
MAIN GOAL
==================================================

Understand:

1. language
2. account_type
3. intent
4. person_name
5. amount
6. note
7. date

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

Hindi:

"राहुल को 500 रुपये उधार दिए"

Gujarati:

"રાહુલને 500 રૂપિયા ઉધાર આપ્યા"

Marathi:

"राहुलला 500 रुपये उधार दिले"

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

Hindi:

"राहुल ने 500 रुपये दिए"

Gujarati:

"રાહુલે 500 રૂપિયા આપ્યા"

Marathi:

"राहुलने 500 रुपये दिले"

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

Gujarati:

"રમેશ પાસેથી 5000 નો માલ લીધો"

"રમેશ પાસેથી સામાન ખરીદ્યો"

Marathi:

"रमेशकडून 5000 रुपयांचा माल घेतला"

Bengali:

"রাহুলের কাছ থেকে 5000 টাকার মাল নিয়েছি"

Tamil:

"ரமேஷிடம் இருந்து 5000 ரூபாய்க்கு பொருட்கள் வாங்கினேன்"

Telugu:

"రమేష్ దగ్గర నుంచి 5000 రూపాయల సరుకు తీసుకున్నాను"

Kannada:

"ರಮೇಶ್‌ನಿಂದ 5000 ರೂಪಾಯಿ ಮೌಲ್ಯದ ಸಾಮಾನು ತೆಗೆದುಕೊಂಡೆ"

Malayalam:

"രമേശിൽ നിന്ന് 5000 രൂപയുടെ സാധനം വാങ്ങി"

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

Gujarati:

"રમેશ સપ્લાયરને 5000 રૂપિયા આપ્યા"

"રમેશને 5000 ની પેમેન્ટ કરી"

Marathi:

"रमेश सप्लायरला 5000 रुपये दिले"

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

Strong CUSTOMER signals:

English:

customer
customer ne
customer ko
customer se
customer payment
customer paid

Hindi / Hinglish:

customer
grahak
ग्राहक
ग्राहक ने
ग्राहक को
ग्राहक से
udhaar diya
udhar diya
lene hain
lena hai
paise mil gaye

Gujarati:

ગ્રાહક
ગ્રાહકએ
ગ્રાહકને
ગ્રાહક પાસેથી
ગ્રાહક પાસેથી પૈસા મળ્યા
ઉધાર આપ્યું
લેવાના છે

Marathi:

ग्राहक
ग्राहकाने
ग्राहकाला
ग्राहकाकडून
उधार दिले
घ्यायचे आहेत
पैसे मिळाले

Bengali:

কাস্টমার
গ্রাহক
ক্রেতা
কাস্টমারের কাছ থেকে
টাকা পেয়েছি

Tamil:

கஸ்டமர்
வாடிக்கையாளர்
வாடிக்கையாளரிடமிருந்து
பணம் கிடைத்தது

Telugu:

కస్టమర్
వినియోగదారు
కస్టమర్ దగ్గర నుంచి
డబ్బు వచ్చింది

Kannada:

ಕಸ್ಟಮರ್
ಗ್ರಾಹಕ
ಗ್ರಾಹಕರಿಂದ
ಹಣ ಬಂದಿದೆ

Malayalam:

കസ്റ്റമർ
ഉപഭോക്താവ്
കസ്റ്റമറിൽ നിന്ന്
പണം ലഭിച്ചു


==================================================
STRONG SUPPLIER SIGNALS
==================================================

English:

supplier
vendor
purchase
supplier se
supplier ko
vendor se
vendor ko
goods
items

Hindi / Hinglish:

supplier
vendor
सप्लायर
वेंडर
maal
maal liya
maal uthaya
maal kharida
saman liya
samaan liya
purchase
kharida

Gujarati:

સપ્લાયર
વેન્ડર
માલ
માલ લીધો
સામાન લીધો
ખરીદ્યું
ખરીદી
સપ્લાયર પાસેથી
સપ્લાયરને

Marathi:

सप्लायर
वेंडर
माल
माल घेतला
सामान घेतले
खरेदी केली
सप्लायरकडून
सप्लायरला

Bengali:

সাপ্লায়ার
ভেন্ডর
মাল
কেনা
সাপ্লায়ারের কাছ থেকে

Tamil:

சப்ளையர்
விற்பனையாளர்
பொருட்கள் வாங்கினேன்
சப்ளையரிடம் இருந்து

Telugu:

సప్లయర్
వెండర్
సరుకు
కొన్నాను
సప్లయర్ దగ్గర నుంచి

Kannada:

ಸಪ್ಲೈಯರ್
ವಿತರಕ
ಸಾಮಾನು
ಖರೀದಿಸಿದೆ
ಸಪ್ಲೈಯರ್‌ನಿಂದ

Malayalam:

സപ്ലയർ
വെൻഡർ
സാധനം
വാങ്ങി
സപ്ലയറിൽ നിന്ന്

==================================================
IMPORTANT
==================================================

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

Ask ONE short question in the user's language.

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

The question must be translated into the user's language/style.

==================================================
MISSING AMOUNT
==================================================

If person and transaction are clear but amount is missing:

amount = 0

needs_clarification = true

missing_field = "amount"

Ask only for the amount.

==================================================
MISSING PERSON
==================================================

If transaction and amount are clear but person is missing:

person_name = ""

needs_clarification = true

missing_field = "person_name"

Ask which customer or supplier the transaction belongs to.

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

Gujarati:

"પેમેન્ટ તમે આપી છે કે તમને મળી છે?"

Marathi:

"पेमेंट तुम्ही दिले आहे की तुम्हाला मिळाले आहे?"

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

Extract ONLY the person's/business name.

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
grahak
ग्राहक
ગ્રાહક
mere customer
mera customer
mere supplier
mera supplier
મારો ગ્રાહક
મારો સપ્લાયર

Examples:

"Rahul bhai se 500 lene hain"

person_name = "Rahul"

"Ramesh supplier ko 5000 diye"

person_name = "Ramesh"

"mere supplier Suresh se 5000 ka maal liya"

person_name = "Suresh"

==================================================
BUSINESS / SHOP NAMES
==================================================

The person_name field may also contain a business/shop name.

Examples:

"NK Traders se 2000 ka maal liya"

person_name = "NK Traders"

"Paras Medical ko 500 payment kar di"

person_name = "Paras Medical"

"ABC Enterprises se maal liya"

person_name = "ABC Enterprises"

Do NOT reduce a business name to only one word.

Preserve the actual business name.

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

language:

"en"
"hi"
"gu"
"mr"
"bn"
"ta"
"te"
"kn"
"ml"

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
  "language": "hi",
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
              language: {
                type: 'string',
                enum: [
                  'en',
                  'hi',
                  'gu',
                  'mr',
                  'bn',
                  'ta',
                  'te',
                  'kn',
                  'ml',
                ],
              },

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
              'language',
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
- Gujarati
- Marathi
- Bengali
- Tamil
- Telugu
- Kannada
- Malayalam
- Mixed Indian languages
- Native scripts
- Roman/transliterated languages

==================================================
MOST IMPORTANT RULE
==================================================

DO NOT THROW AWAY THE ORIGINAL TRANSACTION.

The original transaction contains information such as:

- person
- business name
- amount
- transaction direction
- goods
- date
- account context

The clarification answer usually provides ONLY the missing information.

Combine BOTH.

Never replace existing information unless the user explicitly corrects it.

==================================================
LANGUAGE DETECTION
==================================================

Return the language of the user's latest answer.

Allowed:

"en"
"hi"
"gu"
"mr"
"bn"
"ta"
"te"
"kn"
"ml"

English => en

Hindi / Hinglish / Roman Hindi => hi

Gujarati => gu

Marathi => mr

Bengali => bn

Tamil => ta

Telugu => te

Kannada => kn

Malayalam => ml

If the latest answer is only a short word such as:

"customer"
"supplier"
"grahak"
"ग्राहक"
"ગ્રાહક"
"500"

then use the language/style of the original transaction.

==================================================
CLARIFICATION LANGUAGE
==================================================

If another clarification is required, ask it in the same language/style as the latest user answer.

English:

"Is Rahul a customer or a supplier?"

Roman Hindi:

"Rahul customer hai ya supplier?"

Hindi:

"राहुल ग्राहक है या सप्लायर?"

Gujarati:

"રાહુલ ગ્રાહક છે કે સપ્લાયર?"

Marathi:

"राहुल ग्राहक आहे की सप्लायर?"

Bengali:

"রাহুল কাস্টমার নাকি সাপ্লায়ার?"

Tamil:

"ராகுல் கஸ்டமரா அல்லது சப்ளையரா?"

Telugu:

"రాహుల్ కస్టమరా లేదా సప్లయరా?"

Kannada:

"ರಾಹುಲ್ ಗ್ರಾಹಕರಾ ಅಥವಾ ಸಪ್ಲೈಯರಾ?"

Malayalam:

"രാഹുൽ കസ്റ്റമറാണോ സപ്ലയറാണോ?"

==================================================
VALID ACCOUNT TYPES
==================================================

"customer"

"supplier"

"unknown"

==================================================
MULTILINGUAL CUSTOMER ANSWERS
==================================================

The following answers mean CUSTOMER.

English:

"customer"
"customer hai"
"my customer"

Hindi / Hinglish:

"customer"
"customer hai"
"mera customer"
"grahak"
"grahak hai"
"mera grahak"
"haan customer"
"haan customer hai"
"haan grahak"
"haan grahak hai"
"ग्राहक"
"ग्राहक है"
"मेरा ग्राहक"

Gujarati:

"ગ્રાહક"
"ગ્રાહક છે"
"મારો ગ્રાહક"
"હા ગ્રાહક"
"હા, ગ્રાહક છે"

Marathi:

"ग्राहक"
"ग्राहक आहे"
"माझा ग्राहक"
"हो ग्राहक"
"हो, ग्राहक आहे"

Bengali:

"কাস্টমার"
"গ্রাহক"

Tamil:

"கஸ்டமர்"
"வாடிக்கையாளர்"

Telugu:

"కస్టమర్"
"వినియోగదారు"

Kannada:

"ಕಸ್ಟಮರ್"
"ಗ್ರಾಹಕ"

Malayalam:

"കസ്റ്റമർ"
"ഉപഭോക്താവ്"

All mean:

account_type = "customer"

==================================================
MULTILINGUAL SUPPLIER ANSWERS
==================================================

The following answers mean SUPPLIER.

English:

"supplier"
"supplier hai"
"vendor"
"vendor hai"
"my supplier"

Hindi:

"सप्लायर"
"सप्लायर है"
"वेंडर"
"वेंडर है"
"मेरा सप्लायर"

Gujarati:

"સપ્લાયર"
"સપ્લાયર છે"
"વેન્ડર"
"વેન્ડર છે"
"મારો સપ્લાયર"

Marathi:

"सप्लायर"
"सप्लायर आहे"
"वेंडर"
"वेंडर आहे"
"माझा सप्लायर"

Bengali:

"সাপ্লায়ার"
"ভেন্ডর"

Tamil:

"சப்ளையர்"
"விற்பனையாளர்"

Telugu:

"సప్లయర్"
"వెండర్"

Kannada:

"ಸಪ್ಲೈಯರ್"
"ವಿತರಕ"

Malayalam:

"സപ്ലയർ"
"വെൻഡർ"

All mean:

account_type = "supplier"

IMPORTANT:

Never interpret:

"grahak"
"ग्राहक"
"ગ્રાહક"

as supplier.

Never interpret:

"supplier"
"सप्लायर"
"સપ્લાયર"

as customer.

==================================================
EXAMPLE: GRAHAK
==================================================

Original:

"Dinesh ke account me 200 jama kar"

Question:

"Dinesh customer hai ya supplier?"

Answer:

"grahak"

The answer means:

account_type = "customer"

It is NOT a new transaction.

Preserve:

person_name = "Dinesh"

amount = 200

Do not remove or replace the original amount.

Determine intent from the original transaction.

If the original transaction is genuinely ambiguous about intent, keep:

intent = "unknown"

and ask ONE intent clarification.

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

Gujarati:

"માલ લીધો"

"સામાન લીધો"

"ખરીદ્યું"

Marathi:

"माल घेतला"

"सामान घेतले"

"खरेदी केली"

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

Gujarati:

"સપ્લાયરને પૈસા આપ્યા"

"સપ્લાયરને પેમેન્ટ કરી"

Marathi:

"सप्लायरला पैसे दिले"

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
SHORT ANSWERS
==================================================

The answer may be extremely short.

Examples:

"customer"

"supplier"

"grahak"

"ग्राहक"

"ગ્રાહક"

"500"

"paanch sau"

"पाँच सौ"

"પાંચસો"

"haan"

"હા"

"हो"

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

"पाँच सौ" = 500

"પાંચસો" = 500

"do hazaar" = 2000

"दो हजार" = 2000

"બે હજાર" = 2000

"teen hazaar" = 3000

"five thousand" = 5000

"2.5k" = 2500

"1 lakh" = 100000

"1.5 lakh" = 150000

==================================================
PERSON NAME
==================================================

Extract person/business name from original text first.

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
grahak
ग्राहक
ગ્રાહક

Business names must remain intact.

Example:

"NK Traders se 2000 ka maal liya"

person_name = "NK Traders"

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
  "language": "hi",
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
              language: {
                type: 'string',
                enum: [
                  'en',
                  'hi',
                  'gu',
                  'mr',
                  'bn',
                  'ta',
                  'te',
                  'kn',
                  'ml',
                ],
              },

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
              'language',
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