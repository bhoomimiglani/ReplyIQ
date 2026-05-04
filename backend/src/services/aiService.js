const groq = require('../config/groq');
const { retrieveContext } = require('./retrievalService');
const logger = require('../utils/logger');

const TONE_INSTRUCTIONS = {
  formal: 'Use formal, professional language. Be precise and structured. Avoid contractions and casual expressions.',
  friendly: 'Use warm, friendly language. Be conversational and approachable. Use contractions naturally.',
  professional: 'Use clear, professional language. Be helpful and concise. Strike a balance between formal and approachable.',
  casual: 'Use casual, relaxed language. Be conversational and natural. Use everyday expressions.'
};

const SYSTEM_PROMPT_TEMPLATE = (botName, tone) => `You are ${botName}, an AI customer support assistant.

${TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional}

IMPORTANT GUIDELINES:
1. Answer questions ONLY based on the provided context from the knowledge base.
2. If the context doesn't contain enough information to answer confidently, say so clearly and suggest the user contact human support.
3. Be concise but complete. Don't pad responses unnecessarily.
4. If asked about something outside your knowledge base, acknowledge it honestly.
5. Never make up information or hallucinate facts.
6. If a question is ambiguous, ask for clarification.
7. Always be helpful and empathetic.
8. Format responses clearly - use bullet points or numbered lists when appropriate.`;

/**
 * Generate AI response with RAG using Groq
 */
const generateResponse = async (options) => {
  const {
    tenantId,
    query,
    conversationHistory = [],
    tenantSettings = {},
    sessionId
  } = options;

  const startTime = Date.now();

  const {
    botName = 'Support Assistant',
    tone = 'professional',
    confidenceThreshold = 0.6,
  } = tenantSettings;

  try {
    // Retrieve relevant context
    const { chunks, sources, avgScore, contextText } = await retrieveContext(
      tenantId,
      query,
      { topK: 5, minScore: 0.25 }
    );

    const hasContext = chunks.length > 0 && avgScore > 0.25;

    // Build system prompt
    let systemPrompt = SYSTEM_PROMPT_TEMPLATE(botName, tone);

    if (hasContext) {
      systemPrompt += `\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n${contextText}\n\nUse the above context to answer the user's question accurately.`;
    } else {
      systemPrompt += `\n\nNOTE: No relevant context found in the knowledge base for this query. Acknowledge that you don't have specific information about this topic and suggest contacting human support.`;
    }

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (last 10 messages)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current query
    messages.push({ role: 'user', content: query });

    // Generate response using Groq
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 800,
      temperature: tone === 'casual' ? 0.8 : 0.5,
    });

    const responseText = completion.choices[0].message.content;
    const tokensUsed = completion.usage?.total_tokens || 0;
    const responseTime = Date.now() - startTime;

    // Calculate confidence score
    let confidence = hasContext ? Math.min(avgScore + 0.2, 1.0) : 0.2;

    const uncertaintyPhrases = [
      "i don't have", "i'm not sure", "i cannot find", "no information",
      "contact support", "reach out to", "i don't know", "unclear"
    ];
    const lowerResponse = responseText.toLowerCase();
    if (uncertaintyPhrases.some(phrase => lowerResponse.includes(phrase))) {
      confidence = Math.min(confidence, 0.45);
    }

    const shouldEscalate = confidence < confidenceThreshold;

    return {
      response: responseText,
      confidence,
      shouldEscalate,
      sources: sources.slice(0, 3),
      tokensUsed,
      responseTime,
      contextUsed: hasContext
    };

  } catch (error) {
    logger.error(`AI generation error: ${error.message}`);
    return {
      response: `I'm sorry, I'm having trouble processing your request right now. Error: ${error.message}. Please try again in a moment.`,
      confidence: 0,
      shouldEscalate: true,
      sources: [],
      tokensUsed: 0,
      responseTime: Date.now() - startTime,
      contextUsed: false,
      error: error.message
    };
  }
};

/**
 * Summarize a conversation using Groq
 */
const summarizeConversation = async (messages) => {
  try {
    const conversationText = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Summarize this customer support conversation in 2-3 sentences. Focus on the main issue and resolution.'
        },
        { role: 'user', content: conversationText }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    return completion.choices[0].message.content;
  } catch (error) {
    logger.error(`Summarization error: ${error.message}`);
    return 'Conversation summary unavailable.';
  }
};

/**
 * Classify query intent/category using Groq
 */
const classifyQuery = async (query) => {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Classify this customer support query into one category: technical, billing, general, feature_request, bug, other. Respond with ONLY the category name.'
        },
        { role: 'user', content: query }
      ],
      max_tokens: 20,
      temperature: 0
    });

    const category = completion.choices[0].message.content.trim().toLowerCase();
    const validCategories = ['technical', 'billing', 'general', 'feature_request', 'bug', 'other'];
    return validCategories.includes(category) ? category : 'general';
  } catch (error) {
    return 'general';
  }
};

module.exports = { generateResponse, summarizeConversation, classifyQuery };
