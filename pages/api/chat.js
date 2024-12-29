import Anthropic from '@anthropic-ai/sdk';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Redis for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Create rate limiter: 20 requests per minute
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
});

// System prompt for Claude
const SYSTEM_PROMPT = `You are CryptoLegal's AI Tax Assistant, an expert in cryptocurrency taxation and financial strategies. Your role is to:

- Provide clear, accurate guidance on crypto tax regulations
- Explain complex concepts in simple terms
- Direct users to official resources when needed
- Suggest tax-efficient strategies
- Help users understand DeFi opportunities and their tax implications

Important guidelines:
1. Always start with the most relevant information
2. Use specific examples when helpful
3. Cite official sources (IRS, etc.) when applicable
4. Remind users that this is educational guidance, not professional tax advice
5. Focus on US tax regulations unless specified otherwise

Knowledge Base:
- Latest IRS cryptocurrency guidelines
- Common DeFi protocols and their tax treatment
- Tax-loss harvesting strategies
- Record-keeping requirements
- Form requirements (8949, Schedule D, etc.)`;

export const config = {
  runtime: 'edge', // Use edge runtime for better performance
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Check rate limit
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          limit,
          reset,
          remaining,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    const { message, history = [] } = await req.json();

    // Convert history to Claude's message format
    const messages = history.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Add new user message
    messages.push({
      role: 'user',
      content: message,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    return new Response(
      JSON.stringify({
        response: response.content[0].text,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
