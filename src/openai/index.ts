import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function summarizeSingleEmail(email: {
  sender: string;
  subject: string;
  body: string;
}) {
  const prompt = `You are an assistant that summarizes emails. Output JSON exactly with fields: summary, category.
Rules:
- summary: 2-3 concise sentences capturing the purpose and next action.
- category: one word from [Meeting, Invoice, Support, Sales, HR, Other].
- Respond with ONLY a JSON object. 
Email:
Sender: ${email.sender}
Subject: ${email.subject}
Body: ${email.body}

Respond with ONLY a JSON object.

Example -
* Input - { "sender": "support@shopmaster.io", "subject": "Customer unable to complete checkout", "body": "Hi team, a customer reported that the checkout page keeps loading indefinitely. Could someone investigate the issue?

* Output - { "summary": "A customer is unable to complete checkout due to a loading issue. Investigate the problem to unblock the user.", "category": "Support" }`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify(email) },
    ],
  });

  const text = res.choices?.[0]?.message?.content ?? "";
  console.log({ text });
  try {
    return JSON.parse(text);
  } catch (error: any) {
    console.error({ errorFromOpenAI: error });
    throw new Error(error.message);
  }
}

export async function summarizeBulkEmail(
  emails: {
    sender: string;
    subject: string;
    body: string;
    sId: string;
  }[],
) {
  const prompt = `You are an assistant that summarizes emails. Output JSON exactly with fields: summary, category. Rules: 
- summary: 2-3 concise sentences capturing the purpose and next action. 
- category: one word from [Meeting, Invoice, Support, Sales, HR, Other]. Email: Sender:"support@shopmaster.io" Subject: Customer unable to complete checkout Body: eamils body text... 
- Respond with ONLY a JSON object. 

Example - 
* Input - [{ "sId": "em_002", "sender": "support@shopmaster.io", "subject": "Customer unable to complete checkout", "body": "Hi team, a customer reported that the checkout page keeps loading indefinitely. Could someone investigate the issue? The user is blocked from placing the order." }] 

* Output - [{ "sId": "em_002", "sender": "support@shopmaster.io", "subject": "Customer unable to complete checkout", "body": "Hi team, a customer reported that the checkout page keeps loading indefinitely. Could someone investigate the issue? The user is blocked from placing the order.", "summary": "A customer is unable to complete checkout due to a loading issue. Investigate the problem to unblock the user.", "category": "Support" }] 
`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify(emails) },
    ],
  });

  const text = res.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(text);
  } catch (error: any) {
    console.error({ errorFromOpenAI: error });
    throw new Error(error.message);
  }
}

export const enhanceSummary = async (summary: string) => {
  try {
    const prompt = `You are an assistant that enhances summaries. Output string only dont return json object just answer in string with more words and explantion:`;
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: summary },
      ],
    });
    const text = res.choices?.[0]?.message?.content ?? "";
    return text;
  } catch (err: any) {
    console.error({ err });
    return err;
  }
};
